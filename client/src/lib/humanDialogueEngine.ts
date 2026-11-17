// Human-to-Human Resonance Dialogue Engine
// Translates transit-to-natal aspects into distinct, chart-anchored everyday insights.
// Eliminates generic template cloning by anchoring each contact to its actual Houses, Signs,
// retrograde status, orb precision, and distinct life-domain behavior.

import type { ChartResult } from "../../../server/astronomy";
import { normalizeLongitude, ZODIAC_SIGNS } from "../../../shared/hybrid";

function signFromLongitude(longitude?: number): string | undefined {
  if (typeof longitude !== "number" || Number.isNaN(longitude)) return undefined;
  return ZODIAC_SIGNS[Math.floor(normalizeLongitude(longitude) / 30) % 12];
}

export interface DialogueChartContext {
  transitSign?: string;
  transitHouse?: number;
  transitRetrograde?: boolean;
  natalSign?: string;
  natalHouse?: number;
  natalRetrograde?: boolean;
}

export interface HumanAspectDialogue {
  everydayTitle: string;
  tagline: string;
  freshSignal: string;
  houseBridgeLabel: string;
  feelingInBodyAndMind: string;
  workAndMoney: string;
  relationshipsAndPeople: string;
  bestMoveToday: string;
  trapToAvoid: string;
  isMajor: boolean;
  impactExplanation: string;
}

type AspectKind =
  | "conjunction"
  | "trine"
  | "sextile"
  | "semisextile"
  | "square"
  | "opposition"
  | "semisquare"
  | "quincunx";

interface TransitActorSpec {
  shortLabel: string;
  flowVerb: string;
  frictionVerb: string;
  bodyMindFlow: string;
  bodyMindFriction: string;
  workFlow: string;
  workFriction: string;
  socialFlow: string;
  socialFriction: string;
  bestMoveFlow: string;
  bestMoveFriction: string;
  trapFlow: string;
  trapFriction: string;
}

interface NatalReceptorSpec {
  domain: string;
  personalTrait: string;
  workArena: string;
  relationshipArena: string;
  sensitiveSpot: string;
  strengthAnchor: string;
}

const HOUSE_REAL_LIFE: Record<
  number,
  { arena: string; actionFocus: string; socialFocus: string }
> = {
  1: {
    arena: "your physical energy, mood, and first impression",
    actionFocus: "self-pacing and personal initiative",
    socialFocus: "how directly you come across the moment you enter a room",
  },
  2: {
    arena: "cash flow, pricing, and what you value",
    actionFocus: "money habits, budgeting, and pricing decisions",
    socialFocus: "fair exchange and standing firm on what your time costs",
  },
  3: {
    arena: "messages, errands, calls, and day-to-day logistics",
    actionFocus: "emails, short-trip coordination, and clear phrasing",
    socialFocus: "quick texts, sibling or neighbor talks, and tone checks",
  },
  4: {
    arena: "home, family routines, and private recharge",
    actionFocus: "household repairs, family logistics, and quiet grounding",
    socialFocus: "home boundaries and closeness with family or inner circle",
  },
  5: {
    arena: "creative expression, dating, kids, and genuine fun",
    actionFocus: "creative momentum, calculated bets, and playful focus",
    socialFocus: "romantic spark, warmth, and sharing unguarded enthusiasm",
  },
  6: {
    arena: "daily workload, routines, health habits, and chores",
    actionFocus: "task lists, physical maintenance, and workflow cleanup",
    socialFocus: "coworker handoffs and practical favors without resentment",
  },
  7: {
    arena: "partnerships, client deals, and one-on-one agreements",
    actionFocus: "contract terms, joint plans, and meeting halfway",
    socialFocus: "your spouse, business partner, or direct counterpart across the table",
  },
  8: {
    arena: "shared finances, deep trust, taxes, and high-stakes resets",
    actionFocus: "shared debts, investments, and clearing hidden bottlenecks",
    socialFocus: "vulnerability, loyalty, and unspoken expectations around control",
  },
  9: {
    arena: "big-picture strategy, travel, study, and core convictions",
    actionFocus: "long-range planning, publishing, legal review, or learning",
    socialFocus: "honest debate over beliefs, mentors, and broader horizons",
  },
  10: {
    arena: "career reputation, authority, and visible deliverables",
    actionFocus: "executive decisions, public results, and leadership accountability",
    socialFocus: "managers, clients, and how people judge your reliability",
  },
  11: {
    arena: "friends, teams, audience reach, and future goals",
    actionFocus: "group collaboration, networking, and longer-term income aims",
    socialFocus: "allies, community circles, and shared future aims",
  },
  12: {
    arena: "sleep, behind-the-scenes work, and private stress relief",
    actionFocus: "solo deep work, rest recovery, and wrapping loose threads quietly",
    socialFocus: "protecting solitude and spotting quiet burnout before snapping",
  },
};

const SIGN_BEHAVIOR: Record<string, string> = {
  Aries: "fast, blunt, and eager to act immediately",
  Taurus: "steady, tactile, and unwilling to rush comfort or money",
  Gemini: "quick-talking, curious, and juggling multiple angles",
  Cancer: "protective, intuitive, and sensitive to emotional tone",
  Leo: "expressive, proud, and wanting visible recognition",
  Virgo: "detail-focused, practical, and quick to spot flaws",
  Libra: "diplomatic, fairness-driven, and weighing both sides",
  Scorpio: "intense, observant, and allergic to half-truths",
  Sagittarius: "candid, restless, and focused on the wider horizon",
  Capricorn: "structured, disciplined, and strict about real results",
  Aquarius: "independent, objective, and drawn to smarter systems",
  Pisces: "receptive, imaginative, and tuned in to subtle undercurrents",
};

const ASPECT_TONE: Record<
  AspectKind,
  {
    label: string;
    isHarmonious: boolean;
    orbAction: string;
    titleVerbsFlow: string[];
    titleVerbsFriction: string[];
  }
> = {
  conjunction: {
    label: "Conjunction",
    isHarmonious: true,
    orbAction: "concentrates energy into a direct spotlight",
    titleVerbsFlow: ["Focuses", "Amplifies", "Locks In"],
    titleVerbsFriction: ["Intensifies", "Triggers", "Concentrates"],
  },
  trine: {
    label: "Trine",
    isHarmonious: true,
    orbAction: "opens an unobstructed lane with natural momentum",
    titleVerbsFlow: ["Streams Into", "Unlocks", "Supports"],
    titleVerbsFriction: ["Eases", "Smooths", "Supports"],
  },
  sextile: {
    label: "Sextile",
    isHarmonious: true,
    orbAction: "offers a practical opening right after you take initiative",
    titleVerbsFlow: ["Opens an Invitation for", "Connects With", "Sparks"],
    titleVerbsFriction: ["Invites", "Bridges", "Sparks"],
  },
  semisextile: {
    label: "Semisextile",
    isHarmonious: true,
    orbAction: "nudges two adjacent habits to sync up cleanly",
    titleVerbsFlow: ["Fine-Tunes", "Nudges", "Syncs"],
    titleVerbsFriction: ["Adjusts", "Taps", "Links"],
  },
  square: {
    label: "Square",
    isHarmonious: false,
    orbAction: "forces a concrete choice where two priorities collide",
    titleVerbsFlow: ["Sharpens", "Drives", "Tests"],
    titleVerbsFriction: ["Pressures", "Challenges", "Forces a Call On"],
  },
  opposition: {
    label: "Opposition",
    isHarmonious: false,
    orbAction: "mirrors a push-pull across another person or deadline",
    titleVerbsFlow: ["Balances", "Mirrors", "Weighs"],
    titleVerbsFriction: ["Pulls Against", "Splits Focus On", "Confronts"],
  },
  semisquare: {
    label: "Semisquare",
    isHarmonious: false,
    orbAction: "creates a small scheduling or tone snag worth fixing early",
    titleVerbsFlow: ["Prods", "Adjusts", "Polishes"],
    titleVerbsFriction: ["Snags", "Prickles", "Irritates"],
  },
  quincunx: {
    label: "Quincunx",
    isHarmonious: false,
    orbAction: "asks you to adapt an old habit that doesn't quite fit today",
    titleVerbsFlow: ["Reroutes", "Rebalances", "Pivots"],
    titleVerbsFriction: ["Misfires With", "Forces a Pivot On", "Scrambles"],
  },
};

const TRANSIT_ACTORS: Record<string, TransitActorSpec> = {
  Sun: {
    shortLabel: "Spotlight",
    flowVerb: "brings clear visibility",
    frictionVerb: "puts ego pressure",
    bodyMindFlow: "Mental fog clears around what actually deserves your daylight hours.",
    bodyMindFriction: "Pride runs closer to the surface, making small delays feel personal.",
    workFlow: "Approve priorities cleanly and take direct ownership in front of decision-makers.",
    workFriction: "Keep focus on measurable output instead of competing for credit.",
    socialFlow: "Warm, confident presence invites straightforward agreement.",
    socialFriction: "Avoid treating constructive critique like a personal challenge.",
    bestMoveFlow: "Put your main priority on the board while confidence is clean.",
    bestMoveFriction: "Detach your self-worth from one temporary disagreement.",
    trapFlow: "Assuming people read your mind without stating next steps.",
    trapFriction: "Doubling down out of pride when a five-second adjustment solves it.",
  },
  Moon: {
    shortLabel: "Mood Radar",
    flowVerb: "syncs gut timing",
    frictionVerb: "stirs touchy reactions",
    bodyMindFlow: "Nervous system and appetite settle easily into an intuitive rhythm.",
    bodyMindFriction: "Physical fatigue or noise turns minor delays into quick mood swings.",
    workFlow: "Read the room accurately before pitching or adjusting schedules.",
    workFriction: "Handle steady routine tasks rather than making permanent career calls.",
    socialFlow: "Natural warmth puts close contacts and family at ease.",
    socialFriction: "Re-read terse messages with fresh eyes before assuming coldness.",
    bestMoveFlow: "Match demanding work to your natural peak window today.",
    bestMoveFriction: "Hydrate, eat well, and pause ten minutes before replying while tired.",
    trapFlow: "Staying inside familiar comfort instead of taking a clean small step.",
    trapFriction: "Treating a passing two-hour mood dip like a permanent truth.",
  },
  Mercury: {
    shortLabel: "Messages",
    flowVerb: "sharpens wording and logistics",
    frictionVerb: "scrambles schedules and tone",
    bodyMindFlow: "Ideas snap together quickly and plain words come easily.",
    bodyMindFriction: "Thoughts outrun patience, making skimming and missed details likely.",
    workFlow: "Clear proposals, tight emails, pricing terms, and scheduling blocks.",
    workFriction: "Double-check numbers, calendar links, and recipient fields before sending.",
    socialFlow: "Quick banter and direct check-ins clear stale misunderstandings.",
    socialFriction: "Interrupting or over-explaining escalates minor phrasing friction.",
    bestMoveFlow: "Send the concise note or map the checklist while mental bandwidth is crisp.",
    bestMoveFriction: "Verify assumptions with one plain question before debating.",
    trapFlow: "Jumping three steps ahead before listeners catch up.",
    trapFriction: "Firing off a reactive email purely to win an argument.",
  },
  Venus: {
    shortLabel: "Rapport & Value",
    flowVerb: "smooths tone and value sense",
    frictionVerb: "tests fairness and spending",
    bodyMindFlow: "You feel more grounded, appreciative, and receptive to quality.",
    bodyMindFriction: "Temptation rises to buy quick comfort or avoid awkward honesty.",
    workFlow: "Smooth client negotiations, refine presentation, and price work fairly.",
    workFriction: "Skip impulse expenses and avoid undercharging just to keep peace.",
    socialFlow: "Shared meals, appreciation, and calm warmth thaw awkward gaps.",
    socialFriction: "Don't swallow annoyance silently and expect others to guess why.",
    bestMoveFlow: "Invest quality attention in one valued relationship or workspace upgrade.",
    bestMoveFriction: "Separate genuine value from short-term boredom before spending or agreeing.",
    trapFlow: "Dropping key chores because easy socializing feels nicer.",
    trapFriction: "Saying yes politely and resenting the obligation later.",
  },
  Mars: {
    shortLabel: "Drive & Edge",
    flowVerb: "fuels decisive momentum",
    frictionVerb: "spikes impatience and pushback",
    bodyMindFlow: "Energy converts straight into clean physical stamina and initiative.",
    bodyMindFriction: "Adrenaline sits high, making slow tools or hesitant people grating.",
    workFlow: "Attack the toughest bottleneck first and keep deliverables moving.",
    workFriction: "Burn urgency on solo execution rather than sharp replies.",
    socialFlow: "Direct candor clears stale tension and energizes joint action.",
    socialFriction: "Soften your opening line so efficiency doesn't land as hostility.",
    bestMoveFlow: "Move a stalled task from discussion into finished work right now.",
    bestMoveFriction: "Take a brisk physical break before tackling a touchy conversation.",
    trapFlow: "Stacking too many sprints and burning out mid-afternoon.",
    trapFriction: "Turning a minor scheduling hiccup into a turf battle.",
  },
  Jupiter: {
    shortLabel: "Scope & Timing",
    flowVerb: "widens options cleanly",
    frictionVerb: "stretches bandwidth thin",
    bodyMindFlow: "Zooming out makes cramped problems look genuinely solvable.",
    bodyMindFriction: "Restless hunger for bigger wins makes basic maintenance feel dull.",
    workFlow: "Pitch larger scope, consult advisors, and plan quarter-level moves.",
    workFriction: "Add a 20% time and cost buffer before signing off on ambitious plans.",
    socialFlow: "Humor, generosity, and shared optimism pull people onto the same side.",
    socialFriction: "Avoid promising extra favors that crowd next week's real calendar.",
    bestMoveFlow: "Take one credible stretch conversation that widens your reach.",
    bestMoveFriction: "Check the operational math underneath an appealing offer.",
    trapFlow: "Assuming enthusiasm covers missing small operational checks.",
    trapFriction: "Spending or promising against best-case guesses instead of facts.",
  },
  Saturn: {
    shortLabel: "Structure",
    flowVerb: "steadies practical follow-through",
    frictionVerb: "tightens deadlines and limits",
    bodyMindFlow: "Calm endurance helps you finish serious work without drama.",
    bodyMindFriction: "Fatigue exposes thin margins or nagging self-criticism.",
    workFlow: "Audit budgets, tighten workflows, and lock in reliable commitments.",
    workFriction: "Treat a slow rule or delay as engineering feedback, not failure.",
    socialFlow: "Steady dependability builds deeper respect than flashy talk.",
    socialFriction: "Let close people know you're heads-down so focus isn't misread as cold.",
    bestMoveFlow: "Finish one structural chore that simplifies the entire month.",
    bestMoveFriction: "Trim non-essential duties and pace one heavy obligation realistically.",
    trapFlow: "Expecting everyone around you to run at strict executive speed.",
    trapFriction: "Mistaking gradual progress for a dead end.",
  },
  Uranus: {
    shortLabel: "Shake-Up",
    flowVerb: "sparks clean shortcuts",
    frictionVerb: "jolts stiff routines",
    bodyMindFlow: "Fresh pattern recognition breaks stale mental loops quickly.",
    bodyMindFriction: "Restless static makes repetitive meetings or rigid rules exhausting.",
    workFlow: "Test smarter automation, modernize workflows, and drop clumsy steps.",
    workFriction: "Save backups and keep 20% slack for sudden calendar pivots.",
    socialFlow: "Candid, unconventional honesty clicks with independent thinkers.",
    socialFriction: "Avoid flipping plans abruptly just to assert autonomy.",
    bestMoveFlow: "Test one unconventional tool or clean shortcut on a recurring task.",
    bestMoveFriction: "Leave flexible margin so unexpected curveballs stay low-stress.",
    trapFlow: "Changing five moving parts before collaborators catch up.",
    trapFriction: "Walking away from a solid plan purely out of passing restlessness.",
  },
  Neptune: {
    shortLabel: "Radar & Fog",
    flowVerb: "heightens creative intuition",
    frictionVerb: "blurs expectations and energy",
    bodyMindFlow: "Visual focus and quiet intuition clarify subtle people dynamics.",
    bodyMindFriction: "Brain fog and noise sensitivity drain stamina faster than normal.",
    workFlow: "Lean into design, storytelling, strategy framing, and reading nuance.",
    workFriction: "Confirm verbal promises in writing and verify concrete numbers.",
    socialFlow: "Quiet, attentive listening opens doors heavy logic misses.",
    socialFriction: "Fact-check your gut before absorbing someone else's stress.",
    bestMoveFlow: "Guard 30 quiet minutes away from alerts for creative synthesis.",
    bestMoveFriction: "Ask for specific examples and dates wherever plans sound vague.",
    trapFlow: "Letting timelines drift while absorbed in big-picture ideas.",
    trapFriction: "Ignoring a clear warning cue because you want peace.",
  },
  Pluto: {
    shortLabel: "Root Focus",
    flowVerb: "cuts straight to real leverage",
    frictionVerb: "triggers control standoffs",
    bodyMindFlow: "Laser focus strips away distractions so you handle root causes cleanly.",
    bodyMindFriction: "Ruminating on one unresolved issue burns mental bandwidth fast.",
    workFlow: "Cut dead weight, audit weak links, and negotiate from verified facts.",
    workFriction: "Notice where tight micromanaging creates pushback instead of safety.",
    socialFlow: "Candid truth-telling dissolves quiet resentment and deepens loyalty.",
    socialFriction: "Skip silent scorekeeping—say clearly what boundary you need.",
    bestMoveFlow: "Eliminate one draining habit, cost, or bottleneck permanently.",
    bestMoveFriction: "Focus on holding your own line calmly instead of managing others' reactions.",
    trapFlow: "Bringing heavy intensity to a light, casual conversation.",
    trapFriction: "Refusing to release a small slight until it turns into a standoff.",
  },
  "North Node": {
    shortLabel: "Growth Pull",
    flowVerb: "nudges fresh capability",
    frictionVerb: "stretches comfort scripts",
    bodyMindFlow: "Unfamiliar next-chapter steps feel energizing once started.",
    bodyMindFriction: "Stepping past safe habits brings mild self-consciousness.",
    workFlow: "Say yes to forward-looking projects, new peers, or modern tools.",
    workFriction: "Spot where clinging to 'how I always did it' slows growth.",
    socialFlow: "New contacts or mentors drop useful clues about your next stage.",
    socialFriction: "Outgrowing an old dynamic feels awkward—stay gracious without shrinking.",
    bestMoveFlow: "Take one unfamiliar step tied to where you want to be in six months.",
    bestMoveFriction: "Choose one small stretch action over safe busywork today.",
    trapFlow: "Chasing fresh plans while leaving current basics unfinished.",
    trapFriction: "Confusing natural stretch awkwardness with doing the wrong thing.",
  },
  "South Node": {
    shortLabel: "Autopilot Loop",
    flowVerb: "unlocks seasoned instincts",
    frictionVerb: "pulls toward stale habits",
    bodyMindFlow: "Tested muscle memory keeps everyday logistics steady.",
    bodyMindFriction: "Fatigue tempts retreating into familiar coping scripts that no longer fit.",
    workFlow: "Close lingering backlog using proven practical experience.",
    workFriction: "Notice where an old workaround keeps masking a real problem.",
    socialFlow: "Familiar faces bring warm closure or effortless shorthand.",
    socialFriction: "Old recurring pet peeves replay unless one person shifts the tone.",
    bestMoveFlow: "Apply one hard-won past lesson to simplify today's workload cleanly.",
    bestMoveFriction: "Catch one stress autopilot habit and pick the updated response deliberately.",
    trapFlow: "Coasting inside familiar comfort zones you've already outgrown.",
    trapFriction: "Rehashing old history instead of answering today's actual question.",
  },
};

const NATAL_RECEPTORS: Record<string, NatalReceptorSpec> = {
  Sun: {
    domain: "confidence, core goals, and personal pride",
    personalTrait: "core direction",
    workArena: "flagship priorities and leadership",
    relationshipArena: "mutual respect",
    sensitiveSpot: "feeling sidelined or boxed in",
    strengthAnchor: "clear self-direction",
  },
  Moon: {
    domain: "mood balance, gut comfort, and home rhythm",
    personalTrait: "emotional rhythm",
    workArena: "day-to-day focus and team morale",
    relationshipArena: "closeness and emotional safety",
    sensitiveSpot: "feeling brushed off or drained",
    strengthAnchor: "steady gut awareness",
  },
  Mercury: {
    domain: "thinking speed, wording, and daily plans",
    personalTrait: "mental wiring",
    workArena: "emails, calls, and coordination",
    relationshipArena: "listening and clear explanation",
    sensitiveSpot: "overthinking or feeling misquoted",
    strengthAnchor: "crisp phrasing",
  },
  Venus: {
    domain: "affection, spending taste, and harmony",
    personalTrait: "value and rapport style",
    workArena: "client trust and pricing sense",
    relationshipArena: "warmth, romance, and fairness",
    sensitiveSpot: "unspoken resentment over fairness",
    strengthAnchor: "calm diplomacy",
  },
  Mars: {
    domain: "drive, pushback, and physical stamina",
    personalTrait: "action tempo",
    workArena: "deadlines and bold execution",
    relationshipArena: "directness and boundaries",
    sensitiveSpot: "feeling blocked or micromanaged",
    strengthAnchor: "clean initiative",
  },
  Jupiter: {
    domain: "ambition, optimism, and risk appetite",
    personalTrait: "big-picture instinct",
    workArena: "growth bets and strategy",
    relationshipArena: "generosity and shared future plans",
    sensitiveSpot: "feeling fenced in or overextending",
    strengthAnchor: "sound perspective",
  },
  Saturn: {
    domain: "discipline, workload, and boundaries",
    personalTrait: "structural backbone",
    workArena: "budgets, standards, and long-term duties",
    relationshipArena: "loyalty and firm commitments",
    sensitiveSpot: "self-criticism or carrying too much solo",
    strengthAnchor: "patient execution",
  },
  Uranus: {
    domain: "autonomy, originality, and breathing room",
    personalTrait: "independent streak",
    workArena: "innovation and flexible systems",
    relationshipArena: "honest space and individuality",
    sensitiveSpot: "feeling trapped in rigid routines",
    strengthAnchor: "inventive problem-solving",
  },
  Neptune: {
    domain: "imagination, empathy, and sensitivity",
    personalTrait: "intuitive radar",
    workArena: "creative framing and subtle cues",
    relationshipArena: "compassion and clean boundaries",
    sensitiveSpot: "blurred lines or absorbing others' stress",
    strengthAnchor: "calm empathy",
  },
  Pluto: {
    domain: "willpower, privacy, and trust",
    personalTrait: "deep resolve",
    workArena: "high-stakes fixes and leverage",
    relationshipArena: "candor and power balance",
    sensitiveSpot: "guardedness or power friction",
    strengthAnchor: "unshakable grit",
  },
  "North Node": {
    domain: "next-chapter growth and unfamiliar skills",
    personalTrait: "forward growth edge",
    workArena: "stretch projects outside old habits",
    relationshipArena: "connections pulling you forward",
    sensitiveSpot: "uncertainty while stepping up",
    strengthAnchor: "steady adaptability",
  },
  "South Node": {
    domain: "default habits and tested fallback skills",
    personalTrait: "automatic fallback style",
    workArena: "seasoned routines",
    relationshipArena: "familiar relationship scripts",
    sensitiveSpot: "falling back into stale defenses",
    strengthAnchor: "hard-won practical know-how",
  },
  Ascendant: {
    domain: "first impressions, body tension, and instant reactions",
    personalTrait: "outward demeanor",
    workArena: "how rooms read you right away",
    relationshipArena: "your immediate reaction when approached",
    sensitiveSpot: "feeling put on the spot",
    strengthAnchor: "grounded presence",
  },
  Descendant: {
    domain: "one-on-one partnerships and agreements",
    personalTrait: "partnership negotiation style",
    workArena: "contracts, clients, and co-founders",
    relationshipArena: "give-and-take with close partners",
    sensitiveSpot: "thrown off balance by another person's demands",
    strengthAnchor: "fair partnership balance",
  },
};

function getOrbUrgencyLabel(orb: number): string {
  if (orb <= 0.35) return "Peak right now";
  if (orb <= 1.25) return "Sharp active pulse";
  if (orb <= 2.75) return "Steady influence";
  return "Light background drift";
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Extracts live & natal house, sign, and retrograde metadata for a transit->natal contact
 * directly from ChartResult so every card speaks to this specific person's chart.
 */
export function buildDialogueContext(
  chart: ChartResult | null | undefined,
  transitName: string,
  natalName: string
): DialogueChartContext | undefined {
  if (!chart) return undefined;
  const transitRow = chart.transits?.find((t) => t.name === transitName);
  const natalRow =
    chart.movingBodies?.find((b) => b.name === natalName) ||
    (natalName === "Ascendant" ? chart.ascendant : undefined) ||
    (natalName === "Descendant" ? chart.descendant : undefined) ||
    (natalName === "North Node" ? chart.northNode : undefined) ||
    (natalName === "South Node" ? chart.southNode : undefined);

  if (!transitRow && !natalRow) return undefined;
  const isGod = chart.worldview === "god";

  return {
    transitSign: signFromLongitude(transitRow?.longitude),
    transitHouse: transitRow
      ? isGod
        ? transitRow.godHouse ?? transitRow.house
        : transitRow.agentHouse ?? transitRow.house
      : undefined,
    transitRetrograde: transitRow?.retrograde,
    natalSign: signFromLongitude(natalRow?.longitude),
    natalHouse: natalRow
      ? isGod
        ? natalRow.godHouse ?? natalRow.house
        : natalRow.agentHouse ?? natalRow.house
      : undefined,
    natalRetrograde: natalRow?.retrograde,
  };
}

interface SpecificCore {
  titleFlow: string;
  titleFriction: string;
  taglineFlow: string;
  taglineFriction: string;
  feelFlow: string;
  feelFriction: string;
  workFlow: string;
  workFriction: string;
  loveFlow: string;
  loveFriction: string;
  moveFlow: string;
  moveFriction: string;
  trapFlow: string;
  trapFriction: string;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

const PAIR_CORES: Record<string, SpecificCore> = {
  [pairKey("Sun", "Moon")]: {
    titleFlow: "Head & Gut on the Same Page",
    titleFriction: "Drive vs. Emotional Battery",
    taglineFlow: "Practical plans match your real mood instead of fighting each other.",
    taglineFriction: "Part of you wants to push forward while another part feels drained or guarded.",
    feelFlow: "Steady in your own skin—decisions don't trigger inner second-guessing.",
    feelFriction: "Tug between ambition and fatigue makes simple choices feel heavier.",
    workFlow: "Present your point of view or lock in a personal priority with clean conviction.",
    workFriction: "Stick to steady tasks today and sleep on permanent career shifts.",
    loveFlow: "Warm check-ins with partners or family land without defensiveness.",
    loveFriction: "Check your tiredness before reading a short remark as personal.",
    moveFlow: "Act on one clear priority while focus and mood agree.",
    moveFriction: "Respect what is draining your battery instead of forcing fake momentum.",
    trapFlow: "Assuming others share your clarity without spelling it out.",
    trapFriction: "Making a permanent decision inside a temporary tired mood.",
  },
  [pairKey("Sun", "Mars")]: {
    titleFlow: "Clean Drive & Follow-Through",
    titleFriction: "Short Fuse & Ego Pushback",
    taglineFlow: "Vitality converts straight into action—less hesitation, more finished output.",
    taglineFriction: "Urges to rush, butt heads over control, or snap at slow progress.",
    feelFlow: "Physically awake and decisive; tough tasks look solvable.",
    feelFriction: "Adrenaline sits close to the surface, magnifying minor delays.",
    workFlow: "Tackle tough calls, pitches, or demanding deliverables early.",
    workFriction: "Pour intensity into solo execution and skip reactive replies.",
    loveFlow: "Direct, playful energy favors active plans and candid talk.",
    loveFriction: "Simple bluntness can land like picking a fight—soften the opening.",
    moveFlow: "Start the hardest item you postponed while stamina runs clean.",
    moveFriction: "Take a five-minute physical reset before answering an annoying message.",
    trapFlow: "Overloading your afternoon schedule because morning energy feels high.",
    trapFriction: "Winning a petty ego point and paying for the fallout later.",
  },
  [pairKey("Sun", "Jupiter")]: {
    titleFlow: "Big-Picture Green Light",
    titleFriction: "Overpromising & Big Eyes",
    taglineFlow: "Confidence has real perspective behind it—doors open when you reach.",
    taglineFriction: "Temptation to stretch your time, wallet, or promises past next week's bandwidth.",
    feelFlow: "Spacious and optimistic; cramped problems look workable.",
    feelFriction: "Restless ambition pushes you to skip prep for a shortcut.",
    workFlow: "Pitch larger scope, consult mentors, or map next-quarter growth.",
    workFriction: "Verify budgets and real deadlines before signing off on ambitious bets.",
    loveFlow: "Generous humor and warm encouragement lift shared plans.",
    loveFriction: "Avoid promising big favors to impress anyone when your week is full.",
    moveFlow: "Say yes to one credible stretch invitation that grows your reach.",
    moveFriction: "Trim ambitious estimates by 20% so delivery stays reliable.",
    trapFlow: "Skipping quality checks because momentum feels automatic.",
    trapFriction: "Spending prematurely on best-case assumptions.",
  },
  [pairKey("Sun", "Saturn")]: {
    titleFlow: "Steady, Credible Grounding",
    titleFriction: "Heavy Duty & Reality Check",
    taglineFlow: "Patient focus pays off; steady work earns trust without noise.",
    taglineFriction: "Tight limits, slow timelines, or self-doubt test your patience.",
    feelFlow: "Grounded satisfaction doing work thoroughly rather than chasing applause.",
    feelFriction: "Duties feel heavier; self-criticism flares if progress slows.",
    workFlow: "Tighten budgets, finish long-haul work, and prove reliability.",
    workFriction: "Treat delays as quality control and clear one concrete task at a time.",
    loveFlow: "Dependable follow-through says far more than flashy gestures.",
    loveFriction: "Tell people when heavy deadlines make you quiet so distance isn't misread.",
    moveFlow: "Finish one foundational task that smooths out the rest of the month.",
    moveFriction: "Apply fair standards to yourself instead of harsh self-critique.",
    trapFlow: "Expecting everyone else to match a strict, all-business tempo.",
    trapFriction: "Quitting right before payoff because progress feels gradual.",
  },
  [pairKey("Moon", "Mercury")]: {
    titleFlow: "Feelings Into Clear Words",
    titleFriction: "Overthinking Emotional Details",
    taglineFlow: "You can name what you feel plainly and read between lines accurately.",
    taglineFriction: "Mind loops over small remarks or analyzes moods instead of resting.",
    feelFlow: "Mentally quick yet emotionally tuned in—tact and clarity work together.",
    feelFriction: "Busy mental chatter makes worried 'what-if' loops tough to shut off.",
    workFlow: "Draft sensitive messages, mediate mix-ups, or organize messy notes.",
    workFriction: "Step back from rapid texting if your head feels noisy and tired.",
    loveFlow: "Heart-to-heart talks stay attentive, warm, and genuinely clarifying.",
    loveFriction: "Acknowledge how someone feels before jumping into logical fixes.",
    moveFlow: "Have the thoughtful conversation you delayed while tact lines up.",
    moveFriction: "Put looping worries on paper once instead of replaying them silently.",
    trapFlow: "Talking past listeners simply because thoughts arrive rapidly.",
    trapFriction: "Reading hidden hostility into brief, rushed replies.",
  },
  [pairKey("Moon", "Mars")]: {
    titleFlow: "Courageous Gut Momentum",
    titleFriction: "Moody Edge & Quick Flare-Ups",
    taglineFlow: "Strong emotional conviction fuels fast, protective follow-through.",
    taglineFriction: "Thin skin meets quick temper—small home or schedule snags flare fast.",
    feelFlow: "Spirited and alert; easier to stand up for yourself cleanly.",
    feelFriction: "Restless nerves make minor interruptions extra grating.",
    workFlow: "Power through hands-on chores or push stalled work across the line.",
    workFriction: "Put irritating messages on a 20-minute hold before replying.",
    loveFlow: "Lively chemistry favors active outings and candid warmth.",
    loveFriction: "Skip bickering over chores—name the actual frustration calmly.",
    moveFlow: "Channel this burst of drive into fixing one lingering physical mess.",
    moveFriction: "Burn excess adrenaline through movement before discussing sore topics.",
    trapFlow: "Moving fast enough to overlook simple details.",
    trapFriction: "Saying something sharp in a ten-minute mood spike that lingers.",
  },
  [pairKey("Venus", "Mars")]: {
    titleFlow: "Easy Social & Creative Spark",
    titleFriction: "Desire vs. Compromise Pull",
    taglineFlow: "Warmth and confidence click together, energizing social and creative plans.",
    taglineFriction: "Attraction and stubborn preferences clash around wanting your way.",
    feelFlow: "Playful, expressive, and socially charged without forced effort.",
    feelFriction: "Pulled between insisting on your preference and keeping peace.",
    workFlow: "Pitch creative concepts, refine presentation, and build client rapport.",
    workFriction: "Meet halfway on small taste details so pride doesn't stall a deal.",
    loveFlow: "Strong current for romance, charm, and honest mutual spark.",
    loveFriction: "Speak plainly if tension builds instead of dropping passive hints.",
    moveFlow: "Invest effort into someone you care about or work you enjoy.",
    moveFriction: "Aim for a fair split rather than turning preferences into a contest.",
    trapFlow: "Spending impulsively purely because the mood feels celebratory.",
    trapFriction: "Mistaking dramatic friction for real intimacy.",
  },
  [pairKey("Mercury", "Uranus")]: {
    titleFlow: "Quick Insight & Original Fix",
    titleFriction: "Mental Scatter & Schedule Audibles",
    taglineFlow: "Fresh breakthroughs crack stubborn problems with surprising speed.",
    taglineFriction: "Scattered focus, tech quirks, or blurted remarks disrupt routine.",
    feelFlow: "Sharp and inventive—fresh connections snap cleanly into place.",
    feelFriction: "Mental static makes slow checklists difficult to sit through.",
    workFlow: "Brainstorm, troubleshoot systems, automate steps, and pitch fresh methods.",
    workFriction: "Back up work, double-check links, and leave room for calendar changes.",
    loveFlow: "Witty exchanges and surprising conversations spark good energy.",
    loveFriction: "Skip arguing contrarian angles purely for mental sport.",
    moveFlow: "Capture sudden ideas immediately before the thread vanishes.",
    moveFriction: "Mute alerts for 30 minutes to finish one task start-to-finish.",
    trapFlow: "Speaking faster than listeners can absorb new concepts.",
    trapFriction: "Changing plans last-minute without updating people affected.",
  },
  [pairKey("Mars", "Saturn")]: {
    titleFlow: "Disciplined Stamina Under Load",
    titleFriction: "Gas Pedal & Brake at Once",
    taglineFlow: "Steady pacing beats speed—you have grit to outlast tough tasks.",
    taglineFriction: "Urgency hits red tape or delays, testing temper and patience.",
    feelFlow: "Grounded endurance; demanding hours feel purposeful.",
    feelFriction: "Tension builds when your urge to sprint runs straight into strict rules.",
    workFlow: "Handle high-precision tasks where cutting corners fails.",
    workFriction: "Fix sequence and respect protocol instead of forcing locked doors.",
    loveFlow: "Quiet loyalty and dependable action build lasting trust.",
    loveFriction: "Name frustration cleanly rather than going icy silent.",
    moveFlow: "Chip away steadily at the toughest obligation on your plate.",
    moveFriction: "Use forced waiting windows to tighten preparation cleanly.",
    trapFlow: "Judging others harshly if they tire out sooner than you.",
    trapFriction: "Ramming into an unmoving bottleneck until morale drops.",
  },
};

export function getHumanDialogue(
  transitPlanet: string,
  aspect: string,
  natalPlanet: string,
  isMajor: boolean,
  orb: number,
  context?: DialogueChartContext
): HumanAspectDialogue {
  const aspectLower = aspect.toLowerCase() as AspectKind;
  const tone = ASPECT_TONE[aspectLower] ?? {
    label: capitalize(aspectLower),
    isHarmonious: false,
    orbAction: "connects outer timing with personal habits",
    titleVerbsFlow: ["Connects With"],
    titleVerbsFriction: ["Tests"],
  };

  const isFlow = tone.isHarmonious;
  const transitSpec = TRANSIT_ACTORS[transitPlanet] ?? {
    shortLabel: transitPlanet,
    flowVerb: "supports clear momentum",
    frictionVerb: "adds direct pressure",
    bodyMindFlow: `${transitPlanet} brings steadier mental clarity today.`,
    bodyMindFriction: `${transitPlanet} highlights immediate outer pressure.`,
    workFlow: `Advance tasks tied to ${transitPlanet.toLowerCase()} timing.`,
    workFriction: `Verify details carefully before committing.`,
    socialFlow: "Calm, direct conversation moves smoothly.",
    socialFriction: "Leave room in tone before responding.",
    bestMoveFlow: "Use the clear opening constructively.",
    bestMoveFriction: "Make one practical adjustment rather than forcing speed.",
    trapFlow: "Coasting without finishing concrete steps.",
    trapFriction: "Reacting quickly before details settle.",
  };

  const natalSpec = NATAL_RECEPTORS[natalPlanet] ?? {
    domain: `your ${natalPlanet.toLowerCase()} baseline`,
    personalTrait: `${natalPlanet.toLowerCase()} focus`,
    workArena: "daily output",
    relationshipArena: "one-on-one interactions",
    sensitiveSpot: "feeling rushed",
    strengthAnchor: "steady awareness",
  };

  const tHouse = context?.transitHouse;
  const nHouse = context?.natalHouse;
  const tSign = context?.transitSign;
  const nSign = context?.natalSign;

  const natalHouseInfo = nHouse ? HOUSE_REAL_LIFE[nHouse] : undefined;
  const actualTransitHouse = tHouse ? HOUSE_REAL_LIFE[tHouse] : undefined;
  const natalSignStyle = nSign ? SIGN_BEHAVIOR[nSign] : undefined;
  const transitSignStyle = tSign ? SIGN_BEHAVIOR[tSign] : undefined;

  const houseBridgeLabel =
    tHouse && nHouse
      ? `H${tHouse} → H${nHouse}`
      : nHouse
      ? `House ${nHouse}`
      : tHouse
      ? `Sky H${tHouse}`
      : "Live Contact";

  const rxNote = context?.transitRetrograde
    ? ` Transit ${transitPlanet} is retrograde, bringing an unfinished thread back for a second look.`
    : "";

  // Build truly fresh chart-anchored insight for every card
  let freshSignal: string;
  if (actualTransitHouse && natalHouseInfo && tHouse !== nHouse) {
    freshSignal = `Live activity around ${actualTransitHouse.arena} (House ${tHouse}${
      tSign ? ` in ${tSign}` : ""
    }) ${tone.orbAction} in ${natalHouseInfo.arena} (House ${nHouse}${
      nSign ? ` in ${nSign}` : ""
    }).${rxNote}`;
  } else if (natalHouseInfo) {
    freshSignal = `Lands straight inside ${natalHouseInfo.arena} (House ${nHouse}${
      nSign ? ` · ${nSign}` : ""
    }), colored by a style that is ${transitSignStyle ?? natalSignStyle ?? "direct and tangible"}.${rxNote}`;
  } else {
    freshSignal = `Transit ${transitPlanet} ${tone.orbAction} with your ${natalSpec.personalTrait} (${getOrbUrgencyLabel(orb).toLowerCase()} at ${orb.toFixed(2)}°).${rxNote}`;
  }

  const orbStatus = getOrbUrgencyLabel(orb);
  const impactExplanation = isMajor
    ? `★ Major ${tone.label} (100% Impact) · ${orbStatus} (${orb.toFixed(2)}°)`
    : `✧ Minor ${tone.label} (50% Impact) · ${orbStatus} (${orb.toFixed(2)}°)`;

  // Deterministic index to vary phrasing across similar cards so adjacent rows never repeat identical prefixes
  const variantSeed =
    (transitPlanet.length * 7 + natalPlanet.length * 13 + aspectLower.length * 5) % 3;

  const core = PAIR_CORES[pairKey(transitPlanet, natalPlanet)];
  const isSelfAspect = transitPlanet === natalPlanet;

  if (core && !isSelfAspect) {
    const title = isFlow ? core.titleFlow : core.titleFriction;
    const targetPhrase = natalHouseInfo
      ? natalHouseInfo.actionFocus
      : natalSpec.workArena;
    const socialPhrase = natalHouseInfo
      ? natalHouseInfo.socialFocus
      : natalSpec.relationshipArena;

    return {
      everydayTitle: title,
      tagline: `${isFlow ? core.taglineFlow : core.taglineFriction}`,
      freshSignal,
      houseBridgeLabel,
      feelingInBodyAndMind: `${isFlow ? core.feelFlow : core.feelFriction}`,
      workAndMoney: `${isFlow ? core.workFlow : core.workFriction}${
        natalHouseInfo ? ` Focus directly on ${targetPhrase}.` : ""
      }`,
      relationshipsAndPeople: `${isFlow ? core.loveFlow : core.loveFriction}${
        natalHouseInfo ? ` Most visible around ${socialPhrase}.` : ""
      }`,
      bestMoveToday: isFlow ? core.moveFlow : core.moveFriction,
      trapToAvoid: isFlow ? core.trapFlow : core.trapFriction,
      isMajor,
      impactExplanation,
    };
  }

  if (isSelfAspect) {
    const houseSuffix = context?.natalHouse ? ` in House ${context.natalHouse}` : "";
    return {
      everydayTitle: isFlow
        ? `${tone.label} Checkpoint on Your ${natalPlanet}${houseSuffix}`
        : `${tone.label} Stress-Test on Your ${natalPlanet}${houseSuffix}`,
      tagline: isFlow
        ? `Your own ${natalSpec.domain} hits a clean checkpoint—what works stays easy to see.`
        : `Your default ${natalSpec.personalTrait} gets tested from outside so outdated habits show up fast.`,
      freshSignal,
      houseBridgeLabel,
      feelingInBodyAndMind: `${isFlow ? transitSpec.bodyMindFlow : transitSpec.bodyMindFriction} Because it hits your natal ${natalPlanet}${context?.natalSign ? ` (${context.natalSign})` : ""}, you recognize the pattern instantly.`,
      workAndMoney: `${isFlow ? transitSpec.workFlow : transitSpec.workFriction}${
        natalHouseInfo ? ` Especially relevant to ${natalHouseInfo.actionFocus}.` : ""
      }`,
      relationshipsAndPeople: `${isFlow ? transitSpec.socialFlow : transitSpec.socialFriction}${
        natalHouseInfo ? ` Watch how it shows up in ${natalHouseInfo.socialFocus}.` : ""
      }`,
      bestMoveToday: isFlow ? transitSpec.bestMoveFlow : transitSpec.bestMoveFriction,
      trapToAvoid: isFlow ? transitSpec.trapFlow : transitSpec.trapFriction,
      isMajor,
      impactExplanation,
    };
  }

  // Distinct synthesis without bolted generic mechanic templates
  const verbPool = isFlow ? tone.titleVerbsFlow : tone.titleVerbsFriction;
  const titleVerb = verbPool[variantSeed % verbPool.length];
  const everydayTitle = `${transitSpec.shortLabel} ${titleVerb} ${
    context?.natalHouse ? `House ${context.natalHouse} (${capitalize(natalPlanet)})` : capitalize(natalPlanet)
  }`;

  const tagline = isFlow
    ? `${transitPlanet}'s ${transitSpec.shortLabel.toLowerCase()} ${transitSpec.flowVerb} around ${natalHouseInfo?.arena ?? natalSpec.domain}.`
    : `${transitPlanet}'s ${transitSpec.shortLabel.toLowerCase()} ${transitSpec.frictionVerb} onto ${natalHouseInfo?.arena ?? natalSpec.domain}.`;

  const feelingInBodyAndMind = isFlow
    ? `${transitSpec.bodyMindFlow} It brings easier access to ${natalSpec.strengthAnchor}${
        natalSignStyle ? ` (${natalSignStyle})` : ""
      }.`
    : `${transitSpec.bodyMindFriction} It presses straight on ${natalSpec.sensitiveSpot}${
        actualTransitHouse ? ` from ${actualTransitHouse.arena}` : ""
      }.`;

  const workAndMoney = isFlow
    ? `${transitSpec.workFlow}${
        natalHouseInfo ? ` Apply it to ${natalHouseInfo.actionFocus}.` : ` Direct it into ${natalSpec.workArena}.`
      }`
    : `${transitSpec.workFriction}${
        natalHouseInfo ? ` Protect margins around ${natalHouseInfo.actionFocus}.` : ` Slow down around ${natalSpec.workArena}.`
      }`;

  const relationshipsAndPeople = isFlow
    ? `${transitSpec.socialFlow}${
        natalHouseInfo ? ` Helps smoothly around ${natalHouseInfo.socialFocus}.` : ` Helps in ${natalSpec.relationshipArena}.`
      }`
    : `${transitSpec.socialFriction}${
        natalHouseInfo ? ` Pay attention around ${natalHouseInfo.socialFocus}.` : ` Stay clear around ${natalSpec.relationshipArena}.`
      }`;

  return {
    everydayTitle,
    tagline,
    freshSignal,
    houseBridgeLabel,
    feelingInBodyAndMind,
    workAndMoney,
    relationshipsAndPeople,
    bestMoveToday: isFlow ? transitSpec.bestMoveFlow : transitSpec.bestMoveFriction,
    trapToAvoid: isFlow ? transitSpec.trapFlow : transitSpec.trapFriction,
    isMajor,
    impactExplanation,
  };
}
