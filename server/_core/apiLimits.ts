import type { RequestHandler } from "express";
import { sdk } from "./sdk";

/** Best-effort per-instance limits. Multi-instance production requires shared Redis limits. */
export function createInterpretationLimiter(): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number; active: number }>();
  return async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    const pathname = req.path.toLowerCase();
    if (!/(interpretation|horary|genesisreading|synastry|soulmate|asktransitquestion)/.test(pathname)) {
      next(); return;
    }
    const user = await sdk.authenticateRequest(req).catch(() => null);
    const client = user?.openId ? "account:" + user.openId : "ip:" + (req.socket.remoteAddress ?? "unknown");
    const limit = user ? 120 : 20;
    const maxActive = user ? 4 : 2;
    const now = Date.now();
    if (buckets.size > 20000) {
      for (const [key, bucket] of Array.from(buckets.entries())) {
        if (bucket.resetAt < now && bucket.active === 0) buckets.delete(key);
      }
    }
    let bucket = buckets.get(client);
    if (!bucket || (bucket.resetAt <= now && bucket.active === 0)) {
      bucket = { count: 0, resetAt: now + 3_600_000, active: 0 };
      buckets.set(client, bucket);
    }
    if (bucket.count >= limit || bucket.active >= maxActive) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      res.status(429).json({ error: "Reading request limit reached. Try again later." });
      return;
    }
    bucket.count++;
    bucket.active++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      bucket!.active = Math.max(0, bucket!.active - 1);
    };
    res.once("finish", release);
    res.once("close", release);
    next();
  };
}
