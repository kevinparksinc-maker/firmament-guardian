import { computeSynastry } from "../shared/synastryEngine";
import { calculateIndependentEnergyRead } from "../shared/energyScoring";
import { buildChartMethodOutcomes } from "./chartMethodOutcomes";
import { synthesizeMasterSnapshot } from "./astrologyKnowledge/synthesis/readingBridge";
import {
  narrateMasterSynthesis,
  scrubNonHoraryAstrologyJargon,
} from "./astrologyKnowledge/synthesis/narrative";
import { calculateMasterChart as calculateChart } from "./masterChart/entry";
import { buildEnergyReading } from "./energyReading";
import { buildChartPageReading } from "./chartPageReading";
import { buildPlanetPersonaMatrix } from "../shared/planetPersonaMatrix";
import { mapRequestedPlacementsToCanonicalMeaning } from "../shared/masterPlanetPersonaConfig";
import { buildChartBriefing } from "./chartBriefing";
import { readFocusedPlacement } from "./focusedReading";
import { interactiveNatalChat } from "./interactiveNatalCompanion";
import { calculateHarmonicForecast } from "./harmonicForecast";
import { buildVimshottariTimeline, getAshtakavargaVisual } from "./astrologyKnowledge/vedic/timingAndAshtakavarga";
import { buildDivisionalCharts } from "./astrologyKnowledge/vedic/divisionalCharts";
import { calculateVedicStrength } from "./astrologyKnowledge/vedic/strength";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import { z } from "zod";
import { checkAccountRateLimit, getAccountAvailability, loginAccount, registerAccount } from "./accountAuth";
import { sessionConfiguration } from "./_core/env";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { aiProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { geocodeLocation, reverseGeocodeLocation, type ChartResult } from "./astronomy";
import {
  calculatePersonAge,
  calculateAnnualProfection,
  generatePlanetaryCycles,
  compileLifeStoryChapters,
  runAstrologyEngineAudit,
  generateLifeStoryChapter,
} from "./lifeStoryEngine";
import {
  followUp,
  generateChapter,
  generateInterpretation,
  READING_CHAPTERS,
} from "./interpretation";
import { askHost } from "./host";
import { horaryFollowUp, openHoraryQuestion, type HoraryChart } from "./horary";
import { getZodiacSignReading } from "./zodiacHorary";
import { ZODIAC_SIGNS } from "../shared/hybrid";
import { horaryFollowUpHistorySchema } from "./horary-input";
import {
  diagnoseAstrologyEvidence,
  evaluateBehavioralIntelligence,
} from "./astrologyKnowledge";
import { synthesizePlacement } from "./placement-synthesis";
import { analyzeSystemIntersect, evaluateLovedOneCheckIn } from "./social";
import { runInterpretation, interpretationText } from "./astrologyKnowledge/synthesis/interpretationPipeline";
import { stringifyEvidence } from "./astrologyKnowledge/synthesis/evidenceTransport";
import { FULL_SYNTHESIS_STYLE } from "./master-interpreter";
import { runGenesisPatternPipeline } from "./genesisBackup/adapter";
import { calculateGenesisReadingMetrics } from "./genesisBackup/readingEngine";
import { buildUnifiedMasterChart, getMasterNatalChart } from "./masterChart/builder";
import { synthesizeMasterReading } from "./astrologyKnowledge/synthesis";
import { buildMasterPipeline } from "./master-pipeline";
import { buildMasterGameChart } from "./simulationLab/masterGameChart";
import { evaluatePlanetaryTeamHouses, predictSportsGame } from "./simulationLab/sportsPredictor";
import { evaluateGameMethods } from "../shared/simulationLab/registry";


const synastryFocus = z.object({ planetA: z.string().max(80), planetB: z.string().max(80), aspect: z.string().max(40) });

async function readSynastry(userChart: ChartResult, targetChart: ChartResult, focus?: z.infer<typeof synastryFocus>, question = "How do these two charts interact in everyday relationships?") {
  const [user, target] = await Promise.all([
    synthesizeChartForReading(userChart, "natal", question),
    synthesizeChartForReading(targetChart, "natal", question),
  ]);
  const crossChart = analyzeSystemIntersect(user.canonicalChart, target.canonicalChart);
  const studio = computeSynastry(user.canonicalChart, target.canonicalChart);
  const selected = focus && studio.aspects.find(aspect =>
    aspect.planetA === focus.planetA && aspect.planetB === focus.planetB && aspect.aspect === focus.aspect
  );
  if (focus && !selected) throw new Error("SYNASTRY_CONTACT_MISSING: Select a calculated cross-chart contact.");
  const response = await runInterpretation("SYNASTRY", [user.synthesis, target.synthesis], {
    messages: [
      { role: "system", content: FULL_SYNTHESIS_STYLE },
      { role: "user", content: stringifyEvidence({
        question,
        studio,
        selectedContact: selected,
        instructions: "Ledger 1 is the reader and ledger 2 is the other person. Base all cross-chart aspect and overlay claims on the actual studio calculations. When selectedContact is present, center the reading on that contact. Show what each brings and how confirmed contacts create ease or friction in ordinary life. Write clear second-person prose without astrology terminology. Never invent an event, contact, score, or motive.",
      }) },
    ],
    maxTokens: 2500,
  });
  const interpretation = scrubNonHoraryAstrologyJargon(interpretationText(response));
  if (interpretation.length < 100)
    throw new Error("SYNASTRY_INCOMPLETE: The provider did not return a complete reading.");
  return { crossChart, interpretation, user: user.synthesis, target: target.synthesis };
}

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
  transitInstantUtc: z.string().datetime({ offset: true }).optional(),
  instantUtc: z.string().datetime({ offset: true }).optional(),
  worldview: z.enum(["god", "agent", "agent-vs-god"]).default("agent"),
  readingScope: z.enum(["natal", "transit", "combined"]).default("combined"),
  birthTimeKnown: z.boolean().optional(),
  chartRole: z.enum(["natal", "event"]).optional(),
  elevation: z.number().optional(),
  sunriseAnchor: z.object({ sunriseUtc: z.string().datetime({ offset: true }), sunriseSunXYZ: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }) }).optional(),
  transitSunriseAnchor: z.object({ sunriseUtc: z.string().datetime({ offset: true }), sunriseSunXYZ: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }) }).optional(),
  xyzPositions: z.record(z.string(), z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() })).optional(),
  transitXYZPositions: z.record(z.string(), z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() })).optional(),
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
  subject: z.enum(["querent", "other"]).optional(),
  topicHouse: z.number().int().min(1).max(12).optional(),
  subjectHouse: z.number().int().min(1).max(12).optional(),
  natal: placeInput.optional(),
});
export const appRouter = router({
  system: systemRouter,
  auth: router({
    availability: publicProcedure.query(() => getAccountAvailability()),
    me: publicProcedure.query(({ ctx }) => {
      if (ctx.authError) throw ctx.authError;
      return ctx.user;
    }),
    register: publicProcedure.input(z.object({ name: z.string().trim().min(1).max(100), email: z.string().trim().email().max(320), password: z.string().min(12).max(128) }))
      .mutation(async ({ ctx, input }) => {
        checkAccountRateLimit(`register:${ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown"}`);
        sessionConfiguration();
        const user = await registerAccount(input);
        const duration = 30 * 24 * 60 * 60 * 1000;
        const token = await sdk.createSessionToken(user.openId, { name: user.name, expiresInMs: duration });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: duration });
        return { success: true };
      }),
    login: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        checkAccountRateLimit(`login:${ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown"}`);
        const user = await loginAccount(input);
        const duration = 30 * 24 * 60 * 60 * 1000;
        const token = await sdk.createSessionToken(user.openId, { name: user.name, expiresInMs: duration });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: duration });
        return { success: true };
      }),
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
  simulationLab: router({
    predict: aiProcedure
      .input(z.object({
        id: z.string().trim().min(1).max(120),
        league: z.enum(["NFL", "NBA", "NHL"]),
        scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
        venue: z.object({
          name: z.string().trim().min(1).max(240),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          timezone: z.string().min(2).max(100),
        }),
        ascTeam: z.string().trim().min(1).max(120),
        descTeam: z.string().trim().min(1).max(120),
      }))
      .mutation(async ({ input }) => {
        const { snapshot, chart } = await buildMasterGameChart({
          ...input,
          chartVersion: "sports-master-2026.1",
        });
        const methods = evaluateGameMethods(snapshot, [{
          id: "sports-team-house-occupancy",
          name: "God/Agent event-chart team-house occupancy baseline",
          evaluate: () => evaluatePlanetaryTeamHouses(chart),
        }]);
        const { synthesis } = await synthesizeChartForReading(chart, "natal", "Explain the calculated contest testimony.");
        const prediction = await predictSportsGame(snapshot, methods, synthesis);
        return { snapshot, methods, prediction };
      }),
  }),
  hybrid: router({
    geocode: publicProcedure
      .input(z.object({ query: z.string().min(2) }))
      .query(({ input }) => geocodeLocation(input.query)),
    reverseGeocode: publicProcedure
      .input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }))
      .query(({ input }) => reverseGeocodeLocation(input.latitude, input.longitude)),
    calculate: publicProcedure
      .input(chartInput)
      .mutation(({ input }) => calculateChart(input)),
    harmonicForecast: publicProcedure
      .input(z.object({ chart: chartInput, start: z.string().datetime(), steps: z.number().int().min(1).max(48).default(48) }))
      .mutation(({ input }) => calculateHarmonicForecast(input.chart, input.start, input.steps)),
    masterChart: aiProcedure
      .input(
        chartInput.extend({
          mode: z.enum(["natal", "transit", "combined"]).default("natal"),
        })
      )
      .mutation(async ({ input }) => {
        const snapshot = await (input.mode === "natal" && input.worldview === "agent-vs-god"
          ? getMasterNatalChart : buildUnifiedMasterChart)({ ...input, mode: input.mode });
        await synthesizeMasterSnapshot(snapshot, input.mode, "Evaluate the chart's complete method formation before output.");
        return snapshot;
      }),
  }),
  techniqueAudit: router({
    natal: publicProcedure
      .input(chartInput)
      .query(async ({ input }) => {
        const snapshot = await getMasterNatalChart({
          ...input,
          mode: "natal",
          worldview: "agent-vs-god",
        });
        return {
          snapshotId: snapshot.snapshotId,
          validation: snapshot.validation,
          layers: snapshot.methodExecutionLedger.map(layer => ({
            id: layer.id,
            name: layer.name,
            tradition: layer.tradition,
            technique: layer.technique,
            status: layer.status,
            frame: layer.frame,
            evidenceIds: layer.evidenceIds,
            results: layer.results ?? null,
            errorCode: layer.errorCode ?? null,
            notes: layer.notes ?? null,
          })),
        };
      }),
  }),
  vedic: router({
    // Pure numeric computation. This must never depend on an AI provider or
    // wait for full-chart mini readings to finish.
    strength: publicProcedure
      .input(chartResultInput)
      .query(({ input }) => calculateVedicStrength(input.chart)),
    ashtakavargaVisual: publicProcedure
      .input(chartResultInput)
      .query(({ input }) => getAshtakavargaVisual(input.chart)),
    dashaTimeline: publicProcedure
      .input(chartResultInput)
      .query(({ input }) => buildVimshottariTimeline(input.chart)),

    // Read a chart already saved to the signed-in account. Never recalculate
    // natal astronomy from a birth date, and never trust another user's ID.
    savedDivisionalCharts: protectedProcedure
      .input(z.object({ chartId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const saved = (await db.listSavedCharts(ctx.user.openId))
          .find(row => row.id === input.chartId);
        if (!saved) throw new Error("Saved natal chart not found for this account.");
        const validated = chartPayloadShape.safeParse(saved.chart);
        if (!validated.success) throw new Error("Saved chart does not contain a complete natal chart.");
        const natal = validated.data as ChartResult;
        if (!natal.ascendant || !Number.isFinite(natal.ascendant.longitude))
          throw new Error("Saved natal chart is missing a valid Ascendant.");
        if (!natal.northNode || !natal.southNode || !Number.isFinite(natal.northNode.longitude) || !Number.isFinite(natal.southNode.longitude))
          throw new Error("Saved natal chart is missing its lunar nodes.");
        return buildDivisionalCharts({
          ascendantLongitude: natal.ascendant.longitude,
          planets: [
            ...natal.movingBodies.map(p => ({ name: p.name, longitude: p.longitude })),
            { name: natal.northNode.name, longitude: natal.northNode.longitude },
            { name: natal.southNode.name, longitude: natal.southNode.longitude },
          ],
          d1HouseCusps: natal.houses,
        });
      }),

    // Reuses the active profile's existing natal chart; no calculateChart call.
    // The caller must supply the same chart already shown in the profile UI.
    divisionalCharts: publicProcedure
      .input(chartResultInput)
      .query(({ input }) => {
        const natal = input.chart;
        if (!natal.ascendant || !Number.isFinite(natal.ascendant.longitude))
          throw new Error("A calculated natal Ascendant is required for Vargas.");
        return buildDivisionalCharts({
          ascendantLongitude: natal.ascendant.longitude,
          planets: [
            ...natal.movingBodies.map(p => ({ name: p.name, longitude: p.longitude })),
            { name: natal.northNode.name, longitude: natal.northNode.longitude },
            { name: natal.southNode.name, longitude: natal.southNode.longitude },
          ],
          d1HouseCusps: natal.houses,
        });
      }),
  }),
  astrologyKnowledge: router({
    placementSynthesis: aiProcedure
      .input(
        chartResultInput.extend({
          body: z.string().trim().min(1).max(40),
          question: z.string().trim().max(2000).default(""),
        })
      )
      .mutation(({ input }) => synthesizePlacement(input.chart, input.body, input.question)),
    behavioralReport: aiProcedure
      .input(
        chartResultInput.extend({
          question: z.string().trim().max(2000).default(""),
          mode: z.enum(["natal", "transit", "combined"]).default("combined"),
        })
      )
      .query(async ({ input }) => {
        const master = await buildMasterPipeline(input.chart, input.mode, input.question);
        const report = evaluateBehavioralIntelligence(master.canonicalChart, input.question, input.mode);
        const narrated = await narrateMasterSynthesis(master.synthesis, input.question || "Explain the central behavioral patterns in this chart.");
        return {
          ...report,
          interpretation: narrated.narrative.answer,
          masterSnapshot: master.snapshot,
          masterSynthesis: master.synthesis,
        };
      }),
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
    methodOutcomes: aiProcedure
      .input(chartResultInput.extend({ mode: z.enum(["natal", "transit", "combined"]).default("natal") }))
      .query(({ input }) => buildChartMethodOutcomes(input.chart, input.mode)),
    independentSkyReading: aiProcedure
      .input(chartResultInput.extend({ contactId: z.string().max(180).optional() }))
      .mutation(async ({ input }) => {
        if (input.chart.input.chartRole !== "event") throw new Error("An independent event chart is required.");
        const question = "What patterns stand out in this independent event sky?";
        const { synthesis, canonicalChart } = await synthesizeChartForReading(input.chart, "natal", question);
        const score = calculateIndependentEnergyRead(canonicalChart);
        const contact = input.contactId && score?.contacts.find(item => item.id === input.contactId);
        if (input.contactId && !contact) throw new Error("The selected contact is absent from this event chart.");
        const response = await runInterpretation("INDEPENDENT_SKY", synthesis, {
          messages: [
            { role: "system", content: FULL_SYNTHESIS_STYLE },
            { role: "user", content: stringifyEvidence({
              question, score, contact,
              instruction: "Read only the independent event sky and its body-to-body contacts. Do not treat either side of a contact as a natal placement. If a contact is selected, lead with its meaning and put it in the context of the surrounding sky. Describe the observable situation in clear language without predicting a guaranteed outcome.",
            }) },
          ],
          maxTokens: 1600,
        });
        return scrubNonHoraryAstrologyJargon(interpretationText(response));
      }),
    energyReading: aiProcedure.input(chartResultInput).mutation(({ input }) => buildEnergyReading(input.chart)),
    chartPage: aiProcedure.input(z.object({ chart: chartPayload, mode: z.enum(["natal", "transit", "combined"]), names: z.array(z.string().min(1).max(80)).min(1).max(2).default(["Sun", "Moon"]) })).mutation(({ input }) => buildChartPageReading(input.chart, input.mode, input.names)),
    personaMatrix: publicProcedure.input(chartResultInput).query(({ input }) => buildPlanetPersonaMatrix(input.chart)),
    canonicalMappings: publicProcedure
      .input(chartResultInput.extend({ requestedActors: z.array(z.string()).optional() }))
      .query(({ input }) => mapRequestedPlacementsToCanonicalMeaning(input.chart, input.requestedActors)),
    chatWithChart: aiProcedure
      .input(
        z.object({
          chart: chartPayload,
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
          mode: z.enum(["natal", "transit", "combined"]).default("natal"),
        })
      )
      .mutation(async ({ input }) => {
        return interactiveNatalChat(input.history, input.question, input.chart, input.mode);
      }),
    chartBriefing: aiProcedure.input(z.object({ chart: chartPayload })).mutation(({ input }) => buildChartBriefing(input.chart)),
    focusedPlacement: aiProcedure
      .input(z.object({ chart: chartPayload, target: z.object({ kind: z.enum(["placement", "star", "contact"]), name: z.string().min(1).max(80), otherName: z.string().min(1).max(80).optional(), layer: z.enum(["natal", "transit"]), lens: z.enum(["all", "mind", "work", "love"]).optional(), atUtc: z.string().datetime({ offset: true }).optional() }) }))
      .mutation(({ input }) => readFocusedPlacement(input.chart, input.target)),
    host: aiProcedure
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
      .mutation(async ({ input }) => {
        return askHost(input.history, input.question, input.chart, input.mode);
      }),
    generate: aiProcedure
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
      .mutation(async ({ input }) => {
        const interpretation = await generateInterpretation(input.chart, input.mode, input.question);
        return { ...interpretation, synthesis: interpretation.masterSynthesis };
      }),
    masterSynthesize: aiProcedure
      .input(
        chartInput.extend({
          chart: chartPayload.optional(),
          mode: z.enum(["natal", "transit", "combined"]).default("natal"),
          question: z
            .string()
            .trim()
            .max(2000)
            .default("What is the core life purpose and integrated trajectory of this chart?"),
        })
      )
      .mutation(async ({ input }) => {
        if (input.chart) {
          const { synthesis } = await synthesizeChartForReading(input.chart, input.mode, input.question);
          return narrateMasterSynthesis(synthesis, input.question);
        }
        const snapshot = await buildUnifiedMasterChart({ ...input, mode: input.mode });
        const { synthesis } = await synthesizeMasterSnapshot(snapshot, input.mode, input.question);
        return narrateMasterSynthesis(synthesis, input.question);
      }),
    chapter: aiProcedure
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
      .mutation(async ({ input }) => {
        return generateChapter(
          input.chart as ChartResult,
          input.mode,
          input.intelligence,
          input.chapterId as any,
          input.completedChapters,
          input.analysis,
          input.question
        );
      }),
    followUp: aiProcedure
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
      .mutation(async ({ input }) => {
        return followUp(
          input.chart as ChartResult,
          input.interpretation,
          input.history,
          input.question,
          input.mode
        );
      }),
  }),
  horary: router({
    open: aiProcedure
      .input(horaryQuestionInput)
      .mutation(({ input }) => openHoraryQuestion(input)),
    followUp: aiProcedure
      .input(
        z.object({
          chart: horaryPayload,
          history: horaryFollowUpHistorySchema,
          question: z.string().trim().min(1).max(2000),
        })
      )
      .mutation(({ input }) =>
        horaryFollowUp(input.chart, input.history, input.question)
      ),
  }),
  zodiacHorary: router({
    // Separate from traditional Horary: the selected sign's classical ruler
    // anchors Agent House 1 while God View retains 0° Aries.
    read: aiProcedure
      .input(z.object({
        sign: z.enum(ZODIAC_SIGNS),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        question: z.string().trim().max(700).optional(),
      }))
      .mutation(({ input }) => getZodiacSignReading(input)),
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
    checkInStatus: aiProcedure
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
        const question = "What is a considerate way to check in with this loved one at the selected moment?";
        const { synthesis, canonicalChart } = await synthesizeChartForReading(chart, "combined", question);
        const calculated = evaluateLovedOneCheckIn(canonicalChart, input.name, input.relationship);
        const { activeSignatures, pressureLevel, dominantTransitBody } = calculated;
        const response = await runInterpretation("LOVED_ONE_CHECK_IN", synthesis, {
          messages: [
            { role: "system", content: "Offer grounded, considerate relationship guidance. Never claim private knowledge of this person's feelings or events. Keep technical astrology language in the evidence." },
            { role: "user", content: stringifyEvidence({
              question, name: input.name, relationship: input.relationship,
              evidence: { activeSignatures, pressureLevel, dominantTransitBody },
              format: "Return JSON with mechanicsSummary, whatTheyAreProcessing (a possibility in ordinary language), howToShowUp, whatToAvoid, and suggestedCheckInMessage. Keep each field specific and useful. The suggested message is a draft in the reader's voice.",
            }) },
          ],
          responseFormat: { type: "json_object" },
          maxTokens: 1400,
        });
        const { mechanicsSummary, suggestedCheckInMessage, ...actionableEmpathyPrompt } = z.object({
          mechanicsSummary: z.string().trim().min(20),
          whatTheyAreProcessing: z.string().trim().min(20),
          howToShowUp: z.string().trim().min(20),
          whatToAvoid: z.string().trim().min(20),
          suggestedCheckInMessage: z.string().trim().min(20),
        }).parse(JSON.parse(interpretationText(response)));
        return {
          chart,
          status: {
            lovedOneName: input.name,
            relationship: input.relationship,
            activeSignatures,
            pressureLevel,
            dominantTransitBody,
            mechanicsSummary,
            actionableEmpathyPrompt,
            suggestedCheckInMessage,
          },
        };
      }),
    systemIntersect: aiProcedure
      .input(
        z.object({
          userChart: chartPayload,
          targetChart: chartPayload,
        })
      )
      .mutation(async ({ input }) => {
        const { crossChart, interpretation, user, target } = await readSynastry(input.userChart, input.targetChart);
        return {
          ...crossChart,
          interpretation,
          unifiedSynthesis: {
            scope: "two-natal-ledgers-plus-existing-cross-chart-synastry" as const,
            user,
            target,
          },
        };
      }),
  }),
  ai: router({
    answerChartQuestion: aiProcedure
      .input(z.object({
        question: z.string().min(1),
        chart: chartPayload,
        mode: z.enum(["natal", "transit", "combined"]).default("natal"),
      }))
      .mutation(({ input }) => askHost([], input.question, input.chart, input.mode)),

    askTransitQuestion: aiProcedure
      .input(chartResultInput.extend({
        question: z.string().min(1),
        conversationHistory: horaryFollowUpHistorySchema.optional(),
      }))
      .mutation(async ({ input }) => ({
        answer: await askHost(input.conversationHistory ?? [], input.question, input.chart, "transit"),
      })),

    generateSoulmatePrediction: aiProcedure
      .input(chartResultInput)
      .mutation(async ({ input }) => {
        const { synthesis } = await synthesizeChartForReading(input.chart, "natal", "Natal relationship potential");
        const response = await runInterpretation("RELATIONSHIP_POTENTIAL", synthesis, {
          messages: [
            { role: "system", content: FULL_SYNTHESIS_STYLE },
            { role: "user", content: "Synthesize the reader's natal relationship potential. Show how intimacy, loyalty, attraction, and conflict interact in ordinary life. Return JSON with soulmatePrediction (candid flowing second-person prose, at least 100 characters) and descriptors (3–5 distinct everyday traits). Keep astrology terms out of the prose. Do not invent a partner, an event, or someone else's motives." },
          ],
          maxTokens: 2000,
          responseFormat: { type: "json_object" },
        });
        const reading = z.object({
          soulmatePrediction: z.string().trim().min(100),
          descriptors: z.array(z.string().trim().min(1)).min(3).max(5),
        }).parse(JSON.parse(interpretationText(response)));
        return {
          soulmatePrediction: scrubNonHoraryAstrologyJargon(reading.soulmatePrediction),
          descriptors: reading.descriptors,
        };
      }),

    generateSynastryBreakdown: aiProcedure
      .input(z.object({ userChart: chartPayload, targetChart: chartPayload, focus: synastryFocus.optional(), question: z.string().trim().max(500).optional() }))
      .mutation(async ({ input }) => {
        const { crossChart, interpretation } = await readSynastry(input.userChart, input.targetChart, input.focus, input.question);
        return {
          interpretation,
          aspectGroups: [
            { type: "harmonious", aspects: crossChart.keyConnections.filter(contact => contact.type === "support") },
            { type: "challenging", aspects: crossChart.keyConnections.filter(contact => contact.type !== "support") },
          ],
        };
      }),

    genesisReading: aiProcedure
      .input(chartResultInput.extend({
        question: z.string().default(""),
        focusArea: z.enum(["career", "relationships", "health", "finance", "spirituality", "general", "creativity", "home"]).default("general"),
      }))
      .mutation(async ({ input }) => {
        const question = input.question || `Read this chart with a focus on ${input.focusArea}.`;
        const { canonicalChart, synthesis } = await synthesizeChartForReading(input.chart, input.chart.readingScope, question);
        const { analysis } = runGenesisPatternPipeline(canonicalChart);
        const { developmentalPhase, confidence, themeStrengths } = calculateGenesisReadingMetrics(analysis, { question, focusArea: input.focusArea });
        const response = await runInterpretation("GENESIS_READING", synthesis, {
          messages: [
            { role: "system", content: FULL_SYNTHESIS_STYLE },
            { role: "user", content: stringifyEvidence({
              question,
              focusArea: input.focusArea,
              calculatedPatterns: analysis,
              developmentalPhase,
              themeNames: Array.from(themeStrengths.keys()),
              format: "Return JSON with plain, deep, guidance, forecast, childhoodRoots and adulthoodArc, each a distinct prose section. Also return emotionalTone (short text), themes [{name, description, actionableAdvice}] using only listed theme names, tensions [{between, description, resolutionPath}], and gifts [{source, description, howToUse}]. Ground forecasts in calculated timing and keep childhood and adulthood sections tied to tendencies without inventing past events. An array can be empty if the evidence supplies no matching finding.",
            }) },
          ],
          maxTokens: 4200,
          responseFormat: { type: "json_object" },
        });
        const prose = z.object({
          plain: z.string().trim().min(40),
          deep: z.string().trim().min(40),
          guidance: z.string().trim().min(40),
          forecast: z.string().trim().min(40),
          childhoodRoots: z.string().trim().min(40),
          adulthoodArc: z.string().trim().min(40),
          emotionalTone: z.string().trim().min(1),
          themes: z.array(z.object({ name: z.string().refine(name => themeStrengths.has(name)), description: z.string().trim().min(1), actionableAdvice: z.string().trim().min(1) })),
          tensions: z.array(z.object({ between: z.array(z.string()).min(2), description: z.string().trim().min(1), resolutionPath: z.string().trim().min(1) })),
          gifts: z.array(z.object({ source: z.string().trim().min(1), description: z.string().trim().min(1), howToUse: z.string().trim().min(1) })),
        }).parse(JSON.parse(interpretationText(response)));
        const titles = ["The current pattern", "Why it matters", "How to work with it", "What is emerging", "Early roots", "Adulthood"];
        const sections = [prose.plain, prose.deep, prose.guidance, prose.forecast, prose.childhoodRoots, prose.adulthoodArc];
        return {
          ...prose,
          themes: prose.themes.map(theme => ({ ...theme, strength: themeStrengths.get(theme.name)! })),
          developmentalPhase,
          confidence,
          formattedReading: sections.map((section, i) => `## ${titles[i]}\n\n${section}`).join("\n\n"),
          timestamp: new Date(),
        };
      }),
  }),
  lifeStory: router({
    calculateCycles: publicProcedure
      .input(
        chartResultInput.extend({
          targetAge: z.number().min(0).max(120).optional(),
        })
      )
      .query(({ input }) => {
        const birthDate = input.chart.input?.date || "1990-01-01";
        const currentAge = calculatePersonAge(birthDate);
        const selectedAge = input.targetAge ?? currentAge;
        const profection = calculateAnnualProfection(selectedAge, input.chart);
        const cycles = generatePlanetaryCycles(input.chart, currentAge);
        const chapters = compileLifeStoryChapters(input.chart, currentAge, cycles);
        const audit = runAstrologyEngineAudit(input.chart);

        return {
          currentAge,
          selectedAge,
          profection,
          cycles,
          chapters,
          audit,
        };
      }),

    generateChapter: aiProcedure
      .input(
        chartResultInput.extend({
          chapterKey: z.enum([
            "birth_origins",
            "childhood",
            "adolescence",
            "early_adulthood",
            "adult_development",
            "later_life",
            "turning_points",
            "future_chapters",
          ]),
          selectedAge: z.number().min(0).max(120).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return generateLifeStoryChapter(input.chart, input.chapterKey, input.selectedAge);
      }),

    audit: publicProcedure
      .input(chartResultInput)
      .query(({ input }) => {
        const layers = runAstrologyEngineAudit(input.chart);
        const verifiedCount = layers.filter(
          l => l.status === "implemented-verified"
        ).length;
        return {
          layers,
          totalLayers: layers.length,
          verifiedCount,
          isFullyOperational: verifiedCount >= 19,
        };
      }),
  }),
});
export type AppRouter = typeof appRouter;
