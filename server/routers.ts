import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { calculateChart, geocodeLocation } from "./astronomy";
import { followUp, generateChapter, generateInterpretation, READING_CHAPTERS } from "./interpretation";
import { askHost } from "./host";
import { horaryFollowUp, openHoraryQuestion } from "./horary";
import { horaryFollowUpHistorySchema } from "./horary-input";

const chartInput = z.object({ location: z.string().min(2), latitude: z.number(), longitude: z.number(), timezone: z.string().min(2), date: z.string(), time: z.string(), transitLocation: z.string().optional(), transitLatitude: z.number().optional(), transitLongitude: z.number().optional(), transitTimezone: z.string().optional(), transitDate: z.string().optional(), transitTime: z.string().optional() });
const chartResultInput = z.object({ chart: z.any() });
const horaryQuestionInput = z.object({ question: z.string().trim().min(10).max(1000), subject: z.enum(["querent", "other"]), topicHouse: z.number().int().min(1).max(12), location: z.string().trim().min(2).max(240), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), timezone: z.string().min(2), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/) });
export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  hybrid: router({
    geocode: publicProcedure.input(z.object({ query: z.string().min(2) })).query(({ input }) => geocodeLocation(input.query)),
    calculate: publicProcedure.input(chartInput).mutation(({ input }) => calculateChart(input)),
  }),
  interpretation: router({
    host: publicProcedure.input(z.object({ history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]), question: z.string().min(1) })).mutation(({ input }) => askHost(input.history, input.question)),
    generate: publicProcedure.input(chartResultInput.extend({ mode: z.enum(["natal", "transit", "combined"]).default("combined") })).mutation(({ input }) => generateInterpretation(input.chart, input.mode)),
    chapter: publicProcedure.input(z.object({ chart: z.any(), mode: z.enum(["natal", "transit", "combined"]), intelligence: z.string(), chapterId: z.enum(READING_CHAPTERS.map(chapter => chapter.id) as [string, ...string[]]), completedChapters: z.array(z.string()).default([]) })).mutation(({ input }) => generateChapter(input.chart, input.mode, input.intelligence, input.chapterId as any, input.completedChapters)),
    followUp: publicProcedure.input(z.object({ chart: z.any(), interpretation: z.object({ intelligence: z.string(), reading: z.string() }), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })), question: z.string().min(1), mode: z.enum(["natal", "transit", "combined"]).default("combined") })).mutation(({ input }) => followUp(input.chart, input.interpretation, input.history, input.question, input.mode)),
  }),
  horary: router({
    open: publicProcedure.input(horaryQuestionInput).mutation(({ input }) => openHoraryQuestion(input)),
    followUp: publicProcedure.input(z.object({ chart: z.any(), history: horaryFollowUpHistorySchema, question: z.string().trim().min(1).max(2000) })).mutation(({ input }) => horaryFollowUp(input.chart, input.history, input.question)),
  }),
});
export type AppRouter = typeof appRouter;
