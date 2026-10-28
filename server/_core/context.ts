import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

import * as db from "../db";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Standalone / preview environment fallback: auto-provision local keeper session
  if (!user && !ENV.oAuthServerUrl) {
    user = (await db.getUserByOpenId("local-observatory-user")) ?? null;
    if (!user) {
      await db.upsertUser({
        openId: "local-observatory-user",
        name: "Observatory Keeper",
        email: "keeper@observatory.local",
        loginMethod: "local",
        lastSignedIn: new Date(),
      });
      user = (await db.getUserByOpenId("local-observatory-user")) ?? null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
