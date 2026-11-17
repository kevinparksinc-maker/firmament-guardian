import type { ChartResult, ChartRow } from "../server/astronomy";
import { FIXED_STARS, ZODIAC_SIGNS, formatLongitude, normalizeLongitude } from "./hybrid";
import { ENERGY_ASPECT_FLOW, ENERGY_MAX_ORB, energyIntensity } from "./energyScoring";

const ROYAL_STARS = new Set(["Aldebaran", "Regulus", "Antares", "Fomalhaut"]);

const ASPECT_ANGLES = [
  { angle: 0, aspect: "conjunction" as const, isMajor: true },
  { angle: 60, aspect: "sextile" as const, isMajor: true },
  { angle: 90, aspect: "square" as const, isMajor: true },
  { angle: 120, aspect: "trine" as const, isMajor: true },
  { angle: 180, aspect: "opposition" as const, isMajor: true },
  { angle: 30, aspect: "semisextile" as const, isMajor: false },
  { angle: 45, aspect: "semisquare" as const, isMajor: false },
  { angle: 150, aspect: "quincunx" as const, isMajor: false },
] as const;

export type StarRealLifeProfile = {
  isRoyal: boolean;
  archetype: string;
  nature: string;
  everydayMeaning: string;
  watchOutFor: string;
};

const STAR_PROFILES: Record<string, StarRealLifeProfile> = {
  Aldebaran: {
    isRoyal: true,
    archetype: "Watcher of the East · Integrity Under Spotlight",
    nature: "Mars-like drive",
    everydayMeaning:
      "Fast momentum, bold leadership, and visible breakthroughs when you stay completely honest and keep your word.",
    watchOutFor:
      "Cutting corners for speed, making promises you can't back up, or reacting defensively when challenged.",
  },
  Regulus: {
    isRoyal: true,
    archetype: "Watcher of the North · Earned Authority",
    nature: "Mars + Jupiter",
    everydayMeaning:
      "Natural command, respect from decision-makers, and stepping up as the steady person others look to.",
    watchOutFor:
      "Petty score-settling or pride; keeping the high road and letting small slights go protects your momentum.",
  },
  Antares: {
    isRoyal: true,
    archetype: "Watcher of the West · High-Stakes Focus",
    nature: "Mars + Jupiter",
    everydayMeaning:
      "Laser focus during intense conversations, cutting straight to the real problem, and thriving when stakes are high.",
    watchOutFor:
      "All-or-nothing fixation, picking unnecessary battles, or staying on high alert when things are actually calm.",
  },
  Fomalhaut: {
    isRoyal: true,
    archetype: "Watcher of the South · Long-Game Vision",
    nature: "Venus + Mercury",
    everydayMeaning:
      "Clear creative or strategic vision that lands well with other people when paired with real follow-through.",
    watchOutFor:
      "Chasing an idealized version of a person or plan while skipping the practical logistics.",
  },
  Spica: {
    isRoyal: false,
    archetype: "Craft, Skill & Timely Protection",
    nature: "Venus + Jupiter",
    everydayMeaning:
      "Noticeable polish, smart timing, and moments where hard preparation suddenly opens an easier door.",
    watchOutFor: "Coasting on natural talent instead of finishing the details.",
  },
  Sirius: {
    isRoyal: false,
    archetype: "Outsized Impact & Loyalty",
    nature: "Jupiter + Mars",
    everydayMeaning:
      "Small actions carrying big weight—good for taking initiative on a major project or standing up for your circle.",
    watchOutFor: "Overworking or letting intense enthusiasm turn into impatience with slower people.",
  },
  Algol: {
    isRoyal: false,
    archetype: "High-Pressure Edge · Sabotage & Keeping Your Head",
    nature: "Saturn + Jupiter",
    everydayMeaning:
      "Raw honesty, crisis composure, and fierce self-protection; spots power games or hidden threats immediately without sugarcoating.",
    watchOutFor:
      "Self-sabotage under pressure—losing your cool, escalating a standoff too far, or distrusting allies before checking the facts.",
  },
  Rigel: {
    isRoyal: false,
    archetype: "Technical Mastery & Teaching",
    nature: "Jupiter + Mars",
    everydayMeaning:
      "Hands-on competence, fast problem-solving, and practical know-how people willingly pay for or trust.",
    watchOutFor: "Taking on too many responsibilities before building a sustainable schedule.",
  },
  Polaris: {
    isRoyal: false,
    archetype: "True North & Steady Bearings",
    nature: "Saturn + Venus",
    everydayMeaning:
      "Clear long-term bearings while everyone else is guessing; steadies shaky plans and clarifies priorities.",
    watchOutFor: "Getting too rigid about one plan when new facts show a better route.",
  },
  Hamal: {
    isRoyal: false,
    archetype: "Independent Nerve & First Moves",
    nature: "Mars + Saturn",
    everydayMeaning:
      "Self-starting grit and refusal to wait around for permission when something needs fixing.",
    watchOutFor: "Butting heads with authority just to prove a point.",
  },
  Pleiades: {
    isRoyal: false,
    archetype: "Sharp Gut Instinct & Sensitivity",
    nature: "Moon + Mars",
    everydayMeaning:
      "Quick emotional read on rooms and deep intuition about what feels off beneath surface pleasantries.",
    watchOutFor: "Taking on other people's stress or reading slights where none were meant.",
  },
  Betelgeuse: {
    isRoyal: false,
    archetype: "Momentum & Decisive Execution",
    nature: "Mars + Mercury",
    everydayMeaning:
      "Direct, confident action that pushes stalled projects forward and gets clear answers.",
    watchOutFor: "Speaking or acting faster than the facts are verified.",
  },
  Bellatrix: {
    isRoyal: false,
    archetype: "Strategic Courage",
    nature: "Mars + Mercury",
    everydayMeaning:
      "Clear-eyed debate, quick tactical decisions, and holding your ground in tough negotiations.",
    watchOutFor: "Sharp words landing harder than intended.",
  },
  Alnitak: {
    isRoyal: false,
    archetype: "Precision & Endurance",
    nature: "Jupiter + Saturn",
    everydayMeaning: "Organized steady effort that builds tangible reliability.",
    watchOutFor: "Over-engineering simple tasks.",
  },
  Alnilam: {
    isRoyal: false,
    archetype: "Public Recognition Through Work",
    nature: "Jupiter + Saturn",
    everydayMeaning: "Quietly solid work getting noticed at the right moment.",
    watchOutFor: "Assuming visibility doesn't need follow-up.",
  },
  Mintaka: {
    isRoyal: false,
    archetype: "Fairness & Clean Structure",
    nature: "Jupiter + Saturn",
    everydayMeaning: "Clear standards and balanced execution in partnerships or teams.",
    watchOutFor: "Perfectionism stalling delivery.",
  },
  Castor: {
    isRoyal: false,
    archetype: "Quick Mind & Articulation",
    nature: "Mercury",
    everydayMeaning:
      "Clever problem-solving, fast writing/speaking, and connecting dots quickly.",
    watchOutFor: "Scattered attention or overthinking easy decisions.",
  },
  Pollux: {
    isRoyal: false,
    archetype: "Tested Resilience",
    nature: "Mars",
    everydayMeaning:
      "Turning tough lessons or past friction into calm, practical toughness.",
    watchOutFor: "Expecting conflict before anyone has pushed back.",
  },
  Procyon: {
    isRoyal: false,
    archetype: "Fast Timing & Quick Returns",
    nature: "Mercury + Mars",
    everydayMeaning:
      "Short bursts of fast progress and immediate feedback on conversations or errands.",
    watchOutFor: "Skipping patience when a deal needs more time to mature.",
  },
  Capella: {
    isRoyal: false,
    archetype: "Curiosity & Resourcefulness",
    nature: "Mars + Mercury",
    everydayMeaning:
      "Independent thinking, quick learning, and finding clever workarounds under tight constraints.",
    watchOutFor: "Restlessness or dropping routines too soon.",
  },
  Arcturus: {
    isRoyal: false,
    archetype: "Pioneer Timing & Fair Judgment",
    nature: "Mars + Jupiter",
    everydayMeaning:
      "Leading a new approach while keeping fairness intact; strong justice instinct.",
    watchOutFor: "Going it alone when backing is actually available.",
  },
  Vega: {
    isRoyal: false,
    archetype: "Refined Persuasion & Magnetism",
    nature: "Venus + Mercury",
    everydayMeaning:
      "Calm charm, artistic taste, and making complex ideas sound clear and inviting.",
    watchOutFor: "People-pleasing at the expense of your real boundary.",
  },
  Deneb: {
    isRoyal: false,
    archetype: "Broad Perspective & Adaptability",
    nature: "Venus + Mercury",
    everydayMeaning:
      "Fast adaptability in shifting environments and strong creative or teaching clarity.",
    watchOutFor: "Staying detached when a situation asks for commitment.",
  },
  Altair: {
    isRoyal: false,
    archetype: "Bold Action & Calculated Risk",
    nature: "Mars + Jupiter",
    everydayMeaning:
      "Backing yourself with decisive nerve when a real opportunity opens in front of you.",
    watchOutFor: "Moving forward purely on adrenaline.",
  },
  Canopus: {
    isRoyal: false,
    archetype: "Long-Range Navigation",
    nature: "Saturn + Jupiter",
    everydayMeaning:
      "Steady long-term planning, big-picture perspective, and reliable travel or logistics.",
    watchOutFor: "Getting stuck analyzing the horizon instead of taking step one.",
  },
  Alhena: {
    isRoyal: false,
    archetype: "Diplomatic Grace & Craft",
    nature: "Mercury + Venus",
    everydayMeaning:
      "Smooth communication, smoothing over tense conversations, and creative attention to detail.",
    watchOutFor: "Softening hard truths until the point gets blurred.",
  },
  Denebola: {
    isRoyal: false,
    archetype: "Clear Critique & Standards",
    nature: "Saturn + Venus",
    everydayMeaning:
      "Spotting what isn't working and insisting on cleaner, simpler standards.",
    watchOutFor: "Sounding overly critical when tired.",
  },
  Zubenelgenubi: {
    isRoyal: false,
    archetype: "Accountability & Balance",
    nature: "Saturn + Mars",
    everydayMeaning:
      "Seeing both sides of a bargain clearly and making sure terms stay genuinely fair.",
    watchOutFor: "Settling for an uneven deal just to keep the peace.",
  },
  Nunki: {
    isRoyal: false,
    archetype: "Direct Honesty & Conviction",
    nature: "Jupiter + Mercury",
    everydayMeaning:
      "Speaking with grounded authority on things you've actually lived and tested.",
    watchOutFor: "Assuming everyone shares your same baseline values.",
  },
  Markab: {
    isRoyal: false,
    archetype: "Steady Follow-Through",
    nature: "Mars + Mercury",
    everydayMeaning:
      "Practical perseverance—finishing the unglamorous work that keeps things safe and solid.",
    watchOutFor: "Overloading your plate out of habit.",
  },
};

export interface FixedStarEnergyActivation {
  id: string;
  starName: string;
  starLongitude: number;
  starDisplay: string;
  isRoyal: boolean;
  archetype: string;
  nature: string;
  scope: "live-sky" | "natal-triggered" | "natal-anchor";
  bodyName: string;
  bodyDisplay: string;
  bodyHouse?: number;
  orbDeg: number;
  liveTriggerContact?: string;
  everydayMeaning: string;
  watchOutFor: string;
}

export interface NatalFixedStarPosition {
  id: string;
  starName: string;
  starLongitude: number;
  starDisplay: string;
  sign: string;
  house: number;
  houseArena: string;
  isRoyal: boolean;
  isKeyMarker: boolean;
  archetype: string;
  nature: string;
  everydayMeaning: string;
  watchOutFor: string;
  natalConjunctions: Array<{ bodyName: string; bodyDisplay: string; orbDeg: number }>;
  personalHouseReading: string;
  sabotageOrShadowRisk: string;
}

export interface ArabicLotMeta {
  id: "fortune" | "spirit" | "eros" | "necessity" | "courage" | "victory" | "nemesis";
  name: string;
  shortName: string;
  rulerPlanet: string;
  lifeDomain: string;
  dayFormula: string;
  nightFormula: string;
  plainEnglishCore: string;
}

const ARABIC_LOT_META: Record<ArabicLotMeta["id"], ArabicLotMeta> = {
  fortune: {
    id: "fortune",
    name: "Lot of Fortune",
    shortName: "Fortune",
    rulerPlanet: "Moon",
    lifeDomain: "Body, Health, Money & Daily Circumstance",
    dayFormula: "Asc + Moon − Sun",
    nightFormula: "Asc + Sun − Moon",
    plainEnglishCore:
      "Where tangible circumstances, physical energy, and financial timing land for you—often what happens around you.",
  },
  spirit: {
    id: "spirit",
    name: "Lot of Spirit",
    shortName: "Spirit",
    rulerPlanet: "Sun",
    lifeDomain: "Work, Choice, Focus & Direction",
    dayFormula: "Asc + Sun − Moon",
    nightFormula: "Asc + Moon − Sun",
    plainEnglishCore:
      "Where your deliberate decisions, work ethic, and personal initiative steer outcomes by conscious choice.",
  },
  eros: {
    id: "eros",
    name: "Lot of Eros",
    shortName: "Eros",
    rulerPlanet: "Venus",
    lifeDomain: "Love, Chemistry & Heart Appetite",
    dayFormula: "Asc + Venus − Spirit",
    nightFormula: "Asc + Spirit − Venus",
    plainEnglishCore:
      "What pulls your heart, romantic chemistry, creative passion, and who/what genuinely lights you up.",
  },
  necessity: {
    id: "necessity",
    name: "Lot of Necessity",
    shortName: "Necessity",
    rulerPlanet: "Mercury",
    lifeDomain: "Agreements, Obligations & Pressure",
    dayFormula: "Asc + Fortune − Mercury",
    nightFormula: "Asc + Mercury − Fortune",
    plainEnglishCore:
      "Deadlines, binding commitments, tough negotiations, and the non-negotiable terms you have to handle.",
  },
  courage: {
    id: "courage",
    name: "Lot of Courage",
    shortName: "Courage",
    rulerPlanet: "Mars",
    lifeDomain: "Nerve, Boundaries & Decisive Action",
    dayFormula: "Asc + Fortune − Mars",
    nightFormula: "Asc + Mars − Fortune",
    plainEnglishCore:
      "Where you summon grit, push past hesitation, set clear boundaries, and make bold moves.",
  },
  victory: {
    id: "victory",
    name: "Lot of Victory",
    shortName: "Victory",
    rulerPlanet: "Jupiter",
    lifeDomain: "Support, Trust & Breakthroughs",
    dayFormula: "Asc + Jupiter − Spirit",
    nightFormula: "Asc + Spirit − Jupiter",
    plainEnglishCore:
      "Where timing opens up, allies show goodwill, and steady faith turns effort into clean wins.",
  },
  nemesis: {
    id: "nemesis",
    name: "Lot of Nemesis",
    shortName: "Nemesis",
    rulerPlanet: "Saturn",
    lifeDomain: "Patience, Reality Checks & Limits",
    dayFormula: "Asc + Fortune − Saturn",
    nightFormula: "Asc + Saturn − Fortune",
    plainEnglishCore:
      "Hidden bottlenecks, delays, or honest reality checks that ask for patience and solid repair.",
  },
};

const LOT_HOUSE_ARENA: Record<number, string> = {
  1: "your body, mood, and first-hand initiative",
  2: "money, cash flow, possessions, and self-worth",
  3: "everyday messages, errands, siblings, and conversations",
  4: "home, family, privacy, and emotional foundations",
  5: "dating, creativity, kids, enjoyment, and risks",
  6: "daily routines, workload, health habits, and chores",
  7: "partnerships, close agreements, and one-on-one interactions",
  8: "shared money, trust, taxes/debts, and deep transitions",
  9: "travel, study, perspective, and long-term beliefs",
  10: "career reputation, public standing, and leadership",
  11: "friends, networks, income from work, and future aims",
  12: "private rest, behind-the-scenes work, and hidden stress",
};

export interface LotTransitAspect {
  id: string;
  transitPlanet: string;
  aspect: string;
  orbDeg: number;
  isMajor: boolean;
  flow: -1 | 0 | 1;
  weight: number;
  realLifeTakeaway: string;
}

export interface ArabicLotEnergyEntry {
  meta: ArabicLotMeta;
  sect: "day" | "night";
  longitude: number;
  display: string;
  sign: string;
  house: number;
  houseArena: string;
  formulaUsed: string;
  natalStarContacts: Array<{ starName: string; isRoyal: boolean; orbDeg: number }>;
  natalPlanetContacts: Array<{ bodyName: string; aspect: string; orbDeg: number }>;
  liveTransits: LotTransitAspect[];
  personalPlacementReading: string;
  summaryToday: string;
}

export interface EnergyStarsAndLotsResult {
  sect: "day" | "night";
  lotsAvailable: boolean;
  lotsUnavailableReason?: string;
  liveSkyStars: FixedStarEnergyActivation[];
  natalTriggeredStars: FixedStarEnergyActivation[];
  natalAnchorStars: FixedStarEnergyActivation[];
  natalStarPositions: NatalFixedStarPosition[];
  lots: ArabicLotEnergyEntry[];
  activeLotHits: Array<{ lot: ArabicLotEnergyEntry; aspect: LotTransitAspect }>;
}

function angularDistanceDeg(a: number, b: number): number {
  const diff = Math.abs(normalizeLongitude(a - b));
  return Math.min(diff, 360 - diff);
}

function buildLotAspectTakeaway(
  lot: ArabicLotMeta,
  transitPlanet: string,
  aspect: string,
  flow: -1 | 0 | 1
): string {
  const tone =
    flow === 1
      ? aspect === "conjunction"
        ? "puts a direct spotlight on"
        : "opens smooth momentum around"
      : "tests your patience and sharpens decisions around";

  const domainHint: Record<ArabicLotMeta["id"], string> = {
    fortune: "physical energy, spending, and daily luck",
    spirit: "work direction, focus, and deliberate choices",
    eros: "romantic chemistry, desire, and what lights you up",
    necessity: "obligations, schedules, and non-negotiable agreements",
    courage: "nerve, confrontation, and standing your ground",
    victory: "allies, good timing, and overcoming obstacles",
    nemesis: "hidden friction, delays, and pacing your limits",
  };

  return `Transit ${transitPlanet} ${aspect} your ${lot.name} ${tone} ${domainHint[lot.id]}.`;
}

const KEY_MARKER_STARS = new Set([
  "Algol",
  "Aldebaran",
  "Regulus",
  "Antares",
  "Fomalhaut",
  "Sirius",
  "Spica",
  "Pleiades",
]);

const SIGN_STYLE_SNIPPET: Record<string, string> = {
  Aries: "direct, fast-moving, and competitive",
  Taurus: "steady, territorial, and protective of tangible security",
  Gemini: "verbal, observant, and quick-witted",
  Cancer: "protective, instinctive, and loyal to your inner circle",
  Leo: "proud, visible, and driven by personal dignity",
  Virgo: "precise, analytical, and alert to flaws",
  Libra: "diplomatic, image-aware, and attuned to fairness",
  Scorpio: "intense, private, and alert to hidden motives",
  Sagittarius: "candid, restless, and guided by principle",
  Capricorn: "pragmatic, guarded, and focused on long-term standing",
  Aquarius: "independent, contrarian, and protective of personal freedom",
  Pisces: "porous, intuitive, and sensitive to unspoken atmospheres",
};

function resolveHouseForLongitude(
  longitude: number,
  chart: ChartResult,
  ascLon?: number
): number {
  const lon = normalizeLongitude(longitude);
  if (chart.worldview === "god") {
    return Math.floor(lon / 30) + 1;
  }
  const cusps = chart.houses;
  if (Array.isArray(cusps) && cusps.length === 12) {
    // Check equal-house or quadrant cusps monotonically
    const first = normalizeLongitude(cusps[0]);
    const isEqual = cusps.every(
      (c, i) => Math.abs(normalizeLongitude(c - (first + i * 30))) < 0.05 || Math.abs(normalizeLongitude(c - (first + i * 30)) - 360) < 0.05
    );
    if (isEqual) {
      return (Math.floor(normalizeLongitude(lon - first) / 30) % 12) + 1;
    }
    for (let i = 0; i < 12; i++) {
      const start = normalizeLongitude(cusps[i]);
      const end = normalizeLongitude(cusps[(i + 1) % 12]);
      const span = normalizeLongitude(end - start) || 30;
      const offset = normalizeLongitude(lon - start);
      if (offset < span) return i + 1;
    }
  }
  if (ascLon != null) {
    return (Math.floor(normalizeLongitude(lon - ascLon) / 30) % 12) + 1;
  }
  return Math.floor(lon / 30) + 1;
}

function buildPersonalStarReading(
  starName: string,
  profile: StarRealLifeProfile,
  sign: string,
  house: number,
  houseArena: string,
  conjunctions: Array<{ bodyName: string; bodyDisplay: string; orbDeg: number }>
): { personalHouseReading: string; sabotageOrShadowRisk: string } {
  const signFlavor = SIGN_STYLE_SNIPPET[sign] ?? "distinct and consistent";
  const conjunctionNote = conjunctions.length
    ? ` Directly amplified by Natal ${conjunctions.map((c) => `${c.bodyName} (${c.orbDeg.toFixed(1)}°)`).join(", ")}.`
    : " Works directly through this house and sign even without a planet aspect.";

  if (starName === "Algol") {
    return {
      personalHouseReading: `In your chart, Algol sits in ${sign} · House ${house} (${houseArena}). Regardless of whether a planet aspects it, this is where you have sharp radar for manipulation and handle high-pressure truths head-on—delivered in a style that is ${signFlavor}.${conjunctionNote}`,
      sabotageOrShadowRisk: `Inside ${houseArena} (House ${house}), watch for self-sabotage through reactive pride, suspicion, or burning a bridge all at once when you feel cornered. Slowing your response by one beat keeps control in your hands.`,
    };
  }

  return {
    personalHouseReading: `In your chart, ${starName} lands in ${sign} · House ${house} (${houseArena}). Without needing an active aspect, it brings ${profile.everydayMeaning.charAt(0).toLowerCase()}${profile.everydayMeaning.slice(1)} Colored by a ${signFlavor} approach.${conjunctionNote}`,
    sabotageOrShadowRisk: `Around ${houseArena} (House ${house}), avoid: ${profile.watchOutFor}`,
  };
}

function buildPersonalLotReading(
  meta: ArabicLotMeta,
  sign: string,
  house: number,
  houseArena: string,
  natalPlanetContacts: Array<{ bodyName: string; aspect: string; orbDeg: number }>
): string {
  const signFlavor = SIGN_STYLE_SNIPPET[sign] ?? "grounded and steady";
  const contactLine = natalPlanetContacts.length
    ? ` Tuned by your natal ${natalPlanetContacts[0].bodyName} (${natalPlanetContacts[0].aspect}, ${natalPlanetContacts[0].orbDeg.toFixed(1)}°).`
    : " Its House and Sign alone set a constant baseline pattern here even with no aspect.";
  return `Sits in ${sign} · House ${house} (${houseArena}). ${meta.plainEnglishCore} Shows up through habits that are ${signFlavor}.${contactLine}`;
}

export function calculateEnergyStarsAndLots(
  chart: ChartResult | null | undefined
): EnergyStarsAndLotsResult {
  if (!chart) {
    return {
      sect: "day",
      lotsAvailable: false,
      lotsUnavailableReason: "Calculate a chart to view Fixed Stars and Arabic Lots.",
      liveSkyStars: [],
      natalTriggeredStars: [],
      natalAnchorStars: [],
      natalStarPositions: [],
      lots: [],
      activeLotHits: [],
    };
  }

  const sun = chart.movingBodies?.find(b => b.name === "Sun");
  const sunHouse = sun?.agentHouse ?? sun?.house ?? 10;
  const sect: "day" | "night" = sunHouse >= 7 && sunHouse <= 12 ? "day" : "night";

  // Build map of active transit-to-natal contacts to spotlight natal stars triggered today
  const natalTriggerMap = new Map<string, string>();
  for (const t of chart.transits ?? []) {
    const allContacts = [...(t.natalContacts ?? []), ...(t.minorNatalContacts ?? [])]
      .filter(c => c.orb <= ENERGY_MAX_ORB)
      .sort((a, b) => a.orb - b.orb);
    for (const c of allContacts) {
      if (!natalTriggerMap.has(c.natalName)) {
        natalTriggerMap.set(c.natalName, `Transit ${t.name} ${c.aspect} (${c.orb.toFixed(1)}° orb)`);
      }
    }
  }

  // 1. Live Sky Star Activations (transit planets passing over Fixed Stars)
  const liveSkyStars: FixedStarEnergyActivation[] = [];
  for (const t of chart.transits ?? []) {
    if (!Number.isFinite(t.longitude)) continue;
    const tLon = normalizeLongitude(t.longitude);
    for (const [starName, starLonRaw] of FIXED_STARS) {
      const starLon = normalizeLongitude(starLonRaw);
      const isRoyal = ROYAL_STARS.has(starName);
      const maxOrb = isRoyal ? 5.0 : 2.0;
      const dist = Number(angularDistanceDeg(tLon, starLon).toFixed(2));
      if (dist <= maxOrb) {
        const profile = STAR_PROFILES[starName] ?? {
          isRoyal,
          archetype: "Fixed Star Alignment",
          nature: "Mixed traditional",
          everydayMeaning: "Adds focused intensity and heightened visibility to this placement.",
          watchOutFor: "Overreacting before facts settle.",
        };
        liveSkyStars.push({
          id: `sky-star-${t.name}-${starName}`,
          starName,
          starLongitude: starLon,
          starDisplay: formatLongitude(starLon),
          isRoyal,
          archetype: profile.archetype,
          nature: profile.nature,
          scope: "live-sky",
          bodyName: `Transit ${t.name}`,
          bodyDisplay: t.display,
          bodyHouse: t.house,
          orbDeg: dist,
          everydayMeaning: `Transit ${t.name} activating ${starName} highlights ${profile.everydayMeaning.charAt(0).toLowerCase()}${profile.everydayMeaning.slice(1)}`,
          watchOutFor: profile.watchOutFor,
        });
      }
    }
  }
  liveSkyStars.sort((a, b) => {
    if (b.isRoyal !== a.isRoyal) return b.isRoyal ? 1 : -1;
    return a.orbDeg - b.orbDeg;
  });

  // 2. Natal Fixed Star Anchors (separating currently triggered vs steady background)
  const natalPoints: ChartRow[] = [
    ...(chart.movingBodies ?? []),
    ...(chart.ascendant ? [chart.ascendant] : []),
    ...(chart.midheaven ? [chart.midheaven] : []),
    ...(chart.northNode ? [chart.northNode] : []),
  ];

  const natalTriggeredStars: FixedStarEnergyActivation[] = [];
  const natalAnchorStars: FixedStarEnergyActivation[] = [];

  for (const body of natalPoints) {
    if (!Number.isFinite(body.longitude)) continue;
    const bLon = normalizeLongitude(body.longitude);
    for (const [starName, starLonRaw] of FIXED_STARS) {
      const starLon = normalizeLongitude(starLonRaw);
      const isRoyal = ROYAL_STARS.has(starName);
      const maxOrb = isRoyal ? 5.0 : 2.0;
      const dist = Number(angularDistanceDeg(bLon, starLon).toFixed(2));
      if (dist <= maxOrb) {
        const profile = STAR_PROFILES[starName] ?? {
          isRoyal,
          archetype: "Fixed Star Alignment",
          nature: "Mixed traditional",
          everydayMeaning: "Anchors this natal placement with lasting focus.",
          watchOutFor: "Rigidity when stressed.",
        };
        const liveTrigger = natalTriggerMap.get(body.name);
        const item: FixedStarEnergyActivation = {
          id: `natal-star-${body.name}-${starName}`,
          starName,
          starLongitude: starLon,
          starDisplay: formatLongitude(starLon),
          isRoyal,
          archetype: profile.archetype,
          nature: profile.nature,
          scope: liveTrigger ? "natal-triggered" : "natal-anchor",
          bodyName: `Natal ${body.name}`,
          bodyDisplay: body.display,
          bodyHouse: body.house,
          orbDeg: dist,
          liveTriggerContact: liveTrigger,
          everydayMeaning: profile.everydayMeaning,
          watchOutFor: profile.watchOutFor,
        };
        if (liveTrigger) natalTriggeredStars.push(item);
        else natalAnchorStars.push(item);
      }
    }
  }
  const sortStars = (a: FixedStarEnergyActivation, b: FixedStarEnergyActivation) =>
    b.isRoyal !== a.isRoyal ? (b.isRoyal ? 1 : -1) : a.orbDeg - b.orbDeg;
  natalTriggeredStars.sort(sortStars);
  natalAnchorStars.sort(sortStars);

  const ascLon = chart.ascendant && Number.isFinite(chart.ascendant.longitude)
    ? normalizeLongitude(chart.ascendant.longitude)
    : undefined;

  // 2B. Standalone Natal Fixed Star Position Layer (ALL catalog stars mapped to natal House & Sign, aspect or no aspect)
  const frozenByName = new Map((chart.frozenStars ?? []).map((fs) => [fs.name, fs]));
  const natalStarPositions: NatalFixedStarPosition[] = FIXED_STARS.map(([starName, starLonRaw]) => {
    const starLon = normalizeLongitude(starLonRaw);
    const isRoyal = ROYAL_STARS.has(starName);
    const maxOrb = isRoyal ? 5.0 : 2.0;
    const frozenRow = frozenByName.get(starName);
    const sign = ZODIAC_SIGNS[Math.floor(starLon / 30) % 12];
    const house = frozenRow
      ? chart.worldview === "god"
        ? frozenRow.godHouse ?? frozenRow.house
        : frozenRow.agentHouse ?? frozenRow.house
      : resolveHouseForLongitude(starLon, chart, ascLon);
    const houseArena = LOT_HOUSE_ARENA[house] ?? `House ${house}`;
    const profile = STAR_PROFILES[starName] ?? {
      isRoyal,
      archetype: "Fixed Star Placement",
      nature: "Mixed traditional",
      everydayMeaning: "Adds focused intensity and lasting emphasis to this chart area.",
      watchOutFor: "Overreacting when pressure builds.",
    };

    const natalConjunctions = natalPoints
      .filter((body) => Number.isFinite(body.longitude))
      .map((body) => ({
        bodyName: body.name,
        bodyDisplay: body.display,
        orbDeg: Number(angularDistanceDeg(normalizeLongitude(body.longitude), starLon).toFixed(2)),
      }))
      .filter((c) => c.orbDeg <= maxOrb)
      .sort((a, b) => a.orbDeg - b.orbDeg);

    const { personalHouseReading, sabotageOrShadowRisk } = buildPersonalStarReading(
      starName,
      profile,
      sign,
      house,
      houseArena,
      natalConjunctions
    );

    return {
      id: `star-pos-${starName}`,
      starName,
      starLongitude: starLon,
      starDisplay: frozenRow?.display ?? formatLongitude(starLon),
      sign,
      house,
      houseArena,
      isRoyal,
      isKeyMarker: isRoyal || KEY_MARKER_STARS.has(starName) || natalConjunctions.length > 0,
      archetype: profile.archetype,
      nature: profile.nature,
      everydayMeaning: profile.everydayMeaning,
      watchOutFor: profile.watchOutFor,
      natalConjunctions,
      personalHouseReading,
      sabotageOrShadowRisk,
    };
  });

  // 3. Hermetic / Arabic Lots & Live Transits Hitting Lots Today
  if (ascLon == null || !sun || !chart.movingBodies?.find(b => b.name === "Moon")) {
    return {
      sect,
      lotsAvailable: false,
      lotsUnavailableReason:
        "Hermetic Arabic Lots require an exact birth time (local Ascendant). Add your birth time in Profile to unlock all 7 Lots.",
      liveSkyStars,
      natalTriggeredStars,
      natalAnchorStars,
      natalStarPositions,
      lots: [],
      activeLotHits: [],
    };
  }

  const bodyLon = (name: string) => {
    const found = chart.movingBodies.find(b => b.name === name);
    return found && Number.isFinite(found.longitude)
      ? normalizeLongitude(found.longitude)
      : undefined;
  };
  const sunLon = bodyLon("Sun")!;
  const moonLon = bodyLon("Moon")!;
  const mercuryLon = bodyLon("Mercury");
  const venusLon = bodyLon("Venus");
  const marsLon = bodyLon("Mars");
  const jupiterLon = bodyLon("Jupiter");
  const saturnLon = bodyLon("Saturn");

  const isDay = sect === "day";
  const fortuneLon = isDay
    ? normalizeLongitude(ascLon + moonLon - sunLon)
    : normalizeLongitude(ascLon + sunLon - moonLon);
  const spiritLon = isDay
    ? normalizeLongitude(ascLon + sunLon - moonLon)
    : normalizeLongitude(ascLon + moonLon - sunLon);

  const computedLots: Array<[ArabicLotMeta["id"], number | undefined]> = [
    ["fortune", fortuneLon],
    ["spirit", spiritLon],
    [
      "eros",
      venusLon != null
        ? isDay
          ? normalizeLongitude(ascLon + venusLon - spiritLon)
          : normalizeLongitude(ascLon + spiritLon - venusLon)
        : undefined,
    ],
    [
      "necessity",
      mercuryLon != null
        ? isDay
          ? normalizeLongitude(ascLon + fortuneLon - mercuryLon)
          : normalizeLongitude(ascLon + mercuryLon - fortuneLon)
        : undefined,
    ],
    [
      "courage",
      marsLon != null
        ? isDay
          ? normalizeLongitude(ascLon + fortuneLon - marsLon)
          : normalizeLongitude(ascLon + marsLon - fortuneLon)
        : undefined,
    ],
    [
      "victory",
      jupiterLon != null
        ? isDay
          ? normalizeLongitude(ascLon + jupiterLon - spiritLon)
          : normalizeLongitude(ascLon + spiritLon - jupiterLon)
        : undefined,
    ],
    [
      "nemesis",
      saturnLon != null
        ? isDay
          ? normalizeLongitude(ascLon + fortuneLon - saturnLon)
          : normalizeLongitude(ascLon + saturnLon - fortuneLon)
        : undefined,
    ],
  ];

  const lots: ArabicLotEnergyEntry[] = [];
  const activeLotHits: Array<{ lot: ArabicLotEnergyEntry; aspect: LotTransitAspect }> = [];

  for (const [id, lon] of computedLots) {
    if (lon == null) continue;
    const meta = ARABIC_LOT_META[id];
    const sign = ZODIAC_SIGNS[Math.floor(lon / 30)];
    const house = chart.worldview === "god"
      ? Math.floor(lon / 30) + 1
      : (Math.floor(normalizeLongitude(lon - ascLon) / 30) % 12) + 1;
    const houseArena = LOT_HOUSE_ARENA[house] ?? `House ${house}`;

    // Fixed stars aligned with this natal Lot
    const natalStarContacts: ArabicLotEnergyEntry["natalStarContacts"] = [];
    for (const [starName, starLonRaw] of FIXED_STARS) {
      const isRoyal = ROYAL_STARS.has(starName);
      const maxOrb = isRoyal ? 4.0 : 1.5;
      const dist = Number(angularDistanceDeg(lon, normalizeLongitude(starLonRaw)).toFixed(2));
      if (dist <= maxOrb) {
        natalStarContacts.push({ starName, isRoyal, orbDeg: dist });
      }
    }
    natalStarContacts.sort((a, b) => a.orbDeg - b.orbDeg);

    // Natal planets contacting this Lot (bonus texture, never required for interpretation)
    const natalPlanetContacts: ArabicLotEnergyEntry["natalPlanetContacts"] = [];
    for (const body of natalPoints) {
      if (!Number.isFinite(body.longitude)) continue;
      const sep = angularDistanceDeg(normalizeLongitude(body.longitude), lon);
      const best = ASPECT_ANGLES.map((a) => ({
        ...a,
        orb: Number(Math.abs(sep - a.angle).toFixed(2)),
      }))
        .filter((a) => a.orb <= (a.isMajor ? 4 : 2))
        .sort((a, b) => a.orb - b.orb)[0];
      if (best) {
        natalPlanetContacts.push({
          bodyName: body.name,
          aspect: best.aspect,
          orbDeg: best.orb,
        });
      }
    }
    natalPlanetContacts.sort((a, b) => a.orbDeg - b.orbDeg);

    // Live transits contacting this Lot today
    const liveTransits: LotTransitAspect[] = [];
    for (const t of chart.transits ?? []) {
      if (!Number.isFinite(t.longitude)) continue;
      const sep = angularDistanceDeg(normalizeLongitude(t.longitude), lon);
      const best = ASPECT_ANGLES.map(a => ({
        ...a,
        orb: Number(Math.abs(sep - a.angle).toFixed(2)),
      }))
        .filter(a => a.orb <= ENERGY_MAX_ORB)
        .sort((a, b) => (b.isMajor !== a.isMajor ? (b.isMajor ? 1 : -1) : a.orb - b.orb))[0];

      if (best) {
        const flow = ENERGY_ASPECT_FLOW[best.aspect] ?? 0;
        const intensity = energyIntensity(best.orb);
        const weight = Number((intensity * (best.isMajor ? 1 : 0.5)).toFixed(2));
        liveTransits.push({
          id: `${t.name}-${best.aspect}-lot-${id}`,
          transitPlanet: t.name,
          aspect: best.aspect,
          orbDeg: best.orb,
          isMajor: best.isMajor,
          flow,
          weight,
          realLifeTakeaway: buildLotAspectTakeaway(meta, t.name, best.aspect, flow),
        });
      }
    }
    liveTransits.sort((a, b) =>
      b.isMajor !== a.isMajor ? (b.isMajor ? 1 : -1) : a.orbDeg - b.orbDeg
    );

    const personalPlacementReading = buildPersonalLotReading(
      meta,
      sign,
      house,
      houseArena,
      natalPlanetContacts
    );

    const topHit = liveTransits[0];
    const summaryToday = topHit
      ? `${topHit.realLifeTakeaway} (${topHit.orbDeg.toFixed(2)}° orb, affecting ${houseArena}).`
      : personalPlacementReading;

    const entry: ArabicLotEnergyEntry = {
      meta,
      sect,
      longitude: Number(lon.toFixed(4)),
      display: formatLongitude(lon),
      sign,
      house,
      houseArena,
      formulaUsed: isDay ? meta.dayFormula : meta.nightFormula,
      natalStarContacts,
      natalPlanetContacts,
      liveTransits,
      personalPlacementReading,
      summaryToday,
    };
    lots.push(entry);

    for (const hit of liveTransits) {
      activeLotHits.push({ lot: entry, aspect: hit });
    }
  }

  activeLotHits.sort((a, b) =>
    b.aspect.isMajor !== a.aspect.isMajor
      ? b.aspect.isMajor
        ? 1
        : -1
      : a.aspect.orbDeg - b.aspect.orbDeg
  );

  return {
    sect,
    lotsAvailable: true,
    liveSkyStars,
    natalTriggeredStars,
    natalAnchorStars,
    natalStarPositions,
    lots,
    activeLotHits,
  };
}
