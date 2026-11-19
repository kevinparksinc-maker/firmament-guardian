import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { takeAiBudget } from "./security";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (ctx.authError) throw ctx.authError;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Every LLM-capable route must use this middleware, including guest-access routes.
// Anonymous and signed-in quotas are intentionally independent of login limits.
const aiSpendBudget = t.middleware(async ({ ctx, next }) => {
  if (!ctx.req?.socket) return next(); // Internal/test callers have no HTTP transport.
  const result = takeAiBudget({
    ip: ctx.req.ip || ctx.req.socket.remoteAddress || "unknown",
    userId: ctx.user?.id ?? null,
  });
  if (!result.allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: result.message });
  }
  return next();
});
export const aiProcedure = t.procedure.use(aiSpendBudget);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (ctx.authError) throw ctx.authError;
    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
