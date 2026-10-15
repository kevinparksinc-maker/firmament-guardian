import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { calculateChart, geocodeLocation, type ChartResult } from "./astronomy";
import {
  followUp,
  generateChapter,
  generateInterpretation,
  READING_CHAPTERS,
} from "./interpretation";
import { askHost } from "./host";
import { horaryFollowUp, openHoraryQuestion, type HoraryChart } from "./horary";
import { horaryFollowUpHistorySchema } from "./horary-input";
import {
  diagnoseAstrologyEvidence,
  evaluateBehavioralIntelligence,
} from "./astrologyKnowledge";
import { analyzeSystemIntersect, evaluateLovedOneCheckIn } from "./social";
import { invokeLLM } from "./_core/llm";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import { runGenesisPatternPipeline, generateReading } from "./genesisBackup";


const chartInput = z.object({
  location: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  date: z.string(),
  time: z.string(),
  transitLocation: z.string().optional(),
  transitLatitude: z.number().optional(),
  transitLongitude: z.number().optional(),
  transitTimezone: z.string().optional(),
  transitDate: z.string().optional(),
  transitTime: z.string().optional(),
  worldview: z.enum(["god", "agent", "agent-vs-god"]).default("agent"),
  readingScope: z.enum(["natal", "transit", "combined"]).default("combined"),
  birthTimeKnown: z.boolean().optional(),
  elevation: z.number().optional(),
});
const chartRowPayload = z.object({
  name: z.string().min(1).max(100),
  longitude: z.number().finite(),
  display: z.string().max(100),
  house: z.number().int().min(1).max(12),
}).passthrough();
const chartPayloadShape = z.object({
  input: z.object({ location: z.string().max(240), date: z.string(), time: z.string() }).passthrough(),
  utc: z.string().min(1).max(60),
  julianDay: z.number().finite(),
  movingBodies: z.array(chartRowPayload).min(1).max(50),
  frozenStars: z.array(chartRowPayload).max(100),
  transits: z.array(chartRowPayload).max(80),
  houses: z.array(z.number().finite()).length(12),
}).passthrough();
/** Validate browser-returned calculated charts before trusting client-provided chart facts. */
const chartPayload = z.custom<ChartResult>(value => chartPayloadShape.safeParse(value).success, "Invalid calculated chart payload");
const horaryPayloadShape = z.object({
  question: z.string().min(1).max(1000),
  askedAt: z.string().min(1).max(60),
  placements: z.array(chartRowPayload).min(1).max(50),
  houses: z.array(z.object({ house: z.number().int().min(1).max(12), longitude: z.number().finite() }).passthrough()).length(12),
  traditional: z.object({ judgment: z.object({ verdict: z.string() }).passthrough() }).passthrough(),
}).passthrough();
const horaryPayload = z.custom<HoraryChart>(value => horaryPayloadShape.safeParse(value).success, "Invalid Horary chart payload");
const chartResultInput = z.object({ chart: chartPayload });
const placeInput = z.object({
  location: z.string().trim().min(2).max(240),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});
const horaryQuestionInput = placeInput.extend({
  question: z.string().trim().min(10).max(1000),
  subject: z.enum(["querent", "other"]),
  topicHouse: z.number().int().min(1).max(12),
  subjectHouse: z.number().int().min(1).max(12).optional(),
  natal: placeInput.optional(),
});
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  history: router({
    charts: protectedProcedure.query(({ ctx }) =>
      db.listSavedCharts(ctx.user.openId)
    ),
    readings: protectedProcedure.query(({ ctx }) =>
      db.listSavedReadings(ctx.user.openId)
    ),
    saveChart: protectedProcedure
      .input(
        z.object({
          title: z.string().trim().min(1).max(180),
          location: z.string().trim().min(2).max(240),
          input: z.record(z.string(), z.unknown()),
          chart: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(({ ctx, input }) =>
        db.createSavedChart({ openId: ctx.user.openId, ...input })
      ),
    saveReading: protectedProcedure
      .input(
        z.object({
          chartId: z.number().int().optional(),
          title: z.string().trim().min(1).max(180),
          mode: z.enum(["natal", "transit", "combined"]),
          content: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(({ ctx, input }) =>
        db.createSavedReading({ openId: ctx.user.openId, ...input })
      ),
  }),
  hybrid: router({
    geocode: publicProcedure
      .input(z.object({ query: z.string().min(2) }))
      .query(({ input }) => geocodeLocation(input.query)),
    calculate: publicProcedure
      .input(chartInput)
      .mutation(({ input }) => calculateChart(input)),
  }),
  astrologyKnowledge: router({
    behavioralReport: publicProcedure
      .input(
        chartResultInput.extend({
          question: z.string().trim().max(2000).default(""),
          mode: z.enum(["natal", "transit", "combined"]).default("combined"),
        })
      )
      .query(({ input }) =>
        evaluateBehavioralIntelligence(input.chart, input.question, input.mode)
      ),
    diagnose: publicProcedure
      .input(
        chartResultInput.extend({
          question: z.string().trim().min(1).max(2000),
          mode: z.enum(["natal", "transit", "combined"]).default("combined"),
        })
      )
      .mutation(({ input }) => {
        if (process.env.NODE_ENV === "production")
          throw new Error(
            "Evidence Trace is available only in development mode."
          );
        return diagnoseAstrologyEvidence(
          input.chart,
          input.question,
          input.mode
        );
      }),
  }),
  interpretation: router({
    host: publicProcedure
      .input(
        z.object({
          history: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().max(12000),
              })
            )
            .max(40)
            .default([]),
          question: z.string().min(1).max(2000),
          chart: chartPayload.optional(),
          mode: z.enum(["natal", "transit", "combined"]).optional(),
        })
      )
      .mutation(({ input }) =>
        askHost(input.history, input.question, input.chart, input.mode)
      ),
    generate: publicProcedure
      .input(
        chartResultInput.extend({
          mode: z.enum(["natal", "transit", "combined"]).default("combined"),
          question: z
            .string()
            .trim()
            .min(1)
            .max(2000)
            .default("What should I understand from this chart?"),
        })
      )
      .mutation(({ input }) =>
        generateInterpretation(input.chart, input.mode, input.question)
      ),
    chapter: publicProcedure
      .input(
        z.object({
          chart: chartPayload,
          mode: z.enum(["natal", "transit", "combined"]),
          intelligence: z.string(),
          chapterId: z.enum(
            READING_CHAPTERS.map(chapter => chapter.id) as [string, ...string[]]
          ),
          completedChapters: z.array(z.string()).default([]),
          analysis: z.string().default(""),
          question: z.string().trim().max(2000).default(""),
        })
      )
      .mutation(({ input }) =>
        generateChapter(
          input.chart,
          input.mode,
          input.intelligence,
          input.chapterId as any,
          input.completedChapters,
          input.analysis,
          input.question
        )
      ),
    followUp: publicProcedure
      .input(
        z.object({
          chart: chartPayload,
          interpretation: z.object({
            intelligence: z.string(),
            reading: z.string(),
          }),
          history: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          ),
          question: z.string().min(1),
          mode: z.enum(["natal", "transit", "combined"]).default("combined"),
        })
      )
      .mutation(({ input }) =>
        followUp(
          input.chart,
          input.interpretation,
          input.history,
          input.question,
          input.mode
        )
      ),
  }),
  horary: router({
    open: publicProcedure
      .input(horaryQuestionInput)
      .mutation(({ input }) => openHoraryQuestion(input)),
    followUp: publicProcedure
      .input(
        z.object({
          chart: chartPayload,
          history: horaryFollowUpHistorySchema,
          question: z.string().trim().min(1).max(2000),
        })
      )
      .mutation(({ input }) =>
        horaryFollowUp(input.chart, input.history, input.question)
      ),
  }),
  social: router({
    listLovedOnes: protectedProcedure.query(({ ctx }) => db.listLovedOnes(ctx.user.openId)),
    saveLovedOne: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().trim().min(1).max(100),
          relationship: z.enum([
            "child",
            "partner",
            "parent",
            "sibling",
            "friend",
            "mentor",
            "colleague",
          ]),
          location: z.string().trim().min(2),
          latitude: z.number(),
          longitude: z.number(),
          timezone: z.string(),
          date: z.string(),
          time: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const openId = ctx.user.openId;
        return db.upsertLovedOne(openId, input as any);
      }),
    deleteLovedOne: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const openId = ctx.user.openId;
        return db.deleteLovedOne(openId, input.id);
      }),
    checkInStatus: publicProcedure
      .input(
        z.object({
          name: z.string(),
          relationship: z.enum([
            "child",
            "partner",
            "parent",
            "sibling",
            "friend",
            "mentor",
            "colleague",
          ]),
          location: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          timezone: z.string(),
          date: z.string(),
          time: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const chart = await calculateChart({
          location: input.location,
          latitude: input.latitude,
          longitude: input.longitude,
          timezone: input.timezone,
          date: input.date,
          time: input.time || "12:00",
          worldview: "agent",
          readingScope: "combined",
        });
        const status = evaluateLovedOneCheckIn(chart, input.name, input.relationship);
        return { chart, status };
      }),
    systemIntersect: publicProcedure
      .input(
        z.object({
          userChart: chartPayload,
          targetChart: chartPayload,
        })
      )
      .mutation(({ input }) => {
        return analyzeSystemIntersect(input.userChart, input.targetChart);
      }),
  }),
  ai: router({
    answerChartQuestion: publicProcedure
      .input(
        z.object({
          question: z.string().min(1),
          natalPlacements: z.string().optional(),
          transitPlacements: z.string().optional(),
          context: z.string().optional(),
          gender: z.enum(["male", "female", "other"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const prompt = `You are the Master Interpreter in LIFE STORYTELLING MODE for Bible Believers Astrology.
The user is asking: "${input.question}".
Natal context: ${input.natalPlacements || "Calculated Natal Horizon"}
Transit context: ${input.transitPlacements || "Current transit moment"}
Tone: ${input.gender === "male" ? "Active, grounded practical tone" : input.gender === "female" ? "Receptive, healing, and resonant tone" : "Balanced, objective elder guide"}

CRITICAL RULES:
1. Speak in a continuous, flowing biographical life story narrative—never produce 1-liner summaries or formulaic bullet checklists.
2. Ground your answer in their life arc: how formative childhood roots, early trials, and adulthood consolidation shape this exact topic.
3. Translate all astrological symbolism into concrete, observable real-world 2026 living (career, relationships, digital boundaries, personal sovereignty).
4. Give compassionate, grounded, and empowering guidance.`;

        const model = process.env.GEMINI_API_KEY ? "gemini-3.8-flash" : "claude-sonnet-4-6";
        const response = await invokeLLM({
          model,
          messages: [
            { role: "system", content: buildAstrologyInterpreterSystem(prompt) },
            { role: "user", content: input.question },
          ],
          maxTokens: 2500,
        });
        return String(response.choices[0]?.message?.content ?? "I could not complete that reading right now.");
      }),

    askTransitQuestion: publicProcedure
      .input(
        z.object({
          question: z.string().min(1),
          transitPlacements: z.string(),
          transitDate: z.string().optional(),
          transitTime: z.string().optional(),
          transitLocation: z.string().optional(),
          conversationHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(12000) })).max(40).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const prompt = `You are the Master Interpreter in LIFE STORYTELLING MODE answering transit questions.
The user is asking: "${input.question}".
Current transit sky: ${input.transitPlacements} at ${input.transitLocation || "Observatory"} on ${input.transitDate || "today"}.
Speak in a generous, flowing narrative connecting this present celestial moment to their ongoing life story in real-world 2026 terms. Absolutely no dismissive 1-liners.`;
        const model = process.env.GEMINI_API_KEY ? "gemini-3.8-flash" : "claude-sonnet-4-6";
        const historyMessages = (input.conversationHistory || []).map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        const response = await invokeLLM({
          model,
          messages: [
            { role: "system", content: buildAstrologyInterpreterSystem(prompt) },
            ...historyMessages,
            { role: "user", content: input.question },
          ],
          maxTokens: 2200,
        });
        return { answer: String(response.choices[0]?.message?.content ?? "Unable to read transits right now.") };
      }),

    generateSoulmatePrediction: publicProcedure
      .input(
        z.object({
          natalPlacements: z.string(),
          gender: z.enum(["male", "female", "other"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const prompt = `You are the Master Interpreter evaluating synastry and soulmate connection.
Placements: ${input.natalPlacements}
Gender: ${input.gender || "other"}
Analyze their 7th house, Venus, Moon, and descendant aspects to describe their cosmic soulmate connection in deep, evocative 2026 relational terms. Return a JSON with:
{
  "soulmatePrediction": "A multi-paragraph flowing description of their soulmate's energy, demeanor, values, how they meet, and mutual dynamic",
  "descriptors": ["3-5 vivid adjectives/traits"]
}`;
        const model = process.env.GEMINI_API_KEY ? "gemini-3.8-flash" : "claude-sonnet-4-6";
        const response = await invokeLLM({
          model,
          messages: [{ role: "system", content: prompt }, { role: "user", content: "Generate soulmate prediction." }],
          maxTokens: 2000,
          responseFormat: { type: "json_object" },
        });
        try {
          const content = String(response.choices[0]?.message?.content ?? "{}");
          const parsed = JSON.parse(content);
          return {
            soulmatePrediction: parsed.soulmatePrediction || "A profound partner who mirrors your deep loyalty, integrity, and quiet strength.",
            descriptors: Array.isArray(parsed.descriptors) ? parsed.descriptors : ["Grounding", "Loyal", "Intuitive", "Sovereign"],
          };
        } catch {
          return {
            soulmatePrediction: "Your cosmic soulmate is someone whose steady presence offers complete psychological safety—matching your fierce loyalty and honoring your need for sacred space.",
            descriptors: ["Loyal", "Grounded", "Perceptive", "Steadfast"],
          };
        }
      }),

    generateSynastryBreakdown: publicProcedure
      .input(
        z.object({
          natalPlacements: z.string(),
          soulmatePlacements: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const prompt = `Analyze synastry between:
Person 1: ${input.natalPlacements}
Person 2: ${input.soulmatePlacements}
Generate a rich, deeply insightful relationship compatibility breakdown in JSON format with:
{
  "interpretation": "A flowing, comprehensive synthesis of this relationship's potential and spiritual purpose",
  "aspectGroups": [
    {
      "type": "harmonious",
      "aspects": [
        { "planet1": "Sun", "planet2": "Moon", "aspect": "Trine", "orb": 1.5, "interpretation": "Deep natural understanding and intuitive emotional harmony." }
      ]
    },
    {
      "type": "challenging",
      "aspects": [
        { "planet1": "Mars", "planet2": "Saturn", "aspect": "Square", "orb": 2.1, "interpretation": "Patience and timing require conscious communication." }
      ]
    }
  ]
}`;
        const model = process.env.GEMINI_API_KEY ? "gemini-3.8-flash" : "claude-sonnet-4-6";
        const response = await invokeLLM({
          model,
          messages: [{ role: "system", content: prompt }, { role: "user", content: "Analyze synastry." }],
          maxTokens: 2500,
          responseFormat: { type: "json_object" },
        });
        try {
          const content = String(response.choices[0]?.message?.content ?? "{}");
          const parsed = JSON.parse(content);
          return {
            interpretation: parsed.interpretation || "A powerful synastry dynamic rooted in complementary strengths and mutual growth.",
            aspectGroups: Array.isArray(parsed.aspectGroups) ? parsed.aspectGroups : [],
          };
        } catch {
          return {
            interpretation: "This celestial pairing unites complementary strengths, balancing individual sovereignty with unshakeable mutual dedication.",
            aspectGroups: [
              {
                type: "harmonious",
                aspects: [
                  { planet1: "Sun", planet2: "Moon", aspect: "Trine", orb: 1.8, interpretation: "Mutual intuitive ease and natural respect for each other's emotional rhythms." }
                ]
              }
            ],
          };
        }
      }),

    genesisReading: publicProcedure
      .input(
        chartResultInput.extend({
          question: z.string().default(""),
          focusArea: z.enum(["career", "relationships", "health", "finance", "spirituality", "general", "creativity", "home"]).default("general"),
        })
      )
      .mutation(({ input }) => {
        const pipeline = runGenesisPatternPipeline(input.chart);
        return generateReading(
          pipeline.analysis,
          {
            question: input.question,
            focusArea: input.focusArea,
            preferredTone: "direct",
          },
          input.chart.input?.location || "Observatory",
          input.chart.input?.time || "12:00",
          input.chart.input?.date || new Date().toISOString().split("T")[0]
        );
      }),
  }),
});
export type AppRouter = typeof appRouter;
