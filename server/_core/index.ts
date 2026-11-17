import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { ZipArchive, type ArchiverError } from "archiver";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { chartQueryServerTransport } from "../../shared/trpcTransport";
import { sessionConfiguration } from "./env";

async function startServer() {
  sessionConfiguration();
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);

  app.get(["/health", "/healthz"], (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get(["/the-absolute-astrology.zip", "/download-project.zip", "/api/download-zip"], (_req, res) => {
    const rootDir = process.cwd();
    const excludedDirs = new Set([
      "node_modules",
      "dist",
      ".git",
      ".aistudio",
      ".next",
      ".cache",
      ".turbo",
      "coverage",
    ]);
    const excludedFiles = new Set([".env", ".env.local", ".env.production", ".DS_Store"]);
    const timestamp = new Date().toISOString().slice(0, 10);
    const downloadFilename = `the-absolute-astrology-${timestamp}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("warning", (err: ArchiverError) => {
      if (err.code !== "ENOENT") {
        console.warn("[DownloadZip] Archiver warning:", err);
      }
    });
    archive.on("error", (err: ArchiverError) => {
      console.error("[DownloadZip] Archiver error:", err);
      if (!res.headersSent) {
        res.status(500).send("Failed to generate project ZIP archive.");
      } else {
        res.destroy(err);
      }
    });

    archive.pipe(res);

    const addDirectoryRecursive = (dirPath: string, relBase: string) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const fullPath = path.join(dirPath, entry.name);
        const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          if (excludedDirs.has(entry.name)) continue;
          addDirectoryRecursive(fullPath, relPath);
        } else if (entry.isFile()) {
          if (
            excludedFiles.has(entry.name) ||
            entry.name.endsWith(".zip") ||
            entry.name.endsWith(".tar.gz")
          ) {
            continue;
          }
          archive.file(fullPath, { name: relPath });
        }
      }
    };

    try {
      addDirectoryRecursive(rootDir, "");
      void archive.finalize();
    } catch (err) {
      console.error("[DownloadZip] Failed walking project tree:", err);
      if (!res.headersSent) {
        res.status(500).send("Failed to walk project directory for ZIP archive.");
      }
    }
  });

  // Readiness reports configuration, not an unverified claim that external services work.
  app.get("/ready", (_req, res) => {
    const checks = {
      sessionSigning: Boolean((process.env.MANUS_JWT_SECRET ?? process.env.JWT_SECRET)?.length),
      interpreterKey: Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
      databaseConfigured: Boolean(process.env.DATABASE_URL),
    };
    res.status(checks.sessionSigning ? 200 : 503).json({ ready: checks.sessionSigning, checks });
  });

  app.get("/api/runtime-config", (_req, res) => {
    res.json({
      apiUrl: process.env.MANUS_API_URL ?? "",
      browserKey: process.env.MANUS_API_BROWSER_KEY ?? "",
      appId: sessionConfiguration().appId,
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
