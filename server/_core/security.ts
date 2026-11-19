import type { NextFunction, Request, Response } from "express";

/** In-process protection only; configure hard quotas at the provider and gateway too. */
type Bucket = { count: number; resetAt: number };
export class FixedWindowLimiter {
  private buckets = new Map<string, Bucket>();
  private lastSweep = 0;
  consume(key: string, limit: number, windowMs: number, now = Date.now()) {
    if (now - this.lastSweep >= 60_000) {
      for (const [name, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(name);
      }
      this.lastSweep = now;
    }
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  clear() { this.buckets.clear(); }
}
export function clientKey(req: Pick<Request, "ip" | "socket">) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}
export function rateLimit(options: { name: string; limit: number; windowMs: number; limiter?: FixedWindowLimiter }) {
  const limiter = options.limiter ?? new FixedWindowLimiter();
  return (req: Request, res: Response, next: NextFunction) => {
    const result = limiter.consume(options.name + ":" + clientKey(req), options.limit, options.windowMs);
    res.setHeader("RateLimit-Limit", String(options.limit));
    res.setHeader("RateLimit-Remaining", String(result.remaining));
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfterSeconds));
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }
    next();
  };
}
export function parseOriginList(raw?: string): string[] {
  return (raw ?? "").split(",").map(s => s.trim()).filter(Boolean);
}
export function isAllowedOrigin(origin: string, host: string | undefined, protocol: string, extras: string[]) {
  let candidate: URL;
  try {
    candidate = new URL(origin);
    if (!["http:", "https:"].includes(candidate.protocol) || candidate.origin !== origin) return false;
  } catch { return false; }
  if (host) {
    try { if (candidate.origin === new URL(protocol + "://" + host).origin) return true; }
    catch { /* Reject malformed host. */ }
  }
  return extras.some(value => {
    try { return new URL(value).origin === candidate.origin; }
    catch { return false; }
  });
}
export function sameOriginGuard(env: NodeJS.ProcessEnv = process.env) {
  const extras = parseOriginList([env.APP_ORIGIN, env.APP_ORIGINS].filter(Boolean).join(","));
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api/") || ["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.get("origin");
    if (origin && !isAllowedOrigin(origin, req.get("host"), req.protocol, extras)) {
      res.status(403).json({ error: "Cross-site request blocked." });
      return;
    }
    next();
  };
}
export function securityHeaders(env: NodeJS.ProcessEnv = process.env) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=(self), payment=()");
    if (env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    // Observe compatibility before enforcing this policy.
    res.setHeader("Content-Security-Policy-Report-Only",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self' https://maps.googleapis.com; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
    next();
  };
}
export type AiBudgetConfig = { anonPerMinute: number; anonPerHour: number; userPerHour: number; globalPerDay: number };
export function aiBudgetConfig(env: NodeJS.ProcessEnv = process.env): AiBudgetConfig {
  const read = (key: string, fallback: number) => {
    const n = Number.parseInt(env[key] ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return { anonPerMinute: read("AI_ANON_PER_MINUTE", 4), anonPerHour: read("AI_ANON_PER_HOUR", 30), userPerHour: read("AI_USER_PER_HOUR", 120), globalPerDay: read("AI_GLOBAL_PER_DAY", 400) };
}
const minuteLimiter = new FixedWindowLimiter();
const hourLimiter = new FixedWindowLimiter();
const globalLimiter = new FixedWindowLimiter();
export type AiBudgetResult = { allowed: true } | { allowed: false; retryAfterSeconds: number; message: string };
export function takeAiBudget(input: { ip: string; userId?: string | number | null }, config = aiBudgetConfig(), now = Date.now()): AiBudgetResult {
  const blocked = (retryAfterSeconds: number, message: string): AiBudgetResult => ({ allowed: false, retryAfterSeconds, message });
  if (input.userId != null) {
    const user = hourLimiter.consume("user:" + input.userId, config.userPerHour, 3_600_000, now);
    if (!user.allowed) return blocked(user.retryAfterSeconds, "Hourly interpretation limit reached.");
  } else {
    const minute = minuteLimiter.consume("guest:" + input.ip, config.anonPerMinute, 60_000, now);
    if (!minute.allowed) return blocked(minute.retryAfterSeconds, "Too many interpretation requests. Please try again later.");
    const hour = hourLimiter.consume("guest:" + input.ip, config.anonPerHour, 3_600_000, now);
    if (!hour.allowed) return blocked(hour.retryAfterSeconds, "Guest hourly interpretation limit reached.");
  }
  // Only accepted caller requests consume the global budget: rejected floods
  // cannot exhaust the daily cap by themselves.
  const global = globalLimiter.consume("global", config.globalPerDay, 86_400_000, now);
  if (!global.allowed) return blocked(global.retryAfterSeconds, "Interpretation capacity is reached for today.");
  return { allowed: true };
}
export function __resetSecurityStateForTests() {
  minuteLimiter.clear();
  hourLimiter.clear();
  globalLimiter.clear();
}
