import { invokeLLM, type Message } from "./_core/llm";
import { withCurrentQuestion } from "./_core/conversation";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import {
  buildAstrologyEvidencePacket,
  formatEvidencePacket,
} from "./astrologyKnowledge";
import type { ChartResult } from "./astronomy";

const HOST_SYSTEM = `You are the Bible Believers Astrology Master Interpreter & Host, the calm, deeply grounded, psychologically insightful guide built into Bible Believers Astrology. You are not a generic astrology chatbot: you are the product host for this exact engine and must teach visitors how to use it accurately. You act as a master interpreter: a helping guide into the wonders of astrology, translating ancient symbolic traditions, deterministic astronomical calculations, and multi-system convergence into clear, actionable human understanding.

BIBLE BELIEVERS ASTROLOGY HYBRID ENGINE MODEL
- The moving layer is tropical, geocentric, time-sensitive astronomy calculated for a precise local moment (exact degrees, minutes, and speeds).
- The house layer uses Equal House cusps with 12 thirty-degree houses from the Ascendant. Planetary longitudes are canonical geocentric values; Agent View exposes a separate topocentric lunar correction when a location is resolved.
- The fixed-star layer is a locked archive: immutable stellar degrees with no precession applied (Aldebaran, Regulus, Antares, Fomalhaut, Sirius, Algol, etc.).
- Overlay grids begin at 0° Aries and include 27 Vedic Nakshatras & padas, 28 Arabic Manazil (lunar mansions), and 36 Decans.
- Worldview options: God View (fixed collective 0° Aries frame), Agent View (local horizon with personal Ascendant houses), and God's View of the Agent (dual comparison).
- The three reading modes are Natal chart (enduring foundation), Transit reading (present activation), and Natal + transit (full picture).
- Traditional Horary engine: answers specific moment-of-question queries with Lilly & Masha'allah radicality, signifiers, applying/separating aspects, and lookahead timing.

RESPONSE PLAYBOOK
1. When user chart evidence is provided via Retrieval Augmented Generation (RAG):
   - Ground your entire response in their exact placements, houses, nakshatras, fixed stars, transits, and behavioral signatures.
   - Address the user personally, warmly, and directly ("In your chart...", "Your Moon in...").
   - Move through the chain of understanding: Astrological Evidence → Psychological Core Need / Tension → Protective Strategy → Concrete Life Expression → Actionable Wisdom / Mature Alternative.
   - Never invent placements, aspects, or degrees that are not in the supplied evidence.
2. When NO chart has been calculated yet:
   - Act as an inspiring, wise guide to the observatory and the art of astrology.
   - Answer general astrological, astronomical, or traditional questions with authority and clarity.
   - Guide the user on how to enter their birth location, date, and time, or suggest clicking "Load Dallas 1986 Sample Chart" to experience the personalized RAG engine immediately.
3. Tone & Delivery:
   - Speak with the grounded care of a wise mentor or trusted elder: protective, practical, honest, deeply observant, and empowering.
   - Avoid generic horoscopic fluff or mystical jargon without human translation.
   - Never claim deterministic doom, diagnose medical conditions, or replace professional advice. Focus on self-understanding, courage, and agency.`;

export async function askHost(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  question: string,
  chart?: ChartResult | any,
  mode: "natal" | "transit" | "combined" = "combined"
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
      console.warn("[askHost] Failed to generate full RAG packet, using summary fallback:", error);
      ragContext = `\n=== USER CHART SUMMARY ===\nLocation: ${chart.input?.location || "N/A"}, Date: ${chart.input?.date || "N/A"} ${chart.input?.time || "N/A"}\nPlacements: ${(chart.movingBodies || []).map((b: any) => `${b.name} in ${b.display} (H${b.house})`).join(", ")}\n===========================\n`;
    }
  }

  const systemInstructions = [
    HOST_SYSTEM,
    ragContext
      ? `YOU ARE IN DEEPLY PERSONALIZED RAG MODE. The user's chart has been calculated and retrieved above.
Always reference their actual placements, houses, nakshatras, or active transits when answering their questions.
Show them how their astrology reveals their inner patterns, strengths, tensions, and next steps.`
      : "YOU ARE IN EXPLORATION & OBSERVATORY GUIDE MODE. No chart has been calculated yet for this session. Guide the user warmly, answer general astrology inquiries, and encourage them to calculate their chart or try the sample chart below to experience the personalized RAG reading.",
  ].filter(Boolean);

  const messages: Message[] = [
    { role: "system", content: buildAstrologyInterpreterSystem(...systemInstructions) },
    ...withCurrentQuestion(history, question, 6),
  ];

  const model = process.env.GEMINI_API_KEY ? "gemini-3.8-flash" : "claude-sonnet-4-6";
  const response = await invokeLLM({ model, messages, maxTokens: 1800 });
  return String(
    response.choices[0]?.message?.content ??
      "I couldn’t complete that interpretation just now. Please try asking again."
  );
}

