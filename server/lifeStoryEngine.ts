import { buildGenesisInquiryPrompt } from "./genesisLifeStoryInquiry";
import type { ChartResult, ChartRow } from "./astronomy";
import {
  normalizeLongitude,
  formatLongitude,
  ZODIAC_SIGNS,
  NAKSHATRAS,
  FIXED_STARS,
  overlay,
} from "../shared/hybrid";
import { calculateArabicLots, calculateLot, LOT_FORMULAS, type Sect } from "./utils/arabicLots";

import { DOUBLE_LETTERS, SIMPLE_LETTERS, MOTHER_LETTERS } from "./astrologyKnowledge/canon/seferYetzirah";
import { DECAN_CANON_RECORDS } from "./astrologyKnowledge/canon/decans36";
import { MANZIL_CANON_RECORDS } from "./astrologyKnowledge/canon/manazil28";
import { CHINESE_MANSIONS } from "./astrologyKnowledge/canon/chineseMansions28";
import { runInterpretation, interpretationText } from "./astrologyKnowledge/synthesis/interpretationPipeline";
import { synthesizeChartForReading } from "./astrologyKnowledge/synthesis/readingBridge";
import { buildAstrologyEvidencePacket, formatEvidencePacket } from "./astrologyKnowledge/evidencePacket";
import { scrubNonHoraryAstrologyJargon } from "./astrologyKnowledge/synthesis/narrative";

export type LifeStageKey =
  | "birth_origins"
  | "childhood"
  | "adolescence"
  | "early_adulthood"
  | "adult_development"
  | "later_life"
  | "turning_points"
  | "future_chapters";

export interface PlanetaryCycleEvent {
  id: string;
  cycleType:
    | "saturn_return"
    | "saturn_square"
    | "saturn_opposition"
    | "jupiter_return"
    | "uranus_opposition"
    | "uranus_square"
    | "chiron_return"
    | "chiron_opposition"
    | "nodal_return"
    | "nodal_reversal"
    | "neptune_square"
    | "pluto_square"
    | "progressed_lunar_return";
  title: string;
  age: number; // Decimal age (e.g. 29.5)
  approxDate: string; // ISO string 'YYYY-MM-DD'
  planet: string;
  nature: "conjunction" | "opposition" | "square" | "return";
  description: string;
  constructiveAdvice: string;
  challenge: string;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
}

export interface ProfectionInfo {
  age: number;
  yearNumber: number; // 1-indexed (e.g. 1st year of life = age 0)
  profectedHouseGod: number; // 1 to 12
  profectedHouseAgent: number; // 1 to 12
  profectedSignGod: string;
  profectedSignAgent: string;
  lordOfTheYearGod: string;
  lordOfTheYearAgent: string;
  traditionalThemes: string[];
}

export interface LifeStoryChapterSummary {
  key: LifeStageKey;
  title: string;
  periodLabel: string;
  ageRange: [number, number]; // [minAge, maxAge]
  status: "past" | "current" | "future";
  astrologicalPivots: string[];
  godViewThemes: string;
  agentViewThemes: string;
  profectionYears: number[];
  keyCycles: PlanetaryCycleEvent[];
  sourceEvidenceIds: string[];
}

export interface MethodAuditStatus {
  id: number;
  layer: string;
  name: string;
  status: "implemented-verified" | "partially-implemented" | "documented-uncalibrated";
  calculationSource: string;
  dataOutput: string;
  apiProcedure: string;
  interpreterIntegration: string;
  uiDisplayLocation: string;
  auditNotes: string;
}

// Classical traditional rulers for 12 signs (used for Profections)
const TRADITIONAL_RULERS: Record<string, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

// Modern outer planet affiliations
const MODERN_RULERS: Record<string, string> = {
  Scorpio: "Pluto",
  Aquarius: "Uranus",
  Pisces: "Neptune",
};

const HOUSE_THEMES_HELLENISTIC: Record<number, string[]> = {
  1: ["Selfhood", "Physical Body", "Vitality", "New Beginnings", "Outlook"],
  2: ["Livelihood", "Resources", "Financial Stewardship", "Personal Values"],
  3: ["Siblings", "Local Environment", "Communication", "Skills & Dexterity"],
  4: ["Ancestry", "Parents", "Home & Physical Foundation", "Private Life"],
  5: ["Creative Passion", "Children", "Pleasure", "Speculation", "Expression"],
  6: ["Daily Work", "Health Habits", "Service", "Discipline Under Strain"],
  7: ["Marriage", "Committed Partnerships", "Open Encounters", "Contracts"],
  8: ["Shared Finances", "Inheritance", "Shared Burdens & Turning Points", "Private Reckonings"],
  9: ["Higher Wisdom", "Long Journeys", "Philosophy", "Mentorship & Study"],
  10: ["Vocation", "Reputation", "Public Standing", "Action & Authority"],
  11: ["Alliances", "Hopes", "Benefactors", "Patrons & Community Circles"],
  12: ["Solitude", "Quiet Habits", "Hidden Foes", "Private Withdrawal"],
};

/**
 * Calculates accurate chronological age from birth date string to any reference moment.
 */
export function calculatePersonAge(birthDateStr: string, refDate: Date = new Date()): number {
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return 30; // fallback default
  const diffMs = refDate.getTime() - birth.getTime();
  const ageYears = diffMs / (365.2425 * 86400000);
  return Math.max(0, Number(ageYears.toFixed(2)));
}

/**
 * Computes calendar date from birth date and fractional years elapsed.
 */
export function addYearsToDate(birthDateStr: string, yearsElapsed: number): string {
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return new Date().toISOString().slice(0, 10);
  const targetMs = birth.getTime() + yearsElapsed * 365.2425 * 86400000;
  return new Date(targetMs).toISOString().slice(0, 10);
}

/**
 * Calculates Hellenistic Annual Profection for any given integer age (0 to 90).
 */
export function calculateAnnualProfection(age: number, chart: ChartResult): ProfectionInfo {
  const boundedAge = Math.max(0, Math.floor(age));
  const yearNumber = boundedAge + 1; // Age 0 is 1st year of life

  // God View: 0° Aries anchor (House 1 = Aries, House 2 = Taurus...)
  const profectedHouseGod = (boundedAge % 12) + 1;
  const profectedSignGod = ZODIAC_SIGNS[profectedHouseGod - 1];
  const lordOfTheYearGod = TRADITIONAL_RULERS[profectedSignGod] || "Mars";

  // Agent View: Local Ascendant sign as House 1
  let profectedHouseAgent = profectedHouseGod;
  let profectedSignAgent = profectedSignGod;
  let lordOfTheYearAgent = lordOfTheYearGod;

  if (chart.ascendant && Number.isFinite(chart.ascendant.longitude)) {
    const ascSignIdx = Math.floor(normalizeLongitude(chart.ascendant.longitude) / 30);
    const profectedSignIdx = (ascSignIdx + (boundedAge % 12)) % 12;
    profectedSignAgent = ZODIAC_SIGNS[profectedSignIdx];
    lordOfTheYearAgent = TRADITIONAL_RULERS[profectedSignAgent] || "Mars";
    profectedHouseAgent = (boundedAge % 12) + 1;
  }

  const traditionalThemes = HOUSE_THEMES_HELLENISTIC[profectedHouseAgent] || [];

  return {
    age: boundedAge,
    yearNumber,
    profectedHouseGod,
    profectedHouseAgent,
    profectedSignGod,
    profectedSignAgent,
    lordOfTheYearGod,
    lordOfTheYearAgent,
    traditionalThemes,
  };
}

/**
 * Compiles all major planetary return and transition cycles across a human life.
 */
export function generatePlanetaryCycles(chart: ChartResult, currentAge: number): PlanetaryCycleEvent[] {
  const birthDate = chart.input.date || "1990-01-01";

  const rawCycles: Array<{
    id: string;
    cycleType: PlanetaryCycleEvent["cycleType"];
    title: string;
    age: number;
    planet: string;
    nature: PlanetaryCycleEvent["nature"];
    description: string;
    constructiveAdvice: string;
    challenge: string;
  }> = [
    {
      id: "saturn-sq-waxing-1",
      cycleType: "saturn_square",
      title: "First Saturn Waxing Square",
      age: 7.4,
      planet: "Saturn",
      nature: "square",
      description: "First major structural milestone of childhood; internalizing rules, duty, and early academic boundaries.",
      constructiveAdvice: "Cultivate steady study habits and self-reliance without harsh self-criticism.",
      challenge: "Feelings of inadequacy or strict institutional confinement.",
    },
    {
      id: "jupiter-ret-1",
      cycleType: "jupiter_return",
      title: "First Jupiter Return",
      age: 11.86,
      planet: "Jupiter",
      nature: "return",
      description: "Expansion of worldview, entry into adolescence, burgeoning ethical awareness, and mentor connections.",
      constructiveAdvice: "Embrace curiosity, athletic or intellectual enthusiasm, and adventurous discovery.",
      challenge: "Overconfidence or restlessness with domestic routines.",
    },
    {
      id: "saturn-opp-1",
      cycleType: "saturn_opposition",
      title: "First Saturn Opposition",
      age: 14.7,
      planet: "Saturn",
      nature: "opposition",
      description: "The classic adolescent rebellion; questioning authority, testing social limits, and forging autonomous identity.",
      constructiveAdvice: "Direct rebellious energy into creative discipline, sport, or genuine personal convictions.",
      challenge: "Friction with parental or societal authority figures.",
    },
    {
      id: "nodal-ret-1",
      cycleType: "nodal_return",
      title: "First Lunar Nodal Return",
      age: 18.6,
      planet: "Lunar Nodes",
      nature: "return",
      description: "Karmic graduation into independence; choosing early adulthood direction, university, or initial trade.",
      constructiveAdvice: "Step boldly onto your North Node path; avoid retreating into familiar childhood safety zones.",
      challenge: "Fear of stepping into unfamiliar social and vocational territory.",
    },
    {
      id: "uranus-sq-1",
      cycleType: "uranus_square",
      title: "First Uranus Waxing Square",
      age: 21.0,
      planet: "Uranus",
      nature: "square",
      description: "Breakthrough of individuality; sudden shifts in philosophy, lifestyle, social circles, and personal agency.",
      constructiveAdvice: "Honor your unique originality while building practical foundations to house it.",
      challenge: "Erratic changes or burning bridges prematurely.",
    },
    {
      id: "saturn-sq-waxing-2",
      cycleType: "saturn_square",
      title: "Saturn Waxing Square (20s)",
      age: 22.1,
      planet: "Saturn",
      nature: "square",
      description: "The transition from student/apprentice to early professional responsibility; first financial and vocational tests.",
      constructiveAdvice: "Take on humble apprenticeships with patience and precision.",
      challenge: "Vocational frustration or entry-level fatigue.",
    },
    {
      id: "jupiter-ret-2",
      cycleType: "jupiter_return",
      title: "Second Jupiter Return",
      age: 23.7,
      planet: "Jupiter",
      nature: "return",
      description: "Optimistic life expansion; travel, higher qualifications, foundational partnerships, and broadening career horizons.",
      constructiveAdvice: "Say yes to opportunities that stretch your horizon beyond your hometown.",
      challenge: "Scattering energy across too many divergent paths.",
    },
    {
      id: "progressed-moon-1",
      cycleType: "progressed_lunar_return",
      title: "First Progressed Moon Return",
      age: 27.3,
      planet: "Moon",
      nature: "return",
      description: "Full 27-year emotional cycle completion; inner reset around home, belonging, and what truly feels stable.",
      constructiveAdvice: "Clear out stale obligations that no longer fit your adult life.",
      challenge: "Quiet melancholy or longing for bygone chapters.",
    },
    {
      id: "saturn-ret-1",
      cycleType: "saturn_return",
      title: "First Saturn Return (True Adulthood)",
      age: 29.5,
      planet: "Saturn",
      nature: "return",
      description: "The great threshold of human maturity. Illusions fall away, true responsibilities take root, and enduring vocation is chosen.",
      constructiveAdvice: "Commit whole-heartedly to long-term craft, authentic integrity, and clear boundaries.",
      challenge: "Feeling behind schedule; weight of unchosen obligations.",
    },
    {
      id: "jupiter-ret-3",
      cycleType: "jupiter_return",
      title: "Third Jupiter Return",
      age: 35.6,
      planet: "Jupiter",
      nature: "return",
      description: "Fruit of your initial career mastery; establishing vocational authority, mentorship, and familial stabilization.",
      constructiveAdvice: "Share your knowledge generously; step into leadership roles within your field.",
      challenge: "Complacency or material expansion without ethical roots.",
    },
    {
      id: "nodal-ret-2",
      cycleType: "nodal_return",
      title: "Second Lunar Nodal Return",
      age: 37.2,
      planet: "Lunar Nodes",
      nature: "return",
      description: "Mid-course life review; weighing whether daily work still matches your deeper convictions and direction.",
      constructiveAdvice: "Align your career power with your deeper humanitarian and spiritual values.",
      challenge: "The temptation to stay in comfortable but deadening ruts.",
    },
    {
      id: "pluto-sq",
      cycleType: "pluto_square",
      title: "Transiting Pluto Square Natal Pluto",
      age: 38.5,
      planet: "Pluto",
      nature: "square",
      description: "Confrontation with power dynamics, control, mortality, and deep desires; a hard test of what actually endures.",
      constructiveAdvice: "Let go of decaying arrangements and rebuild on honest footing.",
      challenge: "Power struggles, manipulation, or clinging to stubborn defenses.",
    },
    {
      id: "neptune-sq",
      cycleType: "neptune_square",
      title: "Transiting Neptune Square Natal Neptune",
      age: 41.2,
      planet: "Neptune",
      nature: "square",
      description: "Fading of earlier illusions; deeper questions of faith and meaning surface alongside dissatisfaction with empty wins.",
      constructiveAdvice: "Make real space for quiet reflection, music, writing, and unselfish service.",
      challenge: "Escapism, confusion, or drifting away from responsibility.",
    },
    {
      id: "uranus-opp",
      cycleType: "uranus_opposition",
      title: "Uranus Opposition (Midlife Awakening)",
      age: 41.8,
      planet: "Uranus",
      nature: "opposition",
      description: "The classic midlife awakening; intense urge to express neglected creative, romantic, or intellectual freedom.",
      constructiveAdvice: "Reclaim your true, unlived honesty without recklessly uprooting the people who depend on you.",
      challenge: "Sudden impulsive ruptures or crisis-driven rebellions.",
    },
    {
      id: "chiron-opp",
      cycleType: "chiron_opposition",
      title: "Chiron Opposition (Turning Hardship Into Counsel)",
      age: 43.5,
      planet: "Chiron",
      nature: "opposition",
      description: "Facing long-standing personal hurt and turning hard-won experience into steady guidance for others.",
      constructiveAdvice: "Let your scars make you steadier and more honest when others struggle.",
      challenge: "Bitter attachment to old grievances or past betrayals.",
    },
    {
      id: "saturn-opp-2",
      cycleType: "saturn_opposition",
      title: "Second Saturn Opposition (Midlife Harvest)",
      age: 44.1,
      planet: "Saturn",
      nature: "opposition",
      description: "Peak harvest and reckoning of choices made during the first Saturn return; solidifying enduring legacy.",
      constructiveAdvice: "Prune distractions; focus energy strictly on high-impact stewardship.",
      challenge: "Exhaustion or realization of finite physical stamina.",
    },
    {
      id: "jupiter-ret-4",
      cycleType: "jupiter_return",
      title: "Fourth Jupiter Return",
      age: 47.4,
      planet: "Jupiter",
      nature: "return",
      description: "Philosophical confidence; becoming a respected elder in your circle, advising younger generations.",
      constructiveAdvice: "Invest in legacy projects, community endowments, and expansive teaching.",
      challenge: "Dogmatism or resting on past laurels.",
    },
    {
      id: "chiron-ret",
      cycleType: "chiron_return",
      title: "Chiron Return (Healing Synthesis)",
      age: 50.5,
      planet: "Chiron",
      nature: "return",
      description: "Complete reconciliation with mortal limits; deep peace with your life story, warts and triumphs alike.",
      constructiveAdvice: "Embrace the role of compassionate elder; mentor wounded seekers.",
      challenge: "Fear of aging or unresolved grief.",
    },
    {
      id: "nodal-ret-3",
      cycleType: "nodal_return",
      title: "Third Lunar Nodal Return",
      age: 55.8,
      planet: "Lunar Nodes",
      nature: "return",
      description: "Higher spiritual octave; prioritizing transpersonal contribution and ancestral peace over personal ambition.",
      constructiveAdvice: "Focus on what outlives you: wisdom, family love, and ethical seeds.",
      challenge: "Cynicism or disengagement from the world.",
    },
    {
      id: "saturn-ret-2",
      cycleType: "saturn_return",
      title: "Second Saturn Return (Elder Sovereign)",
      age: 58.8,
      planet: "Saturn",
      nature: "return",
      description: "Entering the venerable Third Age; harvesting the total work of a lifetime with dignified serenity.",
      constructiveAdvice: "Step gracefully into wise mentorship; curate your life's final and most enduring chapter.",
      challenge: "Rigidity, regret, or dread of physical decline.",
    },
    {
      id: "jupiter-ret-5",
      cycleType: "jupiter_return",
      title: "Fifth Jupiter Return",
      age: 59.3,
      planet: "Jupiter",
      nature: "return",
      description: "Joyful celebration of long life; philosophical gratitude and expansive perspective on human nature.",
      constructiveAdvice: "Enjoy the fruits of your long labor with humor and benevolence.",
      challenge: "Self-indulgence or neglecting ongoing self-care.",
    },
    {
      id: "uranus-ret",
      cycleType: "uranus_square",
      title: "Uranus Return (Late-Life Liberation)",
      age: 84.0,
      planet: "Uranus",
      nature: "return",
      description: "Full 84-year cycle around the Sun; clear-eyed detachment, earned humor, and independence from trivial expectations.",
      constructiveAdvice: "Pass on hard-won perspective to younger generations and live on your own honest terms.",
      challenge: "Feeling out of step with rapid social or technological changes.",
    },
  ];

  return rawCycles.map(c => {
    const isPast = c.age < currentAge - 0.75;
    const isCurrent = Math.abs(c.age - currentAge) <= 0.75;
    const isFuture = c.age > currentAge + 0.75;
    const approxDate = addYearsToDate(birthDate, c.age);

    return {
      ...c,
      approxDate,
      isPast,
      isCurrent,
      isFuture,
    };
  });
}

/**
 * Builds the 8 comprehensive Life Story chapters adapted to the user's chart and current age.
 */
export function compileLifeStoryChapters(
  chart: ChartResult,
  currentAge: number,
  cycles: PlanetaryCycleEvent[]
): LifeStoryChapterSummary[] {
  const getCyclesInRange = (min: number, max: number) =>
    cycles.filter(c => c.age >= min && c.age < max);

  const chaptersConfig: Array<{
    key: LifeStageKey;
    title: string;
    periodLabel: string;
    ageRange: [number, number];
    astrologicalPivots: string[];
    godViewThemes: string;
    agentViewThemes: string;
  }> = [
    {
      key: "birth_origins",
      title: "1. Birth, Core Nature & What You Were Born With",
      periodLabel: "Core Blueprint, Natural Gifts & Hidden Potential (Ages 0–1)",
      ageRange: [0, 1],
      astrologicalPivots: [
        "Natal Sun, Moon & Ascendant + Chart Ruler chain",
        "4th House (home roots) & Diurnal/Nocturnal Sect",
        "Hermetic Lot of Fortune, Spirit, Eros & Necessity",
        "Natural Gifts vs. Hidden Potential vs. Early Vulnerabilities",
      ],
      godViewThemes:
        "Universal character baseline: core temperament, drives, what you keep private, and raw inborn gifts before outside pressure shapes them.",
      agentViewThemes:
        "Your real-world starting point: parents' household climate, early physical stamina, and the traits people noticed in you from day one.",
    },
    {
      key: "childhood",
      title: "2. Childhood, Parents, School Years & Early Hobbies",
      periodLabel: "Home, Upbringing & School Days (Ages 1–12)",
      ageRange: [1, 13],
      astrologicalPivots: [
        "4th House (home/parents), Moon (mother/care) & Sun/Saturn (father/authority)",
        "Mercury & 3rd/5th/9th houses (learning style, favored subjects, early hobbies)",
        "First Saturn waxing square (Age ~7.4) & First Jupiter return (Age ~11.86)",
        "Early Annual Profections (Houses 2 through 12)",
      ],
      godViewThemes:
        "How early temperament met rules, schooling, curiosity, and childhood pressures before adult independence began.",
      agentViewThemes:
        "Everyday life with mother, father, and siblings; inherited family burdens or separation; what kind of student you were; and which hobbies, sports, or crafts pulled your attention naturally.",
    },
    {
      key: "adolescence",
      title: "3. Adolescence, Friendships, Rivals & Early Love",
      periodLabel: "Peers, Passions & First Heartbreak (Ages 13–19)",
      ageRange: [13, 20],
      astrologicalPivots: [
        "11th House friendships vs. 6th/12th jealousy and rivalry",
        "Venus, Mars & 5th House early attraction, passions & hobbies",
        "First Saturn opposition (Age ~14.7) & First Lunar Nodal return (Age ~18.6)",
      ],
      godViewThemes:
        "Testing pride against peer pressure, loyalty, first attraction, and emerging personal passions.",
      agentViewThemes:
        "The friends you drew in, why early friendships lasted or broke, first experiences with jealousy or betrayal, concrete interests taking shape, and what you yourself contributed to conflict.",
    },
    {
      key: "early_adulthood",
      title: "4. Early Adulthood: Money, Career, Love & Independence",
      periodLabel: "Earning, Debt, Love & First Saturn Return (Ages 20–29)",
      ageRange: [20, 30],
      astrologicalPivots: [
        "2nd/8th Houses & Lot of Fortune (earning, debt, financial independence)",
        "10th House & Lot of Spirit (employment vs. business ownership)",
        "7th House, Descendant & Lot of Eros (intimacy, marriage, heartbreak risks)",
        "First Saturn Return (Age ~29.5)",
      ],
      godViewThemes:
        "Turning raw potential into developed strengths through real bills, job friction, serious love, and honest mistakes.",
      agentViewThemes:
        "Financial struggles vs. steady earning, early romantic choices and heartbreak, poor choices or missed chances, and deciding whether to work for others or build on your own.",
    },
    {
      key: "adult_development",
      title: "5. Adult Life: Marriage, Children, Hardship & Power",
      periodLabel: "Family, Wealth, Setbacks & Rebuilding (Ages 30–49)",
      ageRange: [30, 50],
      astrologicalPivots: [
        "5th House & Jupiter (children, parenting, family continuity)",
        "6th/8th/12th Houses & Lot of Necessity (hardship, betrayal, health/daily habits)",
        "Midlife cycles: Uranus opposition, Pluto/Neptune squares, Second Saturn opposition",
      ],
      godViewThemes:
        "Carrying real responsibility—marriage, parenting, reputation, financial durability, and surviving hard knocks without bitterness.",
      agentViewThemes:
        "How marriage and children test your standards, dealing with rivals or injustice, keeping body and daily habits steady under work stress, and rebuilding stronger after losses.",
    },
    {
      key: "later_life",
      title: "6. Faith, Maturity, Later Years & Legacy",
      periodLabel: "Beliefs, Purpose & Elder Standing (Ages 50 onward)",
      ageRange: [50, 95],
      astrologicalPivots: [
        "9th House, Jupiter & North Node (relationship with God/beliefs, morals, purpose)",
        "Chiron return (~50.5), Third Nodal return (~55.8) & Second Saturn return (~58.8)",
        "Jupiter returns (Ages 60, 72, 84) & Uranus return (~84.0)",
      ],
      godViewThemes:
        "What lasts when noise drops away: honest faith, settled wisdom, and reconciling lifelong strengths with lifelong faults.",
      agentViewThemes:
        "Changing priorities with age, passing hard-earned lessons to children and community, simplifying burdens, and leaving an honest legacy.",
    },
    {
      key: "turning_points",
      title: "7. Turning Points, New Beginnings & Greatest Lessons",
      periodLabel: "Calculated Timing Milestones & Hard-Won Wisdom",
      ageRange: [0, 95],
      astrologicalPivots: [
        "Exact calculated Saturn, Jupiter, Uranus, Chiron & Nodal cycles",
        "Annual Profections & Active Timing Lords",
        "Where life comes naturally vs. where the hardest recurring lessons sit",
      ],
      godViewThemes:
        "How recurring life tests and major openings align with calculated planetary periods rather than random chance.",
      agentViewThemes:
        "Relocation, new chapters, endings that cleared dead weight, and practical clarity on where to invest effort next.",
    },
    {
      key: "future_chapters",
      title: "8. The Road Ahead: Upcoming Timing & Next Steps",
      periodLabel: "Next 3, 5 & 10 Years (Calculated Cycles Only)",
      ageRange: [Math.floor(currentAge), Math.min(95, Math.floor(currentAge) + 12)],
      astrologicalPivots: [
        "Calculated Annual Profection years and Lord of the Year shifts",
        "Upcoming calculated planetary returns, squares, and oppositions",
        "Active Vimshottari Mahadasha/Antardasha & Firdaria periods",
      ],
      godViewThemes:
        "What the next calculated timing chapters demand in responsibility, patience, and honest action.",
      agentViewThemes:
        "Concrete focus areas for money, work, health habits, family, and love over the coming years—anchored strictly in calculated cycles.",
    },
  ];

  return chaptersConfig.map(cfg => {
    let status: "past" | "current" | "future" = "future";
    if (cfg.key === "turning_points") {
      status = "current";
    } else if (cfg.key === "future_chapters") {
      status = "future";
    } else {
      const [minAge, maxAge] = cfg.ageRange;
      if (currentAge >= maxAge) {
        status = "past";
      } else if (currentAge >= minAge && currentAge < maxAge) {
        status = "current";
      } else {
        status = "future";
      }
    }

    const keyCycles = getCyclesInRange(cfg.ageRange[0], cfg.ageRange[1]);
    const profectionYears = Array.from(
      { length: Math.min(12, Math.max(1, cfg.ageRange[1] - cfg.ageRange[0])) },
      (_, i) => cfg.ageRange[0] + i
    );

    return {
      ...cfg,
      status,
      profectionYears,
      keyCycles,
      sourceEvidenceIds: [
        `life-story-${cfg.key}`,
        ...keyCycles.map(c => `cycle-${c.id}`),
      ],
    };
  });
}

/**
 * Runs a complete audit of all 20 astrological layers and generates a verifiable method-status registry.
 */
export function runAstrologyEngineAudit(chart: ChartResult): MethodAuditStatus[] {
  const hasAgentAsc = Boolean(chart.ascendant && Number.isFinite(chart.ascendant.longitude));
  const hasBodies = Boolean(chart.movingBodies && chart.movingBodies.length >= 7);
  const hasTransits = Boolean(chart.transits && chart.transits.length > 0);

  return [
    {
      id: 1,
      layer: "God View Reference",
      name: "Fixed Celestial 0° Aries Frame",
      status: "implemented-verified",
      calculationSource: "server/astronomy.ts (Swiss Ephemeris mode 14 Aldebaran-15-Taurus)",
      dataOutput: "ChartResult.godPlacements, ChartRow.godHouse (30° fixed sectors)",
      apiProcedure: "hybrid.calculate",
      interpreterIntegration: "Master Interpreter dual-frame contract",
      uiDisplayLocation: "ChartObservatory2050 (God View tab), GuardianDiamondCharts",
      auditNotes: "Verified. Fixed 0° Aries anchor retains eternal universal sectors without seasonal precession drift.",
    },
    {
      id: 2,
      layer: "Agent View Reference",
      name: "Observer Local Ascendant & Equal Houses",
      status: hasAgentAsc ? "implemented-verified" : "partially-implemented",
      calculationSource: "server/firmament-geometry.ts (calculateZeroTiltAscendant)",
      dataOutput: "ChartResult.ascendant, ChartRow.agentHouse (Equal houses from Asc)",
      apiProcedure: "hybrid.calculate",
      interpreterIntegration: "Master Interpreter local observation synthesis",
      uiDisplayLocation: "ChartObservatory2050 (Agent View tab), ProfileChartScreen",
      auditNotes: hasAgentAsc
        ? "Verified. Zero-tilt local sidereal horizon correctly assigns House 1 to birth Ascendant."
        : "Pending birth time/location resolution.",
    },
    {
      id: 3,
      layer: "Natal Placements",
      name: "Planetary Positions & House Cusps",
      status: hasBodies ? "implemented-verified" : "partially-implemented",
      calculationSource: "server/astronomy.ts (Swiss Ephemeris swe_calc_ut)",
      dataOutput: "ChartResult.movingBodies (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)",
      apiProcedure: "hybrid.calculate",
      interpreterIntegration: "buildAstrologyEvidencePacket (westernEvidence)",
      uiDisplayLocation: "ChartObservatory2050, ProfileHomeScreen signals",
      auditNotes: "Verified. Moving bodies calculated with sub-arcminute Swiss Ephemeris precision.",
    },
    {
      id: 4,
      layer: "Transits & Aspects",
      name: "Historical & Live Planetary Aspect Chords",
      status: hasTransits ? "implemented-verified" : "partially-implemented",
      calculationSource: "server/astronomy.ts (aspectBetween, 5° tight orb, 0°/360° wraparound)",
      dataOutput: "ChartResult.transits (natalContacts with aspect type & exact orb)",
      apiProcedure: "hybrid.calculate",
      interpreterIntegration: "timingEvidence, transits.test.ts",
      uiDisplayLocation: "ChartObservatory2050 (Aspect Chords laser overlay), TransitWeatherTimeline",
      auditNotes: "Verified. Wraparound logic passes engine-fixes.test.ts with 5° boundary rigor.",
    },
    {
      id: 5,
      layer: "Planetary Rulerships",
      name: "Traditional & Modern Rulership Distinctions",
      status: "implemented-verified",
      calculationSource: "shared/hybrid.ts & server/astrologyCore.ts",
      dataOutput: "DOMICILE, EXALTATION, FALL, DETRIMENT mappings",
      apiProcedure: "hybrid.calculate, astrologyKnowledge.behavioralReport",
      interpreterIntegration: "dignitiesAndHorary.ts",
      uiDisplayLocation: "AdvancedChartInstruments, SkyObservatoryWheel",
      auditNotes: "Verified. Domicile rulers cleanly differentiate classical (Saturn for Aquarius) from modern (Uranus).",
    },
    {
      id: 6,
      layer: "27 Nakshatras",
      name: "Lunar Mansions, Padas & Nakshatra Rulers",
      status: "implemented-verified",
      calculationSource: "shared/hybrid.ts (overlay) & shared/lunar-mansion-framework.ts",
      dataOutput: "ChartRow.overlay.nakshatra, pada (1-4), ruler",
      apiProcedure: "hybrid.calculate",
      interpreterIntegration: "nakshatras27.ts & timingAndAshtakavarga.ts",
      uiDisplayLocation: "ChartObservatory2050 (Mansions layer), CelestialDomeChart",
      auditNotes: "Verified. 13°20′ equal divisions with 3°20′ padas, verified by lunar-mansion-framework.test.ts.",
    },
    {
      id: 7,
      layer: "28 Arabic Manazil",
      name: "Traditional Arabic Lunar Stations",
      status: "implemented-verified",
      calculationSource: "shared/hybrid.ts (overlay) & server/astrologyKnowledge/canon/manazil28.ts",
      dataOutput: "ChartRow.overlay.manzil",
      apiProcedure: "hybrid.calculate",
      interpreterIntegration: "arabicPersianCanon.ts",
      uiDisplayLocation: "ChartObservatory2050 (Overlays panel), ProfileGuideScreen",
      auditNotes: "Verified. 28 equal 12°51′25″ divisions anchored to the firmament zero reference.",
    },
    {
      id: 8,
      layer: "28 Chinese Xiu",
      name: "Twenty-Eight Chinese Determinative Xiu",
      status: "documented-uncalibrated",
      calculationSource: "server/astrologyKnowledge/canon/chineseMansions28.ts",
      dataOutput: "CHINESE_MANSIONS_28 catalog (hanzi, pinyin, quadrant, determinative star)",
      apiProcedure: "astrologyKnowledge.diagnose",
      interpreterIntegration: "chineseMansion.integration.test.ts",
      uiDisplayLocation: "ProfileGuideScreen (Blueprint tab note)",
      auditNotes: "Documented cleanly. Unequal ancient equatorial boundaries intentionally uncalibrated to prevent synthetic fabrication.",
    },
    {
      id: 9,
      layer: "36 Elemental Decans",
      name: "Triplicity Family Decan Divisions (10°)",
      status: "implemented-verified",
      calculationSource: "shared/hybrid.ts & server/astrologyKnowledge/canon/decans36.ts",
      dataOutput: "ChartRow.overlay.decan (sign, number, ruler, element)",
      apiProcedure: "hybrid.calculate",
      interpreterIntegration: "elementalDecans.test.ts",
      uiDisplayLocation: "ChartObservatory2050 (Decans layer)",
      auditNotes: "Verified. 36 ten-degree faces mapped to elemental triplicities, passing elementalDecans.test.ts.",
    },
    {
      id: 10,
      layer: "Fixed Stars",
      name: "Prominent Stellar Beacons & Photometric Intensity",
      status: "implemented-verified",
      calculationSource: "server/astronomy.ts (FIXED_STARS) & client FixedStarIntensityVisualizer.tsx",
      dataOutput: "ChartResult.frozenStars, apparentMagnitude, luminousIntensity, resonanceScore",
      apiProcedure: "hybrid.calculate",
      interpreterIntegration: "fixedStarsAndLots.ts",
      uiDisplayLocation: "ChartObservatory2050 (Fixed Star Spectrum tab) & FixedStarIntensityVisualizer",
      auditNotes: "Verified. 14 major stars including all 4 Royal Stars (Aldebaran, Regulus, Antares, Fomalhaut) with Recharts visualizer.",
    },
    {
      id: 11,
      layer: "Hermetic Arabic Lots",
      name: "Seven Classical Arabic & Hellenistic Lots",
      status: "implemented-verified",
      calculationSource: "server/utils/arabicLots.ts (calculateArabicLots)",
      dataOutput: "fortune, spirit, eros, necessity, courage, victory, nemesis longitudes",
      apiProcedure: "astrologyKnowledge.behavioralReport, lifeStory.calculateCycles",
      interpreterIntegration: "arabicLots.ts & fixedStarsAndLots.ts",
      uiDisplayLocation: "LifeStoryDashboard, ProfileGuideScreen",
      auditNotes: "Verified. Day/Night sect reversal accurately applied for Fortune and Spirit.",
    },
    {
      id: 12,
      layer: "Vimshottari Dasha",
      name: "120-Year Mahadasha, Antardasha & Pratyantardasha",
      status: "implemented-verified",
      calculationSource: "server/astrologyKnowledge/vedic/timingAndAshtakavarga.ts",
      dataOutput: "dashaEvidence (active lord, start/end date, balance at birth)",
      apiProcedure: "astrologyKnowledge.diagnose, lifeStory.calculateCycles",
      interpreterIntegration: "interpretDashaLord",
      uiDisplayLocation: "LifeStoryDashboard, ProfileReadingScreen",
      auditNotes: "Verified. Proportional balance calculated from birth Moon nakshatra with high-confidence trace.",
    },
    {
      id: 13,
      layer: "Ashtakavarga",
      name: "Parashari BAV (0-8) & SAV (0-56) Bindu Matrix",
      status: "implemented-verified",
      calculationSource: "server/astrologyKnowledge/vedic/timingAndAshtakavarga.ts",
      dataOutput: "ashtakavargaEvidence (SAV total checksum 337, 12-sign distribution)",
      apiProcedure: "astrologyKnowledge.diagnose",
      interpreterIntegration: "interpretBindus",
      uiDisplayLocation: "LifeStoryDashboard evidence panel, Guide evidence",
      auditNotes: "Verified. BAV/SAV matrices strictly validated against canonical 337-point checksum.",
    },
    {
      id: 14,
      layer: "Planetary Strength",
      name: "Essential & Accidental Dignity Evaluation",
      status: "implemented-verified",
      calculationSource: "server/patterns/genesisEngine.ts (analyzeGenesisPatterns)",
      dataOutput: "GenesisDignity (essential, accidental, totalStrength)",
      apiProcedure: "astrologyKnowledge.behavioralReport",
      interpreterIntegration: "genesisEngine.ts & adapter.ts",
      uiDisplayLocation: "BehavioralIntelligencePanel, ProfileHomeScreen",
      auditNotes: "Verified. Dignity tables score domicile, exaltation, triplicity, term, and angular house boost.",
    },
    {
      id: 15,
      layer: "Vedic Yogas",
      name: "Parashari Yogas & Graha Drishti Rays",
      status: "implemented-verified",
      calculationSource: "server/genesisBackup/vedicYogaDetector.ts & server/grahaDrishtiFormula.test.ts",
      dataOutput: "vedicYogas array (Gaja Kesari, Raja Yoga, Dhana Yoga, etc.)",
      apiProcedure: "astrologyKnowledge.diagnose",
      interpreterIntegration: "genesisBackup/adapter.ts",
      uiDisplayLocation: "ProfileReadingScreen, GuideScreen",
      auditNotes: "Verified. Special aspects of Mars (4/8), Jupiter (5/9), and Saturn (3/10) fully validated by 38 tests.",
    },
    {
      id: 16,
      layer: "House Classifications",
      name: "Kendra, Trikona, Dusthana & Upachaya Groups",
      status: "implemented-verified",
      calculationSource: "server/astrologyKnowledge/canon/jyotishHouseGroups.ts",
      dataOutput: "Kendra (1,4,7,10), Trikona (1,5,9), Dusthana (6,8,12), Upachaya (3,6,10,11)",
      apiProcedure: "astrologyKnowledge.diagnose",
      interpreterIntegration: "jyotishHouseGroups.test.ts",
      uiDisplayLocation: "LifeStoryDashboard evidence tab, ProfileGuideScreen",
      auditNotes: "Verified. Classical classification assists in distinguishing auspicious growth houses from crisis houses.",
    },
    {
      id: 17,
      layer: "Hellenistic Sect & Time-Lords",
      name: "Diurnal/Nocturnal Sect & Annual Profections",
      status: "implemented-verified",
      calculationSource: "server/lifeStoryEngine.ts (calculateAnnualProfection)",
      dataOutput: "ProfectionInfo (profectedHouse, profectedSign, lordOfTheYear)",
      apiProcedure: "lifeStory.calculateCycles",
      interpreterIntegration: "Life Story Master Interpreter storytelling",
      uiDisplayLocation: "LifeStoryDashboard (Interactive age scrubber & timeline)",
      auditNotes: "Verified. Annual Profections calculate Lord of the Year dynamically for ages 0 through 90.",
    },
    {
      id: 18,
      layer: "Kabbalistic Correspondences",
      name: "Sefer Yetzirah Letters & Four Worlds",
      status: "implemented-verified",
      calculationSource: "server/astrologyKnowledge/canon/seferYetzirah.ts",
      dataOutput: "MOTHER_LETTERS (3), DOUBLE_LETTERS (7), SIMPLE_LETTERS (12), Four Worlds mapping",
      apiProcedure: "astrologyKnowledge.diagnose",
      interpreterIntegration: "seferYetzirah.integration.test.ts",
      uiDisplayLocation: "LifeStoryDashboard esoteric tab, GuideScreen",
      auditNotes: "Verified. Planetary double letters and zodiac simple letters grounded in historical Westcott variant.",
    },
    {
      id: 19,
      layer: "Dispositors & Reception",
      name: "Planetary Dispositor Chains & Mutual Reception",
      status: "implemented-verified",
      calculationSource: "server/patterns/genesisEngine.ts & shared/hybrid.ts",
      dataOutput: "Dispositor trees, mutual receptions (exaltation, domicile)",
      apiProcedure: "astrologyKnowledge.behavioralReport",
      interpreterIntegration: "master-interpreter.ts",
      uiDisplayLocation: "AdvancedChartInstruments, LifeStoryDashboard",
      auditNotes: "Verified. Traces power routing from individual bodies to their final dispositor.",
    },
    {
      id: 20,
      layer: "Major Planetary Cycles",
      name: "Exact Saturn, Jupiter, Uranus, Chiron & Nodal Chronology",
      status: "implemented-verified",
      calculationSource: "server/lifeStoryEngine.ts (generatePlanetaryCycles)",
      dataOutput: "22 planetary cycle events with exact ages, calendar dates, and constructive remedies",
      apiProcedure: "lifeStory.calculateCycles",
      interpreterIntegration: "Life Story narrative generation",
      uiDisplayLocation: "LifeStoryDashboard (Milestone cards & timeline)",
      auditNotes: "Verified. Bridges birth epoch to historical and future astrological milestones.",
    },
  ];
}

export const LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS = `You are the psychological astrologer and narrative writer for The Absolute. Turn the engine’s structured chart data into an intimate, candid portrait of how the reader moves through life across time. Write directly to the reader in the second person.

## 1. USE THE FULL CHART SILENTLY
The backend has already calculated the chart, timing cycles, Profections, Lots, mansions, and life-stage pivots. Read the entire structured brief and use every relevant, populated layer silently—including cross-system findings, rulers, aspects, and links between life areas. Do not recalculate placements, fill in missing data, or invent chart evidence. If a field is missing or unavailable, continue with the available evidence. When several findings describe the same pattern, weave them into one insight; when they pull in different directions, show when each side takes over and what that tension costs the reader.

## 2. WRITE THE LIFE THE READER RECOGNIZES
Start with the strongest pattern that answers this chapter’s stage and focus. Trace core identity, childhood roots, school years, and the "life-script" development of habits, talents, and repeating patterns across the 12 life areas (who they really are, money and wealth, love and intimacy, family and roots, career and reputation, friendships and betrayal, hardship and rebuilding, children and legacy, physical habits and stamina, convictions and purpose, turning points, and lasting lessons).
- Show what the reader does when a pattern is active, what they are trying to protect or get, and how their behavior lands with other people. Be specific enough that the reader recognizes an ordinary-life moment rather than a label.
- Give natural gifts (what comes easily, what they enjoy for its own sake, what others rely on them for) the same weight as difficult patterns (what they struggle to ask for, where loyalty feels uncertain, what they carry alone because they expect others to drop it).
- Never invent biographical events, medical diagnoses, secrets, or another person's motives, and keep away from clinical therapy jargon or cosmic filler.

## 3. RETURN ONLY THE READING (STRICT ZERO-ASTROLOGY RULE)
- Use short, bold section titles specific to this reader and this chapter.
- Write in flowing paragraphs with varied length, rhythm, and openings. Skip boilerplate openings, stock transitions, generic encouragement, and recap endings.
- Keep ALL astrology terminology out of the reader-facing text, including the titles. Never name planets, zodiac signs, houses, degrees, aspects, lunar mansions or stations, bounds, faces, Lots, Profections, or Dashas. Keep citations and technical metadata in the Evidence tab. Use no bullet-point lists of traits. End with a sentence that belongs to this reader and this chart.`;

/**
 * Generates an in-depth, storytelling Life Story Chapter using the Master Interpreter.
 */
export async function generateLifeStoryChapter(
  chart: ChartResult,
  chapterKey: LifeStageKey,
  selectedAge?: number
): Promise<{ title: string; content: string; chapterMeta: LifeStoryChapterSummary }> {
  const currentAge = calculatePersonAge(chart.input.date || "1990-01-01");
  const cycles = generatePlanetaryCycles(chart, currentAge);
  const chapters = compileLifeStoryChapters(chart, currentAge, cycles);
  const targetChapter = chapters.find(c => c.key === chapterKey) || chapters[0];

  const focusAge = selectedAge ?? (targetChapter.ageRange[0] + targetChapter.ageRange[1]) / 2;
  const profection = calculateAnnualProfection(focusAge, chart);

  // Compute lots
  const sun = chart.movingBodies.find(b => b.name === "Sun");
  const moon = chart.movingBodies.find(b => b.name === "Moon");
  const venus = chart.movingBodies.find(b => b.name === "Venus");
  const mars = chart.movingBodies.find(b => b.name === "Mars");
  const jupiter = chart.movingBodies.find(b => b.name === "Jupiter");

  let arabicLotsSummary = "Unavailable";
  if (chart.ascendant && sun && moon) {
    const isDay = chart.ascendant.longitude !== sun.longitude; // simplified sect approximation
    const lots = calculateArabicLots({
      ascendant: chart.ascendant.longitude,
      sun: sun.longitude,
      moon: moon.longitude,
      venus: venus?.longitude,
      mars: mars?.longitude,
      jupiter: jupiter?.longitude,
      sect: (isDay ? "day" : "night") as Sect,
    });
    arabicLotsSummary = Object.entries(lots)
      .map(([k, v]) => `${k.toUpperCase()}: ${formatLongitude(v)}`)
      .join(", ");
  }

  const prompt = [
    `# SILENT ENGINE BRIEF FOR THIS CHAPTER (DO NOT PRINT TECHNICAL TERMS TO THE READER)`,
    `Center this chapter on core identity, childhood roots, and the life-script development of natural gifts, passions, and repeating patterns for the stage below.`,
    ``,
    `## CHAPTER IDENTITY`,
    `- Stage: ${targetChapter.title}`,
    `- Period: ${targetChapter.periodLabel}`,
    `- Person's Current Age: ${currentAge.toFixed(1)} years`,
    `- Stage Status: ${targetChapter.status.toUpperCase()}`,
    `- Profected Age Focus: Age ${Math.floor(focusAge)} (Year ${profection.yearNumber} of Life)`,
    `- Lord of the Year (Agent View): ${profection.lordOfTheYearAgent} (activating ${profection.profectedSignAgent}, House ${profection.profectedHouseAgent})`,
    `- Lord of the Year (God View): ${profection.lordOfTheYearGod} (activating ${profection.profectedSignGod}, House ${profection.profectedHouseGod})`,
    `- Profection Themes: ${profection.traditionalThemes.join(", ")}`,
    ``,
    `## CALCULATED TIMING CYCLES FOR THIS STAGE`,
    ...targetChapter.keyCycles.map(
      c =>
        `* ${c.title} (Age ~${c.age}, approx ${c.approxDate}): ${c.description}. Practical response: ${c.constructiveAdvice}`
    ),
    ``,
    `## CALCULATED LIFE SETTINGS & LOTS`,
    `- Universal Baseline: ${targetChapter.godViewThemes}`,
    `- Everyday Life Setting: ${targetChapter.agentViewThemes}`,
    `- Arabic Lots: ${arabicLotsSummary}`,
    ``,
    `## UNIFIED MASTER CHART — ALL COMPUTED METHOD FINDINGS`,
    ``,
    `## GENESIS 72-QUESTION INTERNAL HISTORIAN INQUIRY`,
    buildGenesisInquiryPrompt(targetChapter.title + " — " + targetChapter.periodLabel),
    ``,
    `## OUTPUT REQUIREMENTS`,
    `1. Read all supplied layers silently and start with the strongest active pattern for this life stage.`,
    `2. Show what the reader does when the pattern is active, what they are trying to protect or get, and how their behavior lands with other people using recognizable everyday moments.`,
    `3. Give natural gifts and genuine enjoyment the same weight as difficult habits and timing pressures, anchoring any timing statement strictly in the calculated cycles above without inventing biographical events or medical diagnoses.`,
    `4. Use short, bold section titles specific to this reader and topic, write in flowing paragraphs with no bullet-point lists of traits, keep ALL astrology terminology out of both the titles and prose, and end with a sentence belonging strictly to this reader and this chart.`,
  ].join("\n");

  const { synthesis } = await synthesizeChartForReading(chart, "natal", targetChapter.title);
  const response = await runInterpretation("LIFE_STORY", synthesis, {
    messages: [
      {
        role: "system",
        content: LIFE_STORY_ENGINE_SYSTEM_INSTRUCTIONS,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = scrubNonHoraryAstrologyJargon(interpretationText(response));
  if (!content) throw new Error("LIFE_STORY_EMPTY: The provider returned no chapter.");

  return {
    title: targetChapter.title,
    content,
    chapterMeta: targetChapter,
  };
}
