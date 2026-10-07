import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.get("/api/runtime-config", (_req, res) => {
    res.json({
      apiUrl: process.env.MANUS_API_URL ?? "",
      browserKey: process.env.MANUS_API_BROWSER_KEY ?? "",
      appId: process.env.MANUS_PROJECT_ID ?? process.env.VITE_APP_ID ?? "",
      oauthPortalUrl: process.env.MANUS_OAUTH_PORTAL_URL ?? process.env.VITE_OAUTH_PORTAL_URL ?? "",
    });
  });
  app.get("/api/maps/javascript", async (req, res) => {
    const apiUrl = process.env.MANUS_API_URL ?? "";
    const browserKey = process.env.MANUS_API_BROWSER_KEY ?? "";
    const requestedOrigin = typeof req.query.origin === "string" ? req.query.origin : "";
    let origin: URL;
    try {
      origin = new URL(requestedOrigin);
      if (origin.protocol !== "https:" && origin.protocol !== "http:") throw new Error("Unsupported origin protocol");
    } catch {
      res.status(400).json({ error: "A valid application origin is required" });
      return;
    }
    if (!apiUrl || !browserKey) {
      res.status(503).json({ error: "Maps runtime configuration is unavailable" });
      return;
    }
    const mapsUrl = new URL(`${apiUrl.replace(/\/+$/, "")}/v1/maps/proxy/maps/api/js`);
    mapsUrl.searchParams.set("key", browserKey);
    mapsUrl.searchParams.set("v", "weekly");
    mapsUrl.searchParams.set("libraries", "marker,places,geocoding,geometry");
    try {
      const mapsResponse = await fetch(mapsUrl, {
        headers: {
          Origin: origin.origin,
          Referer: `${origin.origin}/`,
        },
      });
      const body = await mapsResponse.text();
      res.status(mapsResponse.status).set("Content-Type", "application/javascript; charset=utf-8").send(body);
    } catch (error) {
      console.error("Google Maps script proxy failed", error);
      res.status(502).json({ error: "Google Maps script proxy failed" });
    }
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  app.use("/api", (req, res) => {
    res.status(404).json({ error: `No API route ${req.method} ${req.originalUrl}` });
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000", 10);

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
