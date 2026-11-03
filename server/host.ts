import { invokeLLM, type Message } from "./_core/llm";
import { withCurrentQuestion } from "./_core/conversation";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import {
  buildAstrologyEvidencePacket,
  formatEvidencePacket,
} from "./astrologyKnowledge";
import type { ChartResult } from "./astronomy";

const HOST_SYSTEM = `You are The Absolute's Host Interpreter. Answer the user's question through the supplied chart evidence and the traditional meanings of its calculated methods. Interpret the strongest patterns directly, explain why the evidence supports the conclusion, and address contradictions. Do not impose a fixed personality, emotional narrative, cosmology lecture, or modern-life topic list. Do not invent chart facts or observed events.`;

export async function askHost(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  question: string,
  chart?: ChartResult | any,
  mode: "natal" | "transit" | "combined" = "combined",
  synthesisContext = ""
) {
  let ragContext = "";

  if (chart && typeof chart === "object" && Array.isArray(chart.movingBodies)) {
    try {
      // 1. Build and format full multi-system Evidence Packet (Vedic, Arabic, Western, Behavioral)
      const packet = buildAstrologyEvidencePacket(chart, question, mode);
      const formattedPacket = formatEvidencePacket(packet);

      // 2. Synthesize concise high-impact chart highlights
      const birthLoc = chart.input?.location || "Unknown Location";
      const birthDate = chart.input?.date || "";
      const birthTime = chart.input?.time || "";
      const worldview = chart.worldview || "agent";

      const keyBodies = (chart.movingBodies || [])
        .map(
          (b: any) =>
            `- ${b.name}: ${b.display} in House ${b.house}` +
            (b.overlay?.nakshatra ? ` | Nakshatra: ${b.overlay.nakshatra} (Pada ${b.overlay.pada})` : "") +
            (b.overlay?.manzil ? ` | Manzil: ${b.overlay.manzil}` : "") +
            (b.overlay?.decan ? ` | Decan: ${b.overlay.decan}` : "") +
            (b.retrograde ? " [Retrograde]" : "")
        )
        .join("\n");

      const transitHighlights = Array.isArray(chart.transits)
        ? chart.transits
            .filter((t: any) => t.natalContacts && t.natalContacts.length > 0)
            .slice(0, 8)
            .map(
              (t: any) =>
                `- Transit ${t.name} (${t.display}) in Natal House ${t.house} contacting: ${t.natalContacts
                  .map((c: any) => `${c.natalName} (${c.aspect}, orb ${c.orb.toFixed(1)}°)`)
                  .join(", ")}`
            )
            .join("\n")
        : "";

      ragContext = `
=== RETRIEVED USER CHART EVIDENCE (RAG CONTEXT) ===
CHART IDENTIFIERS:
- Birth Location: ${birthLoc}
- Birth Date & Time: ${birthDate} ${birthTime} (${chart.input?.timezone || "UTC"})
- Active Worldview: ${worldview}
- Reading Mode: ${mode}
${chart.ascendant ? `- Ascendant: ${chart.ascendant.display}` : ""}
${chart.midheaven ? `- Midheaven: ${chart.midheaven.display}` : ""}

NATAL PLACEMENTS & TRADITIONAL OVERLAYS:
${keyBodies}

${transitHighlights ? `ACTIVE TRANSIT CONTACTS:\n${transitHighlights}\n` : ""}

SYNTHESIZED MULTI-SYSTEM EVIDENCE DOSSIER:
${formattedPacket}
===================================================
`;
    } catch (error) {
      console.error("[HOST_EVIDENCE_FAILED] Full chart evidence retrieval failed:", error);
      throw new Error("HOST_EVIDENCE_FAILED: Full chart evidence is unavailable; refusing a summary-only reading.");

    }
  }

  if (synthesisContext) ragContext += `\n\nUNIFIED MASTER SYNTHESIS — COMPLETE METHOD EVIDENCE:\n${synthesisContext}`;

  const systemInstructions = [
    HOST_SYSTEM,
    ragContext
      ? `YOU ARE IN DEEPLY PERSONALIZED LIFE STORYTELLING RAG MODE.
The user's verified chart has been calculated and retrieved above.
MANDATORY STYLE RULES:
1. Speak in a flowing, immersive biographical life story narrative—never produce 1-liner summaries or formulaic bullet checklists.
2. Translate their exact astrological placements (Sun, Moon, Ascendant, houses, nakshatras, transits) into vivid, real-world 2026 lived experience (careers, digital communication, relationships, boundary dynamics, deep trust).
3. Weave explanations into substantial, multi-paragraph story sections with descriptive narrative headings.
4. Treat the user with profound depth, care, and practical wisdom.`
      : "YOU ARE IN EXPLORATION & OBSERVATORY GUIDE MODE. No chart has been calculated yet for this session. Guide the user warmly, answer general astrology inquiries in an engaging storytelling manner, and encourage them to calculate their chart or try the sample chart below to experience the personalized RAG life story reading.",
  ].filter(Boolean);

  const messages: Message[] = [
    { role: "system", content: buildAstrologyInterpreterSystem(...systemInstructions) },
    ...withCurrentQuestion(history, question, 6),
  ];

  // Provider routing is resolved centrally by invokeLLM; do not infer the provider from a single key.\n  const model = "claude-sonnet-4-6";
  const response = await invokeLLM({ model, messages, maxTokens: 1800 });
  const content = response.choices[0]?.message?.content;
  const reading = typeof content === "string" ? content.trim() : "";
  if (!reading) {
    throw new Error("HOST_AI_EMPTY_RESPONSE: AI provider returned no readable interpretation.");
  }
  return reading;
}
