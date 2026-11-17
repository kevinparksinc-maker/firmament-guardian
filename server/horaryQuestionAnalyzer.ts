import { z } from "zod";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";

export type HoraryQuestionType =
  | "yes_no"
  | "open_explanatory"
  | "timing"
  | "location"
  | "comparison";

export type HoraryQuestionAnalysis = {
  subject: "querent" | "other";
  subjectHouse: number;
  topicHouse: number;
  additionalHouses: number[];
  matterSubject: string;
  intendedOutcome: string;
  questionType: HoraryQuestionType;
  isInterpersonal: boolean;
  reasoning: string;
  source: "ai" | "heuristic" | "manual_override";
};

const analysisSchema = z.object({
  subject: z.enum(["querent", "other"]),
  subjectHouse: z.number().int().min(1).max(12),
  topicHouse: z.number().int().min(1).max(12),
  additionalHouses: z.array(z.number().int().min(1).max(12)).max(4).default([]),
  matterSubject: z.string().trim().min(2).max(200),
  intendedOutcome: z.string().trim().min(2).max(240),
  questionType: z.enum([
    "yes_no",
    "open_explanatory",
    "timing",
    "location",
    "comparison",
  ]),
  isInterpersonal: z.boolean(),
  reasoning: z.string().trim().min(4).max(400),
});

const EXPLICIT_PERSON_RE =
  /\b(ex|partner|spouse|husband|wife|boyfriend|girlfriend|crush|fiance|fiancee|dating|marry|marriage|divorce|breakup|broke up|boss|manager|coworker|colleague|client|customer|friend|neighbor|neighbour|sibling|brother|sister|mother|mom|mum|father|dad|parent|child|son|daughter|kid|doctor|lawyer|agent|landlord|roommate|someone|person|anyone|they|them|he|she|him|her|relationship|romance|love life)\b/i;

const SOLO_CREATION_RE =
  /\b(app|apps|application|software|tool|tools|program|code|feature|product|platform|website|site|youtube|channel|podcast|blog|book|script|novel|album|song|art|painting|design|craft|creation|project|prototype|build|building|astrology app|divination)\b/i;

const BUSINESS_RE =
  /\b(business|company|startup|enterprise|brand|store|shop|agency|firm|practice|venture)\b/i;

const MISSING_ITEM_RE =
  /\b(missing|lost|misplaced|can'?t find|where is my|where are my|stolen)\b/i;

const APPROVAL_RE =
  /\b(approved|approval|accepted|acceptance|admitted|admission|application be approved|loan|mortgage|grant|visa|permit|license|licence)\b/i;

function classifyQuestionType(q: string): HoraryQuestionType {
  const normalized = q.trim().toLowerCase();
  if (
    /^where\b|\bwhere (is|are|did|could|might)\b/i.test(normalized) ||
    MISSING_ITEM_RE.test(normalized)
  ) {
    return /\bwill i find\b/i.test(normalized) ? "yes_no" : "location";
  }
  if (/^(when|how soon|how long)\b|\bwhat (date|month|year|time)\b/i.test(normalized)) {
    return "timing";
  }
  if (
    /\b(or should i|which one|which is better|option a|option b|between .+ and .+)\b/i.test(normalized)
  ) {
    return "comparison";
  }
  if (
    /^(what|why|how|in what way|which areas?|tell me what)\b/i.test(normalized) ||
    /\bwhat (does|do|is|are|needs?|should|could|would|makes?)\b/i.test(normalized)
  ) {
    return "open_explanatory";
  }
  return "yes_no";
}

function inferOtherPersonHouse(q: string): {
  subjectHouse: number;
  label: string;
} {
  if (/\b(my|our)\s+(child|son|daughter|kid)\b|\b(child|son|daughter)\s+of\s+mine\b/i.test(q)) {
    return { subjectHouse: 5, label: "your child" };
  }
  if (/\b(my|our)\s+(brother|sister|sibling)\b/i.test(q)) {
    return { subjectHouse: 3, label: "your sibling" };
  }
  if (/\b(my|our)\s+(father|dad)\b/i.test(q)) {
    return { subjectHouse: 10, label: "your father" };
  }
  if (/\b(my|our)\s+(mother|mum|mom|parent)\b/i.test(q)) {
    return { subjectHouse: 4, label: "your mother" };
  }
  if (/\b(my|our)\s+(boss|manager|employer)\b/i.test(q)) {
    return { subjectHouse: 10, label: "your boss or employer" };
  }
  if (/\b(my|our)\s+(friend|group|team|ally)\b/i.test(q)) {
    return { subjectHouse: 11, label: "your friend" };
  }
  if (/\b(my|our)\s+(coworker|colleague|employee|assistant)\b/i.test(q)) {
    return { subjectHouse: 6, label: "your coworker" };
  }
  if (/\b(my|our)\s+(partner|spouse|husband|wife|boyfriend|girlfriend|ex|fiance|fiancee)\b/i.test(q)) {
    return { subjectHouse: 7, label: "your partner or counterpart" };
  }
  return { subjectHouse: 7, label: "the other person" };
}

export function analyzeHoraryQuestionHeuristic(
  question: string,
  explicitOverrides?: {
    subject?: "querent" | "other";
    topicHouse?: number;
    subjectHouse?: number;
  }
): HoraryQuestionAnalysis {
  const q = question.trim();
  const lower = q.toLowerCase();
  const questionType = classifyQuestionType(q);
  const explicitPersonInText = EXPLICIT_PERSON_RE.test(lower);
  const isSoloCreation = SOLO_CREATION_RE.test(lower) && !explicitPersonInText;

  // Handle explicit overrides from advanced astrologer controls or unit tests
  if (explicitOverrides?.subject && explicitOverrides?.topicHouse) {
    const subjectHouse =
      explicitOverrides.subject === "querent"
        ? 1
        : explicitOverrides.subjectHouse &&
            Number.isInteger(explicitOverrides.subjectHouse) &&
            explicitOverrides.subjectHouse >= 1 &&
            explicitOverrides.subjectHouse <= 12
          ? explicitOverrides.subjectHouse
          : explicitPersonInText
            ? inferOtherPersonHouse(lower).subjectHouse
            : 7;

    const isInterpersonal =
      explicitOverrides.subject === "other" ||
      (explicitPersonInText && !isSoloCreation) ||
      (explicitOverrides.topicHouse === 7 && !isSoloCreation);

    const matterSubject = isInterpersonal
      ? subjectHouse === 1
        ? "the relationship or counterparty"
        : inferOtherPersonHouse(lower).label
      : explicitOverrides.topicHouse === 5
        ? "your creative work or project"
        : explicitOverrides.topicHouse === 10
          ? "your career or public standing"
          : explicitOverrides.topicHouse === 2
            ? "your finances or possessions"
            : explicitOverrides.topicHouse === 6
              ? "your daily work, craft, or wellbeing"
              : "the matter you asked about";

    return {
      subject: explicitOverrides.subject,
      subjectHouse,
      topicHouse: explicitOverrides.topicHouse,
      additionalHouses: [],
      matterSubject,
      intendedOutcome: q,
      questionType,
      isInterpersonal,
      reasoning: "Configured explicit house and subject selection.",
      source: "manual_override",
    };
  }

  // 1. Third-person questions (brother getting married, child getting into college, etc.)
  const thirdPersonFamilyMatch = /\b(my|our)\s+(brother|sister|sibling|child|son|daughter|kid|mother|mum|mom|father|dad|friend|partner|spouse|husband|wife|boyfriend|girlfriend|ex)\b/i.exec(lower);
  const isThirdPersonSubject =
    Boolean(thirdPersonFamilyMatch) &&
    !/\bwill we\b|\bare we\b|\bshould i\b|\bdoes my partner love me\b|\bdoes my ex\b/i.test(lower);

  if (isThirdPersonSubject && thirdPersonFamilyMatch) {
    const person = inferOtherPersonHouse(lower);
    let topicHouse = 1;
    let additionalHouses: number[] = [];
    let intendedOutcome = `the outlook for ${person.label}`;

    if (/\b(marry|married|marriage|wedding|engaged|relationship|partner|spouse)\b/i.test(lower)) {
      topicHouse = 7; // 7th from the turned person's house
      additionalHouses = [10, 4];
      intendedOutcome = `marriage or committed partnership for ${person.label}`;
    } else if (/\b(college|university|school|exam|degree|study|visa|travel)\b/i.test(lower)) {
      topicHouse = 9;
      additionalHouses = [10, 3];
      intendedOutcome = `higher education, admissions, or long-range plans for ${person.label}`;
    } else if (/\b(job|career|business|promotion|work|hired)\b/i.test(lower)) {
      topicHouse = 10;
      additionalHouses = [2, 6];
      intendedOutcome = `career or public standing for ${person.label}`;
    } else if (/\b(money|pay|raise|afford|debt|house|loan)\b/i.test(lower)) {
      topicHouse = 2;
      additionalHouses = [8];
      intendedOutcome = `financial standing for ${person.label}`;
    } else if (/\b(health|recover|surgery|illness|sick|wellbeing)\b/i.test(lower)) {
      topicHouse = 6;
      additionalHouses = [1, 8];
      intendedOutcome = `health and recovery for ${person.label}`;
    }

    return {
      subject: "other",
      subjectHouse: person.subjectHouse,
      topicHouse,
      additionalHouses,
      matterSubject: `${person.label} and their situation`,
      intendedOutcome,
      questionType,
      isInterpersonal: true,
      reasoning: `Turned-house question: ${person.label} is House ${person.subjectHouse}; the matter is House ${topicHouse} counted from House ${person.subjectHouse}.`,
      source: "heuristic",
    };
  }

  // 2. Missing / Lost objects (wallet, keys, ring, pet)
  if (MISSING_ITEM_RE.test(lower)) {
    const isPet = /\b(dog|cat|pet|puppy|kitten|bird)\b/i.test(lower);
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: isPet ? 6 : 2,
      additionalHouses: [4],
      matterSubject: isPet ? "your missing pet" : "your missing item or possession",
      intendedOutcome: "where the missing item is located and whether it is recovered",
      questionType,
      isInterpersonal: false,
      reasoning: isPet
        ? "Small animal or pet belongs to House 6; House 4 shows where it rests."
        : "Movable personal possession belongs to House 2; House 4 shows its resting place.",
      source: "heuristic",
    };
  }

  // 3. Applications & Approvals (loan, university, visa, job application, permit)
  if (APPROVAL_RE.test(lower) && !/\b(app|apps|software|astrology app)\b/i.test(lower)) {
    if (/\b(loan|mortgage|credit|grant|funding|settlement|claim)\b/i.test(lower)) {
      return {
        subject: "querent",
        subjectHouse: 1,
        topicHouse: 8,
        additionalHouses: [10, 2],
        matterSubject: "your funding or loan application",
        intendedOutcome: "whether another party's funds or credit will be approved",
        questionType,
        isInterpersonal: false,
        reasoning: "Borrowed funds, loans, and grants fall under House 8 with the approving authority in House 10.",
        source: "heuristic",
      };
    }
    if (/\b(college|university|school|grad|program|scholarship|visa|immigration|passport)\b/i.test(lower)) {
      return {
        subject: "querent",
        subjectHouse: 1,
        topicHouse: 9,
        additionalHouses: [10, 11],
        matterSubject: "your academic or travel application",
        intendedOutcome: "whether the application is accepted and approved",
        questionType,
        isInterpersonal: false,
        reasoning: "Higher education, visas, and official programs fall under House 9 with institutional approval in House 10.",
        source: "heuristic",
      };
    }
    if (/\b(job|role|position|hire|employment|internship)\b/i.test(lower)) {
      return {
        subject: "querent",
        subjectHouse: 1,
        topicHouse: 10,
        additionalHouses: [2, 6],
        matterSubject: "your job application",
        intendedOutcome: "whether the role is offered or approved",
        questionType,
        isInterpersonal: false,
        reasoning: "Employment and status fall under House 10, supported by income (House 2) and daily work (House 6).",
        source: "heuristic",
      };
    }
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: 10,
      additionalHouses: [11, 7],
      matterSubject: "your application and approval decision",
      intendedOutcome: "whether the reviewing authority approves the request",
      questionType,
      isInterpersonal: false,
      reasoning: "Formal decisions and authorities belong to House 10; hopes and outcomes to House 11.",
      source: "heuristic",
    };
  }

  // 4. Personal creative works, apps, projects (NOT interpersonal romance!)
  if (SOLO_CREATION_RE.test(lower) && !/\b(ex|partner|spouse|husband|wife|boyfriend|girlfriend|marriage|dating|love me)\b/i.test(lower)) {
    const mentionsTechOrComplete = /\b(app|software|tool|code|complete|finish|bug|build|technical|fix|preventing)\b/i.test(lower);
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: 5,
      additionalHouses: mentionsTechOrComplete ? [6, 10] : [10, 11],
      matterSubject: "your app or creative project",
      intendedOutcome:
        questionType === "open_explanatory"
          ? "what the project still needs for development, completion, and practical release"
          : "the prospects, obstacles, and completion path for your project",
      questionType,
      isInterpersonal: false,
      reasoning:
        "A work or application you are creating is a House 5 creation, paired with House 6 for technical craft/debugging and House 10 for public release and completion.",
      source: "heuristic",
    };
  }

  // 5. Business, entrepreneurship, career, job
  if (BUSINESS_RE.test(lower)) {
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: 10,
      additionalHouses: [2, 8, 11],
      matterSubject: "your business or venture",
      intendedOutcome: "whether the venture gains traction, profitability, and public standing",
      questionType,
      isInterpersonal: false,
      reasoning: "A business enterprise is House 10, evaluated with personal profit (House 2), outside capital/clients' money (House 8), and gains (House 11).",
      source: "heuristic",
    };
  }

  if (/\b(job|offer|career|role|position|hire|hired|promotion|interview|workplace)\b/i.test(lower)) {
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: 10,
      additionalHouses: [2, 6],
      matterSubject: "this job or career move",
      intendedOutcome: "whether the role materializes and how well it fits",
      questionType,
      isInterpersonal: false,
      reasoning: "Career and employment belong to House 10, supported by compensation (House 2) and day-to-day duties (House 6).",
      source: "heuristic",
    };
  }

  // 6. Love / relationship / partner directly involving querent & another party
  if (/\b(love|marry|marriage|ex|partner|spouse|husband|wife|boyfriend|girlfriend|crush|dating|relationship|reconcile|text me|call me|feel about me|come back|stay together|divorce)\b/i.test(lower)) {
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: 7,
      additionalHouses: [5, 11],
      matterSubject: "this relationship or connection",
      intendedOutcome: "the dynamic, mutual willingness, and trajectory between you and the other person",
      questionType,
      isInterpersonal: true,
      reasoning: "Romantic and committed one-to-one relationships compare the querent (House 1) with the partner (House 7).",
      source: "heuristic",
    };
  }

  // 7. Financial / money / pricing / purchase / debt
  if (/\b(money|income|pay|salary|price|worth|sell|buy|invest|stock|crypto|profit|revenue|debt|owe|afford)\b/i.test(lower)) {
    const isDebtOrShared = /\b(debt|owe|tax|loan|inheritance|shared|partner'?s money|investor)\b/i.test(lower);
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: isDebtOrShared ? 8 : 2,
      additionalHouses: isDebtOrShared ? [2, 10] : [10, 11],
      matterSubject: isDebtOrShared ? "shared obligations, debt, or outside money" : "your personal finances and resources",
      intendedOutcome: "material sustainability, income flow, and financial outcome",
      questionType,
      isInterpersonal: false,
      reasoning: isDebtOrShared
        ? "Debt and external money belong to House 8 alongside personal resources (House 2)."
        : "Personal income, resources, and financial stability belong to House 2.",
      source: "heuristic",
    };
  }

  // 8. Home / move / real estate / family
  if (/\b(house|apartment|home|move|moving|relocate|relocation|lease|rent|property|landlord|roommate|family)\b/i.test(lower)) {
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: 4,
      additionalHouses: [7, 2],
      matterSubject: "your home, property, or relocation",
      intendedOutcome: "stability and outcome around your living situation or property",
      questionType,
      isInterpersonal: /\b(landlord|roommate|family)\b/i.test(lower),
      reasoning: "Homes, real estate, and domestic foundations belong to House 4.",
      source: "heuristic",
    };
  }

  // 9. Study / publishing / travel / legal
  if (/\b(school|college|university|exam|test|study|degree|publish|publishing|book|legal|lawsuit|court|travel|trip|flight|visa)\b/i.test(lower)) {
    const isLegalOpponent = /\b(lawsuit|court|trial|sue|suing|opponent)\b/i.test(lower);
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: isLegalOpponent ? 7 : 9,
      additionalHouses: [10, 3],
      matterSubject: isLegalOpponent ? "this legal dispute or contest" : "study, travel, or publishing",
      intendedOutcome: "whether the effort succeeds and what factors govern the outcome",
      questionType,
      isInterpersonal: isLegalOpponent,
      reasoning: isLegalOpponent
        ? "Contested lawsuits compare House 1 (querent) against House 7 (opponent) and House 10 (judge/verdict)."
        : "Higher education, long journeys, publishing, and law belong to House 9.",
      source: "heuristic",
    };
  }

  // 10. Health / daily work routines
  if (/\b(health|ill|sick|doctor|surgery|pain|sleep|stress|diet|workout|routine|habit)\b/i.test(lower)) {
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: 6,
      additionalHouses: [1, 12],
      matterSubject: "your physical wellbeing and daily habits",
      intendedOutcome: "what helps restore balance and steadiness",
      questionType,
      isInterpersonal: false,
      reasoning: "Daily health conditions and routines are governed by House 6 alongside personal vitality (House 1).",
      source: "heuristic",
    };
  }

  // 11. Friendships / groups / audience
  if (/\b(friend|friends|audience|community|followers|subscribers|group|network|club|organization)\b/i.test(lower)) {
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: 11,
      additionalHouses: [5, 10],
      matterSubject: "your community, friends, or audience support",
      intendedOutcome: "alliance, reception, and support around your aims",
      questionType,
      isInterpersonal: /\bfriends?\b/i.test(lower),
      reasoning: "Friendships, groups, audiences, and hopes belong to House 11.",
      source: "heuristic",
    };
  }

  // 12. Private / hidden matters
  if (/\b(secret|hidden|behind my back|anxiety|isolate|isolation|sabotage)\b/i.test(lower)) {
    return {
      subject: "querent",
      subjectHouse: 1,
      topicHouse: 12,
      additionalHouses: [1, 6],
      matterSubject: "hidden pressures or private matters",
      intendedOutcome: "what is operating quietly behind the scenes",
      questionType,
      isInterpersonal: false,
      reasoning: "Hidden constraints and private burdens fall under House 12.",
      source: "heuristic",
    };
  }

  // Safe default for open personal direction ("what should I focus on next?") -> House 10 / 1, NEVER House 7 romance!
  return {
    subject: "querent",
    subjectHouse: 1,
    topicHouse: /\bwhat|how|why\b/i.test(lower) ? 10 : 1,
    additionalHouses: [2, 6],
    matterSubject: "your direction and the matter you asked about",
    intendedOutcome: "clarity on what is active, what supports progress, and what deserves attention next",
    questionType,
    isInterpersonal: false,
    reasoning: "General personal-direction inquiry evaluated through the querent (House 1) and active direction/outcome (House 10) without assuming an unstated third party.",
    source: "heuristic",
  };
}

/**
 * Step 1 of Horary consultation: understand the natural-language question BEFORE casting
 * or interpreting the chart. Uses the AI analyzer when configured, with deterministic
 * traditional house-assignment guardrails so solo/creation questions never fall back to House 7.
 */
export async function analyzeHoraryQuestionWithAI(
  question: string
): Promise<HoraryQuestionAnalysis> {
  const heuristic = analyzeHoraryQuestionHeuristic(question);

  const hasProvider = Boolean(
    ENV.groqApiKey ||
      ENV.geminiApiKey ||
      ENV.anthropicApiKey ||
      (ENV.openaiApiKey && ENV.openaiApiBase) ||
      ENV.forgeApiKey
  );
  if (!hasProvider) {
    return heuristic;
  }

  const systemPrompt = `You are a master traditional horary astrologer preparing to cast a question chart.
Your job right now is ONLY Step 1: analyze the user's question BEFORE any chart is calculated.

Traditional Horary House Assignment Rules:
- House 1: The querent (asker), their body, life, self-direction.
- House 2: Personal money, income, movable possessions (lost wallet, keys), self-worth.
- House 3: Siblings (brother/sister), neighbors, short trips, contracts/messages, everyday writing.
- House 4: Home, property, real estate, parents (mother/family roots), hidden treasure, the final end of any matter.
- House 5: The querent's own creations (apps, software, art, books, channels, projects), children, romance/pleasure.
- House 6: Technical work, debugging, labor, daily routines, employees, illness/pets.
- House 7: Romantic partners, spouses, business partners, open opponents, another specific unnamed party. NEVER use House 7 unless the question genuinely involves another person, partner, or counterpart!
- House 8: Shared money, debt, loans, grants, taxes, another person's resources.
- House 9: Higher education, college, visas, long journeys, publishing, legal/philosophical matters.
- House 10: Career, jobs, business success, bosses/judges/authorities, public reputation, public completion/launch.
- House 11: Friends, audiences, supporters, communities, hopes and gains from House 10.
- House 12: Private matters, hidden blocks, isolation, self-undoing.

Turned House Rule:
- Only set subject = "other" when the question is specifically ABOUT someone else's outcome (e.g., "Will my brother get married?" -> subject="other", subjectHouse=3, topicHouse=7 [turned 7th from 3rd]; "Will my child get into college?" -> subject="other", subjectHouse=5, topicHouse=9).
- When the querent asks about their OWN job, app, project, wallet, approval, or business, ALWAYS set subject="querent", subjectHouse=1.
- Never invent a romantic partner or interpersonal conflict for questions about apps, tools, projects, jobs, money, or lost items.
- Classify questionType accurately: "what", "why", "how" questions are "open_explanatory" (not "yes_no").

Return STRICT JSON matching:
{
  "subject": "querent" | "other",
  "subjectHouse": 1..12,
  "topicHouse": 1..12,
  "additionalHouses": [up to 3 relevant houses 1..12],
  "matterSubject": "short natural description of who/what the question is about",
  "intendedOutcome": "what the user wants to know or resolve",
  "questionType": "yes_no" | "open_explanatory" | "timing" | "location" | "comparison",
  "isInterpersonal": true | false,
  "reasoning": "one concise sentence explaining why these houses govern this question"
}`;

  try {
    const response = await invokeLLM({
      maxTokens: 500,
      timeoutMs: 12_000,
      responseFormat: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this horary question: "${question.trim()}"` },
      ],
    });
    const rawContent = response.choices?.[0]?.message?.content;
    const text =
      typeof rawContent === "string"
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent.map(p => ("text" in p ? p.text : "")).join("")
          : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return heuristic;

    const parsed = analysisSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) return heuristic;

    const ai = parsed.data;
    // Guardrail: never allow the analyzer to misclassify a non-human solo creation/project/object into a House 7 romance/interpersonal reading.
    if (!heuristic.isInterpersonal && (ai.isInterpersonal || ai.topicHouse === 7 || ai.subject === "other") && SOLO_CREATION_RE.test(question)) {
      return heuristic;
    }

    return {
      subject: ai.subject,
      subjectHouse: ai.subject === "querent" ? 1 : ai.subjectHouse,
      topicHouse: ai.topicHouse,
      additionalHouses: Array.from(new Set(ai.additionalHouses.filter(h => h !== ai.topicHouse))).slice(0, 3),
      matterSubject: ai.matterSubject,
      intendedOutcome: ai.intendedOutcome,
      questionType: ai.questionType,
      isInterpersonal: ai.isInterpersonal,
      reasoning: ai.reasoning,
      source: "ai",
    };
  } catch {
    return heuristic;
  }
}
