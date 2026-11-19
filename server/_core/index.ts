import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { chartQueryServerTransport } from "../../shared/trpcTransport";
import { sessionConfiguration } from "./env";
import { applicationReadiness } from "./readiness";
import { rateLimit, sameOriginGuard, securityHeaders } from "./security";

async function startServer() {
  sessionConfiguration();
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);
  app.use(securityHeaders());
  app.use(sameOriginGuard());
  // Place API request throttling before body parsing and router execution.
  app.use("/api/trpc", rateLimit({ name: "trpc", limit: 240, windowMs: 60_000 }));

  app.get(["/health", "/healthz"], (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Readiness reports configuration, not an unverified claim that external services work.
  app.get("/ready", (_req, res) => {
    const readiness = applicationReadiness(process.env);
    res.status(readiness.ready ? 200 : 503).json(readiness);
  });

  app.get("/api/runtime-config", (_req, res) => {
    res.json({
      appId: sessionConfiguration().appId,
      oauthPortalUrl: process.env.MANUS_OAUTH_PORTAL_URL ?? process.env.VITE_OAUTH_PORTAL_URL ?? "",
    });
  });

  // Proxy the Maps script with a server-owned referrer; callers cannot impersonate domains.
  const mapsLimiter = rateLimit({ name: "maps", limit: 60, windowMs: 60_000 });
  const MAPS_CACHE_MS = 6 * 60 * 60_000;
  let mapsCache: { body: string; expires: number } | null = null;
  app.get("/api/maps/javascript", mapsLimiter, async (_req, res) => {
    const appOrigin = process.env.APP_ORIGIN ||
      (process.env.RENDER_EXTERNAL_HOSTNAME ? "https://" + process.env.RENDER_EXTERNAL_HOSTNAME : "");
    const apiUrl = process.env.MANUS_API_URL || "";
    const browserKey = process.env.MANUS_API_BROWSER_KEY || "";
    let origin: URL;
    try {
      origin = new URL(appOrigin);
      if (!["http:", "https:"].includes(origin.protocol)) throw new Error("Invalid scheme");
    } catch {
      res.status(503).json({ error: "A trusted APP_ORIGIN is required for Maps." });
      return;
    }
    if (!apiUrl || !browserKey) {
      res.status(503).json({ error: "Maps runtime configuration is unavailable" });
      return;
    }
    if (mapsCache && mapsCache.expires > Date.now()) {
      res.set("Content-Type", "application/javascript; charset=utf-8")
        .set("Cache-Control", "public, max-age=3600").send(mapsCache.body);
      return;
    }
    const mapsUrl = new URL(apiUrl.replace(/\/+$/, "") + "/v1/maps/proxy/maps/api/js");
    mapsUrl.searchParams.set("key", browserKey);
    mapsUrl.searchParams.set("v", "weekly");
    mapsUrl.searchParams.set("libraries", "marker,places,geocoding,geometry");
    try {
      const mapsResponse = await fetch(mapsUrl, {
        headers: { Origin: origin.origin, Referer: origin.origin + "/" },
      });
      const body = await mapsResponse.text();
      if (mapsResponse.ok) mapsCache = { body, expires: Date.now() + MAPS_CACHE_MS };
      res.status(mapsResponse.status)
        .set("Content-Type", "application/javascript; charset=utf-8")
        .set("Cache-Control", mapsResponse.ok ? "public, max-age=3600" : "no-store")
        .send(body);
    } catch (error) {
      console.error("Google Maps script proxy failed", error);
      res.status(502).json({ error: "Google Maps script proxy failed" });
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use("/api/trpc", express.json({ limit: "5mb" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "100kb", extended: true }));
  app.post("/api/background-music", express.raw({ type: "*/*", limit: "80mb" }), (req, res) => {
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "Direct filesystem uploads are disabled in production; use authenticated persistent object storage." });
      return;
    }
    try {
      const targetDir = path.resolve(process.cwd(), "client", "public", "assets");
      fs.mkdirSync(targetDir, { recursive: true });
      const targetPath = path.join(targetDir, "firmament-inner-peace-528hz.mp3");
      fs.writeFileSync(targetPath, req.body);
      res.json({ ok: true, path: "/assets/firmament-inner-peace-528hz.mp3" });
    } catch (error) {
      console.error("Failed to save background music", error);
      res.status(500).json({ error: "Failed to save background music" });
    }
  });

  // Gate API/frontend requests until dynamic router imports and Vite/static setup finish,
  // allowing port 3000 to bind immediately so cold-boot readiness probes never time out.
  let resolveReady!: () => void;
  let rejectReady!: (err: unknown) => void;
  const serverReady = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  app.use(async (_req, _res, next) => {
    try {
      await serverReady;
      next();
    } catch (err) {
      next(err);
    }
  });

  // On Render or Cloud Run, process.env.PORT is dynamically assigned (e.g. 10000).
  // In the local development sandbox, Nginx ingress uses 8080 and proxies into 3000.
  const port = parseInt(
    process.env.APP_PORT ||
      (process.env.NODE_ENV === "production" && process.env.PORT
        ? process.env.PORT
        : process.env.PORT && process.env.PORT !== "8080"
          ? process.env.PORT
          : "3000"),
    10
  );

  server.on("error", err => {
    console.error("[Server] HTTP server error:", err);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });

  try {
    const [
      { registerStorageProxy },
      { registerOAuthRoutes },
      { appRouter },
      { createContext },
      { serveStatic, setupVite },
    ] = await Promise.all([
      import("./storageProxy"),
      import("./oauth"),
      import("../routers"),
      import("./context"),
      import("./vite"),
    ]);

    registerStorageProxy(app);
    registerOAuthRoutes(app);
    app.use(
      "/api/trpc",
      createExpressMiddleware({
        ...chartQueryServerTransport,
        router: appRouter,
        createContext,
      })
    );
    app.use("/api", (req, res) => {
      res.status(404).json({ error: `No API route ${req.method} ${req.originalUrl}` });
    });

    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("[Server] Unhandled Express route error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    });

    resolveReady();
  } catch (err) {
    rejectReady(err);
    server.close();
    throw err;
  }
}

process.on("unhandledRejection", reason => {
  console.error("[Server] Unhandled promise rejection:", reason);
});

startServer().catch(error => {
  console.error("Server startup failed:", error);
  process.exitCode = 1;
});
