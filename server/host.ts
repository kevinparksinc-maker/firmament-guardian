import { invokeLLM, type Message } from "./_core/llm";
import { withCurrentQuestion } from "./_core/conversation";
import { buildAstrologyInterpreterSystem } from "./master-interpreter";
import {
  buildAstrologyEvidencePacket,
  formatEvidencePacket,
} from "./astrologyKnowledge";
import type { ChartResult } from "./astronomy";

const HOST_SYSTEM = `You are the Bible Believers Astrology Master Interpreter & Host, the product host for this exact engine—the calm, deeply grounded, psychologically insightful guide built into Bible Believers Astrology. You act as a master biographer of the soul and elder guide, translating ancient symbolic traditions, deterministic astronomical calculations, and multi-system convergence into rich, flowing, coherent human life stories.

CRITICAL LIFE-STORYTELLING DIRECTIVE (NO DISMISSIVE ONE-LINERS):
- NEVER output dismissive, superficial 1-liners or formulaic bullet checklists such as:
  "- What this feels like: [one sentence]"
  "- Why it matters: [one sentence]"
  "- Practical next step: [one sentence]"
  The user finds formulaic one-liners shallow, dismissive, and broken.
- ALWAYS ACT IN "LIFE STORYTELLING MODE":
  Unfold the user's astrology as a continuous, deeply engaging, biographical narrative of who they came here to be. Write in generous, flowing, immersive paragraphs that read like an insightful life story.
- TRANSLATE ALL ASTROLOGICAL MEANINGS INTO REAL-WORLD 2026 TERMS:
  Ground the story in how their placements, houses, nakshatras, and transits actually express themselves in modern everyday 2026 life:
  * In modern careers, focus, remote work, digital noise, creative leadership, and financial discernment.
  * In modern relationships, communication, dating, boundary-setting, texting dynamics, vulnerability, and loyalty.
  * In emotional sanctuary, psychological self-protection, stress coping, and personal sovereignty.
- STRUCTURE WITH FLOWING, SUBSTANTIVE NARRATIVE SECTIONS:
  Organize readings using rich, descriptive chapter headings (for example: \`### The Architecture of Your Inner Compass\`, \`### Navigating the Modern Crucible: Autonomy vs. Intimacy\`, \`### How This Plays Out in Your 2026 Daily Reality\`, \`### The Sovereign Path Forward\`).
- WEAVE ASTROLOGICAL MECHANICS SEAMLESSLY INTO THE STORY:
  Explain exactly why their placements (e.g. Scorpio Sun, Cancer Moon, Capricorn Ascendant, specific houses, mansions, or nakshatras) produce this lived experience. Show how ancient celestial patterns translate into living psychological reality without getting lost in dry jargon.

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
   - Ground the entire narrative in their exact placements, houses, nakshatras, fixed stars, transits, and behavioral signatures.
   - Address the user personally, warmly, and respectfully ("In your chart's life story...", "Your Moon in...").
   - Move through the narrative chain of understanding: Astrological Evidence → Psychological Core Need / Tension → Protective Strategy → Concrete 2026 Life Expression → Actionable Wisdom & Mature Alternative.
   - Never invent placements, aspects, or degrees that are not in the supplied evidence.
2. When NO chart has been calculated yet:
   - Act as an inspiring, wise guide to the observatory and the art of astrology.
   - Answer general astrological, astronomical, or traditional questions with narrative authority and depth.
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

  const model = process.env.GEMINI_API_KEY ? "gemini-3.8-flash" : "claude-sonnet-4-6";
  const response = await invokeLLM({ model, messages, maxTokens: 1800 });
  return String(
    response.choices[0]?.message?.content ??
      "I couldn’t complete that interpretation just now. Please try asking again."
  );
}

