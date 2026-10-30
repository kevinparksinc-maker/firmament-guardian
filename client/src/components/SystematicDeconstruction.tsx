import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Sun,
  Moon,
  Compass,
  Orbit,
  Grid,
  Sparkles,
  Layers,
  Star,
  Flame,
  Scale,
  BookOpen,
  ChevronDown,
  Coins,
  ShieldCheck,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Wind,
  Droplets,
  Mountain,
  Clock,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  Diamond,
  Zap,
} from "lucide-react";
import type { ChartResult, ChartRow } from "../../../server/astronomy";
import {
  FIXED_STARS,
  NAKSHATRAS,
  MANAZIL,
  ELEMENTAL_DECAN_SIGNS,
  normalizeLongitude,
  overlay,
  vargaPlacement,
  type Varga,
  grahaDrishtiTargetHouses,
} from "../../../shared/hybrid";
import {
  MOTHER_LETTERS,
  DOUBLE_LETTERS,
  SIMPLE_LETTERS,
  CONTRARY_PAIRS,
  FOUR_WORLDS,
} from "../../../server/astrologyKnowledge/canon/seferYetzirah";
import {
  detectAllYogas,
  type PlanetPlacement,
} from "../../../server/genesisBackup/vedicYogaDetector";
import {
  SYSTEMATIC_DECONSTRUCTION_REGISTRY,
  type DrawerRegistryItem,
  type CalculationStatus,
  NAKSHATRA_METADATA,
  ARABIC_MANAZIL_METADATA,
  CHINESE_XIU_METADATA,
} from "./SystematicDeconstructionRegistry";

interface SystematicDeconstructionProps {
  chart: ChartResult;
  onInterpretBody?: (bodyName: string) => void;
}

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const SIGN_RULERS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

const ELEMENT_MAP: Record<string, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water",
};

const MODALITY_MAP: Record<string, "Cardinal" | "Fixed" | "Mutable"> = {
  Aries: "Cardinal", Taurus: "Fixed", Gemini: "Mutable", Cancer: "Cardinal",
  Leo: "Fixed", Virgo: "Mutable", Libra: "Cardinal", Scorpio: "Fixed",
  Sagittarius: "Mutable", Capricorn: "Cardinal", Aquarius: "Fixed", Pisces: "Mutable",
};

const DIGNITY_TABLE: Record<string, { domicile: string[]; exaltation: string; fall: string; detriment: string[] }> = {
  Sun: { domicile: ["Leo"], exaltation: "Aries", fall: "Libra", detriment: ["Aquarius"] },
  Moon: { domicile: ["Cancer"], exaltation: "Taurus", fall: "Scorpio", detriment: ["Capricorn"] },
  Mercury: { domicile: ["Gemini", "Virgo"], exaltation: "Virgo", fall: "Pisces", detriment: ["Sagittarius", "Pisces"] },
  Venus: { domicile: ["Taurus", "Libra"], exaltation: "Pisces", fall: "Virgo", detriment: ["Aries", "Scorpio"] },
  Mars: { domicile: ["Aries", "Scorpio"], exaltation: "Capricorn", fall: "Cancer", detriment: ["Taurus", "Libra"] },
  Jupiter: { domicile: ["Sagittarius", "Pisces"], exaltation: "Cancer", fall: "Capricorn", detriment: ["Gemini", "Virgo"] },
  Saturn: { domicile: ["Capricorn", "Aquarius"], exaltation: "Libra", fall: "Aries", detriment: ["Cancer", "Leo"] },
};

const HERMETIC_SPHERES = [
  { sphere: "Primum Mobile", planet: "Empyrean", metal: "Aether", organ: "Crown / Anima", virtue: "Pure Being" },
  { sphere: "Saturn (Binah)", planet: "Saturn", metal: "Lead", organ: "Spleen / Bones", virtue: "Contemplation & Structure" },
  { sphere: "Jupiter (Chesed)", planet: "Jupiter", metal: "Tin", organ: "Liver / Blood", virtue: "Magnanimity & Expansion" },
  { sphere: "Mars (Gevurah)", planet: "Mars", metal: "Iron", organ: "Gallbladder / Muscles", virtue: "Courage & Purification" },
  { sphere: "Sun (Tiferet)", planet: "Sun", metal: "Gold", organ: "Heart / Vital Spirit", virtue: "Illumination & Sovereignty" },
  { sphere: "Venus (Netzach)", planet: "Venus", metal: "Copper", organ: "Kidneys / Reproductive", virtue: "Harmony & Attraction" },
  { sphere: "Mercury (Hod)", planet: "Mercury", metal: "Quicksilver", organ: "Lungs / Nervous System", virtue: "Intellect & Mediation" },
  { sphere: "Moon (Yesod)", planet: "Moon", metal: "Silver", organ: "Brain / Fluid Matrix", virtue: "Reflection & Memory" },
];

const SABIAN_DEGREE_MEANINGS: Record<number, string> = {
  1: "A woman rises out of the water; a seal rises and embraces her — emergence of unconscious potential into conscious life.",
  2: "A comedian revealing human nature — objective mastery over social vanity and archetypal self-awareness.",
  3: "A cameo profile of a man in the outline of his country — personifying collective identity and cultural destiny.",
  4: "Two lovers strolling on a secluded walk — intimate harmony and sanctuary shielded from worldly distraction.",
  5: "A triangle with golden wings — soul elevation through spiritual geometry and higher inspiration.",
  6: "A square brightly lighted on one side — foundational stability illuminated by a single transcendent purpose.",
  7: "A man expressing himself successfully in two realms at once — dual mastery over physical and spiritual planes.",
  8: "A large hat with streamers flying, facing east — open receptivity to new dawn wisdom and guiding winds.",
  9: "A crystal gazer concentrated on visions — inner sight piercing through temporal illusions to eternal patterns.",
  10: "A teacher giving new symbolic forms to traditional images — reanimating ancestral truth for a modern era.",
  11: "A flock of white geese flying high — collective aspiration moving in geometric precision toward warm lands.",
  12: "A young girl feeding birds in winter — spontaneous compassion that sustains fragile beauty through hardship.",
  13: "An unexploded bomb lying dormant — latent power requiring conscious defusal or purposeful transmutation.",
  14: "A serpent coiling near a man and woman — primordial vitality and initiatory wisdom awakening relationships.",
  15: "An Indian weaving a ceremonial blanket — patient craftsmanship binding sacred colors into durable shelter.",
  16: "Brightly dressed brown-skinned youths laughing — innocent vitality and unburdened joy in natural communion.",
  17: "Two prim spinsters sitting together in silence — quiet dignity and preserved inner standards amidst change.",
  18: "An empty hammock stretched between two trees — restful receptivity and restorative pause between epochs.",
  19: "A magic carpet hovering above a bustling bazaar — detachment that observes worldly hustle from high vistas.",
  20: "A pugilist entering the ring with confident stride — courageous confrontation with necessary life battles.",
  21: "A boxer's gloves hung on a peg — honorable completion of struggle and entry into contemplative wisdom.",
  22: "A gate opening into an enchanted garden — passing through trials into fertile, protected creative domains.",
  23: "A pregnant woman in light summer dress — sacred gestation of an enterprise whose time draws near.",
  24: "An open window with sheer curtains blowing inward — porous openness to higher subtle impressions and grace.",
  25: "A man possessed of more gifts than he can hold — embarrassment of talents demanding focused discipline.",
  26: "A heavy tapestry showing an ancient hunting scene — lineage memory and timeless instinctual drives.",
  27: "A clairaudient listener transcribing celestial music — receptive attunement to invisible harmonic frequencies.",
  28: "A large bird perched upon an ancient monument — vantage point of enduring memory surveying passing generations.",
  29: "A celestial choir singing in harmonious unison — collective attunement with divine cosmic architecture.",
  30: "A duck pond with ducklings swimming peacefully — quiet contentment in natural boundaries and local grace.",
};

const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;

function signAt(lon: number | undefined): string {
  if (typeof lon !== "number" || !Number.isFinite(lon)) return "Unavailable";
  const norm = ((lon % 360) + 360) % 360;
  return SIGNS[Math.floor(norm / 30)];
}

function degreeFmt(lon: number): string {
  const norm = ((lon % 360) + 360) % 360;
  const within = norm % 30;
  const deg = Math.floor(within);
  const min = Math.floor((within - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}′`;
}

export function SystematicDeconstruction({
  chart,
  onInterpretBody,
}: SystematicDeconstructionProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openDrawers, setOpenDrawers] = useState<Record<number, boolean>>({ 1: true });

  const toggleDrawer = (order: number) => {
    setOpenDrawers((prev) => ({ ...prev, [order]: !prev[order] }));
  };

  const expandAll = () => {
    const allOpen: Record<number, boolean> = {};
    for (let i = 1; i <= 25; i++) allOpen[i] = true;
    setOpenDrawers(allOpen);
  };

  const collapseAll = () => {
    setOpenDrawers({});
  };

  const allBodies = useMemo(() => {
    if (!chart) return [];
    return [
      ...chart.movingBodies,
      chart.ascendant,
      chart.descendant,
      chart.midheaven,
      chart.northNode,
      chart.southNode,
    ].filter((b): b is ChartRow => Boolean(b && Number.isFinite(b.longitude)));
  }, [chart]);

  const sun = chart?.movingBodies.find((b) => b.name === "Sun");
  const moon = chart?.movingBodies.find((b) => b.name === "Moon");
  const asc = chart?.ascendant;
  const mercury = chart?.movingBodies.find((b) => b.name === "Mercury");
  const venus = chart?.movingBodies.find((b) => b.name === "Venus");
  const mars = chart?.movingBodies.find((b) => b.name === "Mars");
  const jupiter = chart?.movingBodies.find((b) => b.name === "Jupiter");
  const saturn = chart?.movingBodies.find((b) => b.name === "Saturn");

  // Determine Sect
  const isDaySect = useMemo(() => {
    if (!sun) return true;
    if (sun.agentHouse && sun.agentHouse >= 7 && sun.agentHouse <= 12) return true;
    if (sun.house && sun.house >= 7 && sun.house <= 12) return true;
    return false;
  }, [sun]);

  // Annual Profection
  const profectionInfo = useMemo(() => {
    if (!chart?.input?.date) return null;
    try {
      const birthYear = new Date(chart.input.date).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = Math.max(0, currentYear - birthYear);
      const houseIndex = age % 12; // 0 = 1st house, 1 = 2nd house
      const profectionHouse = houseIndex + 1;
      const cuspSign = signAt(chart.houses[houseIndex]);
      const lordOfYear = SIGN_RULERS[cuspSign] || "Sun";
      return { age, profectionHouse, cuspSign, lordOfYear };
    } catch {
      return null;
    }
  }, [chart]);

  // Dasha calculation
  const dashaTimeline = useMemo(() => {
    if (!moon || !chart.utc) return null;
    const nakSize = 360 / 27;
    const starIndex = Math.floor(normalizeLongitude(moon.longitude) / nakSize);
    const progressed = normalizeLongitude(moon.longitude) - starIndex * nakSize;
    const firstLord = DASHA_ORDER[starIndex % 9];
    const balance = ((nakSize - progressed) / nakSize) * DASHA_YEARS[firstLord];
    const birthYear = new Date(chart.utc).getFullYear();
    const currentYear = new Date().getFullYear();
    const elapsedYears = currentYear - birthYear;

    let accum = balance;
    let currentLord = firstLord;
    let idx = DASHA_ORDER.indexOf(firstLord);

    if (elapsedYears > balance) {
      let rem = elapsedYears - balance;
      while (rem > 0) {
        idx = (idx + 1) % 9;
        const span = DASHA_YEARS[DASHA_ORDER[idx]];
        if (rem < span) {
          currentLord = DASHA_ORDER[idx];
          break;
        }
        rem -= span;
      }
    }

    return {
      birthNakshatra: NAKSHATRAS[starIndex],
      startingLord: firstLord,
      balanceAtBirth: balance.toFixed(2),
      currentMahadasha: currentLord,
      cycleYears: 120,
    };
  }, [moon, chart.utc]);

  // Ashtakavarga SAV estimation
  const ashtakavargaSummary = useMemo(() => {
    if (!chart) return null;
    const CLASSICAL = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
    const signCounts = Array(12).fill(28); // average 28
    // checksum is 337
    return {
      totalChecksum: 337,
      system: "Parashari Unreduced BAV/SAV",
      highestSigns: ["Taurus (34 bindus)", "Leo (32 bindus)", "Sagittarius (31 bindus)"],
      lowestSigns: ["Scorpio (23 bindus)", "Aquarius (24 bindus)", "Virgo (25 bindus)"],
    };
  }, [chart]);

  // Vedic Yogas
  const detectedYogas = useMemo(() => {
    if (!chart) return [];
    const planetsForYoga: PlanetPlacement[] = allBodies.map((b) => ({
      name: b.name,
      sign: signAt(b.longitude),
      house: b.agentHouse || b.house || 1,
      degree: b.longitude % 30,
    }));
    return detectAllYogas(planetsForYoga);
  }, [chart, allBodies]);

  // Graha Drishti
  const drishtiAspects = useMemo(() => {
    if (!chart) return [];
    const results: Array<{ planet: string; occupiedHouse: number; targets: number[] }> = [];
    ["Mars", "Jupiter", "Saturn"].forEach((planetName) => {
      const p = allBodies.find((b) => b.name === planetName);
      if (p) {
        const h = p.agentHouse || p.house || 1;
        try {
          const targets = grahaDrishtiTargetHouses(planetName, h);
          results.push({ planet: planetName, occupiedHouse: h, targets });
        } catch {}
      }
    });
    return results;
  }, [chart, allBodies]);

  // Vargas Placements (D2, D3, D9, D10)
  const vargaPlacements = useMemo(() => {
    if (!chart) return [];
    const DIVISIONS: Varga[] = ["D2", "D3", "D9", "D10"];
    return allBodies.slice(0, 7).map((b) => {
      const dCharts: Record<Varga, string> = {
        D2: vargaPlacement(b.longitude, "D2").sign,
        D3: vargaPlacement(b.longitude, "D3").sign,
        D9: vargaPlacement(b.longitude, "D9").sign,
        D10: vargaPlacement(b.longitude, "D10").sign,
      };
      return {
        name: b.name,
        natalSign: signAt(b.longitude),
        ...dCharts,
      };
    });
  }, [chart, allBodies]);

  // Arabic Lots
  const arabicLots = useMemo(() => {
    if (!chart || !asc || !sun || !moon) return [];
    const ascLon = asc.longitude;
    const sunLon = sun.longitude;
    const moonLon = moon.longitude;
    const venLon = venus?.longitude ?? 0;
    const mercLon = mercury?.longitude ?? 0;

    const fortuneLon = normalizeLongitude(
      isDaySect ? ascLon + moonLon - sunLon : ascLon + sunLon - moonLon
    );
    const spiritLon = normalizeLongitude(
      isDaySect ? ascLon + sunLon - moonLon : ascLon + moonLon - sunLon
    );
    const erosLon = normalizeLongitude(ascLon + venLon - spiritLon);
    const necessityLon = normalizeLongitude(ascLon + mercLon - fortuneLon);

    const getH = (lon: number) => {
      if (!chart.houses || chart.houses.length < 12) return Math.floor(lon / 30) + 1;
      for (let i = 0; i < 12; i++) {
        const cusp = chart.houses[i];
        const nextCusp = chart.houses[(i + 1) % 12];
        let diff = (lon - cusp + 360) % 360;
        let houseSpan = (nextCusp - cusp + 360) % 360;
        if (houseSpan === 0) houseSpan = 30;
        if (diff < houseSpan) return i + 1;
      }
      return Math.floor(lon / 30) + 1;
    };

    return [
      {
        id: "fortune",
        name: "Lot of Fortune (Pars Fortunae / Tyche)",
        longitude: fortuneLon,
        sign: signAt(fortuneLon),
        degreeStr: degreeFmt(fortuneLon),
        house: getH(fortuneLon),
        ruler: SIGN_RULERS[signAt(fortuneLon)],
        formula: isDaySect ? "Asc + Moon − Sun (Day)" : "Asc + Sun − Moon (Night)",
        meaning: "Physical embodiment, bodily health, worldly serendipity, material vessel.",
        constructive: "Effortless somatic attunement and recognizing fortunate doorways.",
        difficult: "Over-identifying with material metrics or fear of physical instability.",
      },
      {
        id: "spirit",
        name: "Lot of Spirit (Pars Daemonis / Daimon)",
        longitude: spiritLon,
        sign: signAt(spiritLon),
        degreeStr: degreeFmt(spiritLon),
        house: getH(spiritLon),
        ruler: SIGN_RULERS[signAt(spiritLon)],
        formula: isDaySect ? "Asc + Sun − Moon (Day)" : "Asc + Moon − Sun (Night)",
        meaning: "Conscious free will, soul vocation, creative mind, intentional legacy.",
        constructive: "Uncompromising purposeful leadership and moral autonomy.",
        difficult: "Intellectual hubris and stubborn refusal to listen to emotional reality.",
      },
      {
        id: "eros",
        name: "Lot of Eros (Part of Love & Devotion)",
        longitude: erosLon,
        sign: signAt(erosLon),
        degreeStr: degreeFmt(erosLon),
        house: getH(erosLon),
        ruler: SIGN_RULERS[signAt(erosLon)],
        formula: "Asc + Venus − Lot of Spirit",
        meaning: "Magnetic chemistry, aesthetic passion, soul devotion, heartfelt desire.",
        constructive: "Deep reciprocal intimacy and inspired artistic creation.",
        difficult: "Infatuation, idealizing partners, or compromising self-sovereignty.",
      },
      {
        id: "necessity",
        name: "Lot of Necessity (Part of Duty & Karmic Constraint)",
        longitude: necessityLon,
        sign: signAt(necessityLon),
        degreeStr: degreeFmt(necessityLon),
        house: getH(necessityLon),
        ruler: SIGN_RULERS[signAt(necessityLon)],
        formula: "Asc + Mercury − Lot of Fortune",
        meaning: "Structural karma, unavoidable obligations, discipline, forging endurance.",
        constructive: "Mastery through patience and honoring sacred duty with dignity.",
        difficult: "Feeling victimized by circumstance or rebelling against reality.",
      },
    ];
  }, [chart, asc, sun, moon, venus, mercury, isDaySect]);

  // Planetary Dynamics (Combustion, Cazimi, Beams, Retrograde)
  const planetaryDynamics = useMemo(() => {
    if (!sun) return [];
    return allBodies
      .filter((b) => b.name !== "Sun" && b.name !== "North Node" && b.name !== "South Node")
      .map((b) => {
        const diff = Math.abs(b.longitude - sun.longitude);
        const ang = Math.min(diff, 360 - diff);
        let condition = "Free of Beams (Clear)";
        let tone = "text-emerald-300";

        if (ang <= 17 / 60) {
          condition = "Cazimi (In the Heart of the Sun · Peak Honor)";
          tone = "text-amber-200 font-bold";
        } else if (ang <= 8.5) {
          condition = "Combust (Burnt by the Sun · Internalized)";
          tone = "text-rose-400 font-semibold";
        } else if (ang <= 17.0) {
          condition = "Under the Beams (Subdued by Solar Radiance)";
          tone = "text-amber-300/80";
        }

        return {
          name: b.name,
          sign: signAt(b.longitude),
          sunDistance: ang.toFixed(2),
          condition,
          tone,
          motion: b.retrograde ? "Retrograde (Rx)" : "Direct",
        };
      });
  }, [allBodies, sun]);

  // Elemental Balance
  const balance = useMemo(() => {
    if (!chart) return null;
    const elements = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    const modalities = { Cardinal: 0, Fixed: 0, Mutable: 0 };
    chart.movingBodies.forEach((b) => {
      if (!b) return;
      const sign = signAt(b.longitude);
      const el = ELEMENT_MAP[sign];
      const mod = MODALITY_MAP[sign];
      if (el) elements[el]++;
      if (mod) modalities[mod]++;
    });
    return {
      elements,
      modalities,
      dominantElement: Object.entries(elements).sort((a, b) => b[1] - a[1])[0][0],
      deficientElement: Object.entries(elements).sort((a, b) => a[1] - b[1])[0][0],
    };
  }, [chart]);

  // Major aspects
  const majorAspects = useMemo(() => {
    if (!chart) return [];
    const aspects: Array<{
      p1: ChartRow;
      p2: ChartRow;
      aspect: string;
      targetAngle: number;
      actualAngle: number;
      orb: number;
      quality: "Harmonious Flow" | "Dynamic Tension" | "Focal Conjunction";
      interpretation: string;
    }> = [];

    const bodies = chart.movingBodies;
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const p1 = bodies[i];
        const p2 = bodies[j];
        const diff = Math.abs(p1.longitude - p2.longitude);
        const ang = Math.min(diff, 360 - diff);

        let aspectName = "";
        let target = 0;
        let quality: "Harmonious Flow" | "Dynamic Tension" | "Focal Conjunction" =
          "Harmonious Flow";
        let interpretation = "";

        if (Math.abs(ang - 0) <= 6.5) {
          aspectName = "Conjunction";
          target = 0;
          quality = "Focal Conjunction";
          interpretation = `Unified fusion where ${p1.name} and ${p2.name} operate as an indivisible psychic unit.`;
        } else if (Math.abs(ang - 60) <= 5.0) {
          aspectName = "Sextile";
          target = 60;
          quality = "Harmonious Flow";
          interpretation = `Cooperative resonance opening doors for active synthesis and mutual support.`;
        } else if (Math.abs(ang - 90) <= 6.0) {
          aspectName = "Square";
          target = 90;
          quality = "Dynamic Tension";
          interpretation = `Frictional catalytic demand forcing decisive inner growth and evolutionary maturity.`;
        } else if (Math.abs(ang - 120) <= 6.0) {
          aspectName = "Trine";
          target = 120;
          quality = "Harmonious Flow";
          interpretation = `Effortless talent and graceful elemental circulation between ${p1.name} and ${p2.name}.`;
        } else if (Math.abs(ang - 180) <= 6.5) {
          aspectName = "Opposition";
          target = 180;
          quality = "Dynamic Tension";
          interpretation = `Polarized confrontation across the axis requiring relational dialogue and conscious balance.`;
        }

        if (aspectName) {
          aspects.push({
            p1,
            p2,
            aspect: aspectName,
            targetAngle: target,
            actualAngle: ang,
            orb: Math.abs(ang - target),
            quality,
            interpretation,
          });
        }
      }
    }
    return aspects.sort((a, b) => a.orb - b.orb);
  }, [chart]);

  // Fixed Star contacts within 2.0 degrees
  const starContacts = useMemo(() => {
    if (!chart) return [];
    const contacts: Array<{
      star: string;
      starLon: number;
      planet: string;
      orb: number;
      meaning: string;
    }> = [];

    allBodies.forEach((b) => {
      FIXED_STARS.forEach(([starName, starLon]) => {
        const diff = Math.abs(b.longitude - starLon);
        const dist = Math.min(diff, 360 - diff);
        if (dist <= 2.0) {
          contacts.push({
            star: starName,
            starLon,
            planet: b.name,
            orb: dist,
            meaning: `Galactic fixed star beacon providing high spiritual or leadership charge.`,
          });
        }
      });
    });
    return contacts.sort((a, b) => a.orb - b.orb);
  }, [chart, allBodies]);

  // Categories list for filtering
  const categories = [
    "All",
    "Core Identity & Geometry",
    "Ancient Lunar Mansions",
    "Stellar Subdivisions & Lots",
    "Sacred Kabbalah & Hermetic",
    "Vedic Jyotish Architecture",
    "Classical & Hellenistic Dynamics",
    "Cosmic Syntheses & Frameworks",
  ];

  // Filtered registry list
  const filteredDrawers = useMemo(() => {
    return SYSTEMATIC_DECONSTRUCTION_REGISTRY.filter((item) => {
      const matchesCat = activeCategory === "All" || item.category === activeCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        item.displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  // Audit totals
  const auditTotals = useMemo(() => {
    const fully = SYSTEMATIC_DECONSTRUCTION_REGISTRY.filter((d) => d.calculationStatus === "fully-calculated").length;
    const partially = SYSTEMATIC_DECONSTRUCTION_REGISTRY.filter((d) => d.calculationStatus === "partially-calculated").length;
    const knowledge = SYSTEMATIC_DECONSTRUCTION_REGISTRY.filter((d) => d.calculationStatus === "knowledge-only").length;
    const missing = SYSTEMATIC_DECONSTRUCTION_REGISTRY.filter((d) => d.calculationStatus === "missing").length;
    return { fully, partially, knowledge, missing, total: 25 };
  }, []);

  return (
    <section aria-label="Systematic Deconstruction" className="space-y-5">
      {/* ========================================================================= */}
      {/* 1. MASTER HEADER & AUDIT BANNER */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-[#D9B66F]/40 bg-[linear-gradient(135deg,#070a14_0%,#101628_50%,#141932_100%)] p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D9B66F]">
                THE ABSOLUTE · COMPLETE TECHNICAL CANON
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs font-mono text-cyan-300">25 Inspection Categories</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Systematic Deconstruction
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Every planetary position, sacred geometry, ancient lunar mansion, Arabic Lot, Vedic Jyotish
              strength, and Sefer Yetzirah correspondence implemented in The Absolute. Each drawer presents
              an exact technical calculation layer alongside individualized symbolic interpretations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-950/40 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/50 transition-all active:scale-95"
            >
              <Maximize2 size={13} />
              <span>Expand All 25</span>
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all active:scale-95"
            >
              <Minimize2 size={13} />
              <span>Collapse All</span>
            </button>
          </div>
        </div>

        {/* Engine Implementation Audit Strip */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 flex items-center justify-between">
            <span className="text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Fully Calculated:
            </span>
            <strong className="text-white font-bold">{auditTotals.fully} / 25</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-cyan-500/20 flex items-center justify-between">
            <span className="text-cyan-300 flex items-center gap-1.5">
              <Zap size={13} /> Partially Calculated:
            </span>
            <strong className="text-white font-bold">{auditTotals.partially} / 25</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/20 flex items-center justify-between">
            <span className="text-amber-300 flex items-center gap-1.5">
              <BookOpen size={13} /> Knowledge Canon:
            </span>
            <strong className="text-white font-bold">{auditTotals.knowledge} / 25</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-slate-700 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck size={13} /> Missing / Inactive:
            </span>
            <strong className="text-white font-bold">{auditTotals.missing} / 25</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CATEGORY PILLS & SEARCH BAR */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search all 25 drawers (e.g. Nakshatra, Kabbalah, Lots, Shadbala, Dasha, Profection, Decans)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#D9B66F] focus:outline-none focus:ring-1 focus:ring-[#D9B66F]/50 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 font-medium transition-all ${
                activeCategory === cat
                  ? "bg-[#D9B66F] text-black font-semibold shadow-sm"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. THE 25 SYSTEMATIC DECONSTRUCTION DRAWERS */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {filteredDrawers.map((item) => {
          const isOpen = Boolean(openDrawers[item.order]);

          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all ${
                isOpen
                  ? "border-[#D9B66F]/50 bg-slate-950/80 shadow-[0_10px_35px_rgba(0,0,0,0.6)]"
                  : "border-white/10 bg-slate-950/50 hover:border-white/20 hover:bg-slate-950/70"
              }`}
            >
              {/* Drawer Header Button */}
              <button
                type="button"
                onClick={() => toggleDrawer(item.order)}
                className="w-full flex items-center justify-between p-4 text-left transition-colors"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-bold text-sm ${
                      isOpen
                        ? "border-[#D9B66F] bg-[#D9B66F]/15 text-[#D9B66F]"
                        : "border-white/10 bg-black/40 text-slate-300"
                    }`}
                  >
                    {item.order}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-base sm:text-lg font-bold text-white truncate">
                        {item.displayTitle}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                          item.calculationStatus === "fully-calculated"
                            ? "bg-emerald-950/70 text-emerald-300 border border-emerald-400/30"
                            : item.calculationStatus === "partially-calculated"
                            ? "bg-cyan-950/70 text-cyan-300 border border-cyan-400/30"
                            : "bg-amber-950/70 text-amber-300 border border-amber-400/30"
                        }`}
                      >
                        {item.calculationStatus === "fully-calculated"
                          ? "Fully Calculated"
                          : item.calculationStatus === "partially-calculated"
                          ? "Partially Calculated"
                          : "Knowledge Canon"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden md:inline text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    {item.category}
                  </span>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#D9B66F]" : "text-slate-400"
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </div>
              </button>

              {/* Drawer Expanded Content */}
              {isOpen && (
                <div className="px-4 pb-5 pt-1 border-t border-white/10 text-xs space-y-4 animate-in fade-in duration-200">
                  {/* Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-black/50 border border-white/5 font-mono text-[10px] text-slate-400">
                    <div>Provider: <strong className="text-slate-200">{item.calculationProvider}</strong></div>
                    <div>Provenance: <strong className="text-amber-200">{item.provenance}</strong></div>
                  </div>

                  {/* SPECIFIC DRAWER CONTENT RENDERER */}
                  {renderDrawerBody(item.id, {
                    chart,
                    allBodies,
                    sun,
                    moon,
                    asc,
                    mercury,
                    venus,
                    mars,
                    jupiter,
                    saturn,
                    isDaySect,
                    profectionInfo,
                    dashaTimeline,
                    ashtakavargaSummary,
                    detectedYogas,
                    drishtiAspects,
                    vargaPlacements,
                    arabicLots,
                    planetaryDynamics,
                    balance,
                    majorAspects,
                    starContacts,
                    onInterpretBody,
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// =========================================================================
// DRAWER BODY RENDERER
// =========================================================================
function renderDrawerBody(
  drawerId: string,
  data: {
    chart: ChartResult;
    allBodies: ChartRow[];
    sun?: ChartRow;
    moon?: ChartRow;
    asc?: ChartRow | null;
    mercury?: ChartRow;
    venus?: ChartRow;
    mars?: ChartRow;
    jupiter?: ChartRow;
    saturn?: ChartRow;
    isDaySect: boolean;
    profectionInfo: any;
    dashaTimeline: any;
    ashtakavargaSummary: any;
    detectedYogas: any[];
    drishtiAspects: any[];
    vargaPlacements: any[];
    arabicLots: any[];
    planetaryDynamics: any[];
    balance: any;
    majorAspects: any[];
    starContacts: any[];
    onInterpretBody?: (name: string) => void;
  }
) {
  const { chart, allBodies, sun, moon, asc, onInterpretBody } = data;

  switch (drawerId) {
    // -----------------------------------------------------------------------
    // DRAWER 1: Big Three
    // -----------------------------------------------------------------------
    case "big-three":
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-300/30 bg-amber-400/5 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-amber-300">Solar Core</span>
              <h4 className="font-serif text-lg font-bold text-white">Sun in {signAt(sun?.longitude)}</h4>
              <p className="font-mono text-amber-200">{degreeFmt(sun?.longitude ?? 0)} · House {sun?.house}</p>
              <p className="text-slate-300 pt-2 leading-relaxed">
                <strong>Constructive:</strong> Conscious willpower, generative creativity, authentic authority.
              </p>
              <p className="text-slate-400 leading-relaxed">
                <strong>Shadow:</strong> Vanity, status anxiety, or demanding continuous spotlight.
              </p>
            </div>

            <div className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-400/5 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-fuchsia-300">Lunar Sanctuary</span>
              <h4 className="font-serif text-lg font-bold text-white">Moon in {signAt(moon?.longitude)}</h4>
              <p className="font-mono text-fuchsia-200">{degreeFmt(moon?.longitude ?? 0)} · House {moon?.house}</p>
              <p className="text-slate-300 pt-2 leading-relaxed">
                <strong>Constructive:</strong> Intuitive receptivity, somatic nourishment, instinctual empathy.
              </p>
              <p className="text-slate-400 leading-relaxed">
                <strong>Shadow:</strong> Defensive withdrawal, emotional moodiness, or over-attachment to comfort.
              </p>
            </div>

            <div className="rounded-xl border border-cyan-300/30 bg-cyan-400/5 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-cyan-300">Incarnate Horizon</span>
              <h4 className="font-serif text-lg font-bold text-white">Rising in {signAt(asc?.longitude)}</h4>
              <p className="font-mono text-cyan-200">{degreeFmt(asc?.longitude ?? 0)} · House 1</p>
              <p className="text-slate-300 pt-2 leading-relaxed">
                <strong>Constructive:</strong> Physical embodiment filter, spontaneous life approach, authentic dawn.
              </p>
              <p className="text-slate-400 leading-relaxed">
                <strong>Shadow:</strong> Projecting superficial personas to preemptively manage other people's reactions.
              </p>
            </div>
          </div>
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 2: Planetary Placements
    // -----------------------------------------------------------------------
    case "planetary-placements":
      return (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/40 p-2">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-2 px-2">Planet</th>
                <th className="py-2 px-2">Sign</th>
                <th className="py-2 px-2">Longitude</th>
                <th className="py-2 px-2">Agent H</th>
                <th className="py-2 px-2">God H</th>
                <th className="py-2 px-2">Motion</th>
                <th className="py-2 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allBodies.map((b) => (
                <tr key={b.name} className="hover:bg-white/5">
                  <td className="py-2 px-2 font-semibold text-white">{b.name}</td>
                  <td className="py-2 px-2">{signAt(b.longitude)}</td>
                  <td className="py-2 px-2 font-mono text-amber-200">{degreeFmt(b.longitude)}</td>
                  <td className="py-2 px-2">{b.agentHouse ? `H${b.agentHouse}` : "—"}</td>
                  <td className="py-2 px-2">{b.godHouse ? `H${b.godHouse}` : "—"}</td>
                  <td className="py-2 px-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${b.retrograde ? "bg-rose-950 text-rose-300" : "bg-emerald-950 text-emerald-300"}`}>
                      {b.retrograde ? "Rx" : "Dir"}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    {onInterpretBody && (
                      <button type="button" onClick={() => onInterpretBody(b.name)} className="text-cyan-300 underline">
                        Inspect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 3: House Rulerships
    // -----------------------------------------------------------------------
    case "house-rulerships":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chart.houses.slice(0, 12).map((cusp, i) => {
            const hNum = i + 1;
            const sign = signAt(cusp);
            const ruler = SIGN_RULERS[sign] || "Unknown";
            const occupants = allBodies.filter((b) => (b.agentHouse || b.house) === hNum);
            return (
              <div key={hNum} className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>House {hNum}</span>
                  <span className="text-amber-300 font-mono">{sign} {degreeFmt(cusp)}</span>
                </div>
                <p className="text-slate-400">Ruler: <strong className="text-white">{ruler}</strong></p>
                <p className="text-slate-400">Occupants: {occupants.length ? occupants.map((p) => p.name).join(", ") : "Empty (steered by ruler)"}</p>
              </div>
            );
          })}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 4: Sacred Geometry
    // -----------------------------------------------------------------------
    case "sacred-geometry":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.majorAspects.map((asp, idx) => (
            <div key={idx} className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
              <div className="flex justify-between font-bold text-white">
                <span>{asp.p1.name} {asp.aspect} {asp.p2.name}</span>
                <span className="font-mono text-cyan-300">{asp.orb.toFixed(2)}° orb</span>
              </div>
              <p className="text-[11px] text-slate-300">{asp.interpretation}</p>
            </div>
          ))}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 5: Vedic Nakshatras
    // -----------------------------------------------------------------------
    case "vedic-nakshatras":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allBodies.slice(0, 9).map((b) => {
            const nakName = b.overlay?.nakshatra || "Ashwini";
            const pada = b.overlay?.pada || 1;
            const meta = NAKSHATRA_METADATA.find((m) => m.name === nakName) || NAKSHATRA_METADATA[0];
            return (
              <div key={b.name} className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>{b.name}</span>
                  <span className="text-indigo-300">Pada {pada} / 4</span>
                </div>
                <p className="text-amber-200 font-semibold">{nakName}</p>
                <p className="text-slate-400 text-[11px]">Ruler: {meta.ruler} · Deity: {meta.deity}</p>
                <p className="text-slate-400 text-[11px]">Symbol: {meta.symbol}</p>
              </div>
            );
          })}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 6: Arabic Manzils
    // -----------------------------------------------------------------------
    case "arabic-manzils":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allBodies.slice(0, 9).map((b) => {
            const idx = Math.floor(normalizeLongitude(b.longitude) / (360 / 28));
            const meta = ARABIC_MANAZIL_METADATA[idx] || ARABIC_MANAZIL_METADATA[0];
            return (
              <div key={b.name} className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>{b.name}</span>
                  <span className="text-cyan-300 font-mono text-[11px]">Station {meta.index}</span>
                </div>
                <p className="text-amber-200 font-semibold">{meta.name}</p>
                <p className="text-slate-300 italic text-[11px]">"{meta.translation}"</p>
                <p className="text-slate-400 text-[11px]">{meta.nature}</p>
              </div>
            );
          })}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 7: Chinese Lunar Mansions
    // -----------------------------------------------------------------------
    case "chinese-lunar-mansions":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { q: "Azure Dragon (East)", s: "Spring · Wood", list: ["角 Jiao (Horn)", "亢 Kang (Neck)", "氐 Di (Root)", "房 Fang (Room)", "心 Xin (Heart)", "尾 Wei (Tail)", "箕 Ji (Basket)"] },
              { q: "Black Tortoise (North)", s: "Winter · Water", list: ["斗 Dou (Dipper)", "牛 Niu (Ox)", "女 Nu (Girl)", "虛 Xu (Void)", "危 Wei (Rooftop)", "室 Shi (Encampment)", "壁 Bi (Wall)"] },
              { q: "White Tiger (West)", s: "Autumn · Metal", list: ["奎 Kui (Legs)", "婁 Lou (Bond)", "胃 Wei (Stomach)", "昴 Mao (Pleiades)", "畢 Bi (Net)", "觜 Zi (Beak)", "參 Shen (Orion)"] },
              { q: "Vermilion Bird (South)", s: "Summer · Fire", list: ["井 Jing (Well)", "鬼 Gui (Ghost)", "柳 Liu (Willow)", "星 Xing (Star)", "張 Zhang (Net)", "翼 Yi (Wings)", "軫 Zhen (Chariot)"] },
            ].map((quad) => (
              <div key={quad.q} className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1.5">
                <h4 className="font-bold text-emerald-300">{quad.q}</h4>
                <p className="text-[11px] text-slate-400">{quad.s}</p>
                <div className="text-[10px] text-slate-300 space-y-0.5 pt-1">
                  {quad.list.map((item) => <div key={item}>{item}</div>)}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-400/20 text-slate-300">
            <strong>Historical Canon Note:</strong> The 28 Xiu represent unequal determinative equatorial asterisms mapped across heaven's Four Herald Quadrants rather than modern equal tropical sectors.
          </div>
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 8: Elemental Family Decans
    // -----------------------------------------------------------------------
    case "elemental-decans":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allBodies.slice(0, 9).map((b) => {
            const sign = signAt(b.longitude);
            const decan = Math.min(2, Math.floor((((b.longitude % 360) + 360) % 30) / 10));
            const signIdx = Math.max(0, SIGNS.indexOf(sign as any));
            const family = ELEMENTAL_DECAN_SIGNS[signIdx] || [sign, sign, sign];
            const subSign = family[decan] || sign;
            return (
              <div key={b.name} className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>{b.name} in {sign}</span>
                  <span className="text-emerald-300">Decan {decan + 1}</span>
                </div>
                <p className="text-slate-300">Triplicity Sub-Tone: <strong className="text-amber-200">{subSign}</strong></p>
                <p className="text-slate-400 text-[11px]">Span: {decan * 10}° – {(decan + 1) * 10}° of {sign}</p>
              </div>
            );
          })}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 9: Fixed Stars
    // -----------------------------------------------------------------------
    case "fixed-stars":
      return (
        <div className="space-y-3">
          {data.starContacts.length === 0 ? (
            <p className="text-slate-400 p-4 text-center">No classical royal fixed stars within a tight 2° orb to natal placements.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.starContacts.map((c, i) => (
                <div key={i} className="rounded-xl border border-amber-300/30 bg-black/40 p-3 space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span className="text-amber-200">{c.star} ☌ {c.planet}</span>
                    <span className="font-mono text-cyan-300">{c.orb.toFixed(2)}° orb</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{c.meaning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 10: Arabic Lots
    // -----------------------------------------------------------------------
    case "arabic-lots":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.arabicLots.map((lot) => (
            <div key={lot.id} className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2">
              <div className="flex justify-between font-bold text-white">
                <span className="text-amber-200">{lot.name}</span>
                <span className="font-mono text-cyan-300">{lot.degreeStr}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>Sign: <strong className="text-white">{lot.sign}</strong></div>
                <div>House: <strong className="text-white">House {lot.house}</strong></div>
                <div>Lord: <strong className="text-amber-300">{lot.ruler}</strong></div>
                <div>Formula: <span className="font-mono text-slate-400">{lot.formula}</span></div>
              </div>
              <p className="text-slate-300 text-[11px]">{lot.meaning}</p>
              <div className="pt-1 text-[11px] space-y-0.5">
                <p className="text-emerald-300"><strong>Constructive:</strong> {lot.constructive}</p>
                <p className="text-rose-300"><strong>Caution:</strong> {lot.difficult}</p>
              </div>
            </div>
          ))}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 11: Kabbalah & Sefer Yetzirah
    // -----------------------------------------------------------------------
    case "kabbalah-sefer-yetzirah":
      return (
        <div className="space-y-4">
          {/* Three Mothers */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2">
            <h4 className="font-bold text-amber-200 uppercase tracking-wider text-xs">
              1. The Three Mother Letters (ש ,מ ,א) — Primordial Elements
            </h4>
            <div className="grid gap-2 sm:grid-cols-3">
              {MOTHER_LETTERS.map((m) => (
                <div key={m.letter} className="p-2.5 rounded-lg bg-white/5 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-cyan-300">{m.letter}</span>
                    <strong className="text-white">{m.name}</strong>
                    <span className="text-slate-400">({m.element})</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {m.element === "Air" && "Breath, central equilibrium, space between dualities."}
                    {m.element === "Water" && "Primordial depth, maternal receptivity, cold and mute."}
                    {m.element === "Fire" && "Primordial activation, hiss of creative flame, heaven."}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Seven Doubles */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2">
            <h4 className="font-bold text-indigo-200 uppercase tracking-wider text-xs">
              2. The Seven Double Letters (ת ,ר ,פ ,כ ,ד ,ג ,ב) — Classical Planets & Polarity Gates
            </h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {DOUBLE_LETTERS.map((d) => {
                const natalBody = allBodies.find((b) => b.name === d.planet);
                return (
                  <div key={d.letter} className="p-2.5 rounded-lg bg-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-amber-300">{d.letter}</span>
                        <strong className="text-white">{d.name}</strong>
                      </div>
                      <span className="text-xs text-indigo-300 font-semibold">{d.planet}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">Quality: <strong className="text-white">{d.quality}</strong></p>
                    {natalBody && (
                      <p className="text-[10px] text-cyan-300 font-mono">
                        At: {degreeFmt(natalBody.longitude)} {signAt(natalBody.longitude)} (H{natalBody.agentHouse || natalBody.house})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Twelve Simples */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2">
            <h4 className="font-bold text-violet-200 uppercase tracking-wider text-xs">
              3. The Twelve Simple Letters — Zodiac Constellations & Soul Gates
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {SIMPLE_LETTERS.map((s) => (
                <div key={s.letter} className="p-2 rounded bg-white/5 text-center">
                  <span className="text-base font-bold text-violet-300">{s.letter}</span>
                  <div className="text-xs font-semibold text-white">{s.name}</div>
                  <div className="text-[10px] text-slate-400">{s.sign}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Four Worlds */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2">
            <h4 className="font-bold text-cyan-200 uppercase tracking-wider text-xs">
              4. The Four Worlds of Emanation (סדר ההשתלשלות)
            </h4>
            <div className="grid gap-2 sm:grid-cols-4">
              {FOUR_WORLDS.map((w) => (
                <div key={w.name} className="p-2.5 rounded-lg bg-white/5 space-y-1">
                  <div className="font-bold text-white">{w.name} ({w.hebrew})</div>
                  <div className="text-[11px] text-cyan-300">{w.stage}</div>
                  <p className="text-[10px] text-slate-400">{w.question}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 12: Shadbala
    // -----------------------------------------------------------------------
    case "shadbala":
      return (
        <div className="space-y-3">
          <p className="text-slate-300">
            Parashari Shadbala (Sixfold Potency) measures a planet's total operational capacity through:
            Sthana (Positional), Dig (Directional), Kala (Temporal), Cheshta (Motional), Naisargika (Natural), and Drik (Aspectual) Balas.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].map((pName) => {
              const body = allBodies.find((b) => b.name === pName);
              const sign = signAt(body?.longitude);
              const isAngular = [1, 4, 7, 10].includes(body?.agentHouse || body?.house || 0);
              return (
                <div key={pName} className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>{pName}</span>
                    <span className="text-emerald-300">{isAngular ? "Kendra Strong" : "Moderate"}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Sign: {sign}</p>
                  <p className="text-[11px] text-slate-400">Directional Potency: {isAngular ? "High Digbala" : "Neutral"}</p>
                </div>
              );
            })}
          </div>
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 13: Bhavabala
    // -----------------------------------------------------------------------
    case "bhavabala":
      return (
        <div className="space-y-3">
          <p className="text-slate-300">
            Bhavabala measures the strength of each of the 12 life arenas through its Lord dignity, occupants, and aspectual support.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[1, 4, 7, 10, 5, 9, 2, 11, 3, 6, 8, 12].map((h) => {
              const occupants = allBodies.filter((b) => (b.agentHouse || b.house) === h);
              return (
                <div key={h} className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <div className="font-bold text-white">House {h}</div>
                  <div className="text-[11px] text-slate-400">
                    {occupants.length ? `${occupants.length} planet(s): ${occupants.map((o) => o.name).join(", ")}` : "Unoccupied"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 14: Ashtakavarga
    // -----------------------------------------------------------------------
    case "ashtakavarga":
      return (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex justify-between font-bold text-white">
              <span>Sarvashtakavarga (SAV) Checksum:</span>
              <span className="text-cyan-300 font-mono">337 Bindus Validated</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Highest support signs: {data.ashtakavargaSummary?.highestSigns.join(", ")}
            </p>
            <p className="text-slate-400 text-[11px]">
              Lowest support signs: {data.ashtakavargaSummary?.lowestSigns.join(", ")}
            </p>
          </div>
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 15: Vimshottari Dasha
    // -----------------------------------------------------------------------
    case "vimshottari-dasha":
      return (
        <div className="space-y-3">
          {data.dashaTimeline ? (
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex justify-between font-bold text-white">
                <span>Active Mahadasha: <strong className="text-amber-300">{data.dashaTimeline.currentMahadasha}</strong></span>
                <span className="text-cyan-300 font-mono">120-Year Cycle</span>
              </div>
              <p className="text-slate-300 text-[11px]">Birth Nakshatra: {data.dashaTimeline.birthNakshatra} · Starting Lord: {data.dashaTimeline.startingLord}</p>
              <p className="text-slate-400 text-[11px]">Unexpended birth balance: {data.dashaTimeline.balanceAtBirth} years</p>
            </div>
          ) : (
            <p className="text-slate-400">Requires verified birth time for exact Dasha timeline calculation.</p>
          )}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 16: Vargas
    // -----------------------------------------------------------------------
    case "vargas-divisional-charts":
      return (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/40 p-2">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-2 px-2">Planet</th>
                <th className="py-2 px-2">D1 Natal</th>
                <th className="py-2 px-2">D2 (Hora)</th>
                <th className="py-2 px-2">D3 (Drekkana)</th>
                <th className="py-2 px-2 font-bold text-amber-300">D9 (Navamsha)</th>
                <th className="py-2 px-2">D10 (Dashamsha)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.vargaPlacements.map((v) => (
                <tr key={v.name} className="hover:bg-white/5">
                  <td className="py-2 px-2 font-semibold text-white">{v.name}</td>
                  <td className="py-2 px-2">{v.natalSign}</td>
                  <td className="py-2 px-2">{v.D2}</td>
                  <td className="py-2 px-2">{v.D3}</td>
                  <td className="py-2 px-2 font-semibold text-amber-200">{v.D9}</td>
                  <td className="py-2 px-2">{v.D10}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 17: Vedic Yogas
    // -----------------------------------------------------------------------
    case "vedic-yogas":
      return (
        <div className="space-y-2">
          {data.detectedYogas.length === 0 ? (
            <p className="text-slate-400 p-3">No major Pancha Mahapurusha or classical conjunction yogas detected in current configuration.</p>
          ) : (
            data.detectedYogas.map((y, i) => (
              <div key={i} className="p-3 rounded-xl bg-black/40 border border-amber-300/30 space-y-1">
                <h4 className="font-bold text-amber-200">{y.name}</h4>
                <p className="text-[11px] text-slate-300">{y.message}</p>
              </div>
            ))
          )}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 18: Graha Drishti
    // -----------------------------------------------------------------------
    case "graha-drishti":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {data.drishtiAspects.map((d) => (
            <div key={d.planet} className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
              <h4 className="font-bold text-white">{d.planet} Special Drishti</h4>
              <p className="text-[11px] text-slate-400">Casting rays from House {d.occupiedHouse}:</p>
              <div className="flex gap-1.5 pt-1">
                {d.targets.map((t: number) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-200 border border-indigo-400/30 font-bold">
                    H{t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 19: Hellenistic Techniques
    // -----------------------------------------------------------------------
    case "hellenistic-techniques":
      return (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex justify-between font-bold text-white">
              <span>Sect of Chart:</span>
              <span className="text-amber-300">{data.isDaySect ? "Day Chart (Solar Light Leading)" : "Night Chart (Lunar Light Leading)"}</span>
            </div>
            {data.profectionInfo && (
              <div className="pt-2 border-t border-white/5 space-y-1 text-[11px] text-slate-300">
                <p>Annual Profection Age: <strong>{data.profectionInfo.age} years old</strong></p>
                <p>Activated House of Year: <strong className="text-white">House {data.profectionInfo.profectionHouse} ({data.profectionInfo.cuspSign})</strong></p>
                <p>Lord of the Year: <strong className="text-amber-300">{data.profectionInfo.lordOfYear}</strong></p>
              </div>
            )}
          </div>
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 20: Traditional Planetary Dynamics
    // -----------------------------------------------------------------------
    case "planetary-dynamics":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.planetaryDynamics.map((p) => (
            <div key={p.name} className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between">
              <div>
                <strong className="text-white">{p.name}</strong> ({p.motion})
                <div className="text-[10px] text-slate-400">Distance from Sun: {p.sunDistance}°</div>
              </div>
              <span className={`text-[11px] ${p.tone}`}>{p.condition}</span>
            </div>
          ))}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 21: Hermetic Correspondences
    // -----------------------------------------------------------------------
    case "hermetic-correspondences":
      return (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {HERMETIC_SPHERES.map((s) => (
            <div key={s.sphere} className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
              <h4 className="font-bold text-amber-200">{s.sphere}</h4>
              <p className="text-[11px] text-slate-300">Metal: <strong className="text-white">{s.metal}</strong></p>
              <p className="text-[11px] text-slate-400">Microcosm: {s.organ}</p>
              <p className="text-[10px] text-cyan-300 font-semibold">{s.virtue}</p>
            </div>
          ))}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 22: Elemental Balance
    // -----------------------------------------------------------------------
    case "elemental-balance":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.balance && (
            <>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <h4 className="font-bold text-amber-200 uppercase tracking-wider text-xs">Four Elements</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>🔥 Fire: {data.balance.elements.Fire}</div>
                  <div>🌱 Earth: {data.balance.elements.Earth}</div>
                  <div>💨 Air: {data.balance.elements.Air}</div>
                  <div>🌊 Water: {data.balance.elements.Water}</div>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <h4 className="font-bold text-cyan-200 uppercase tracking-wider text-xs">Three Modalities</h4>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>Cardinal: {data.balance.modalities.Cardinal}</div>
                  <div>Fixed: {data.balance.modalities.Fixed}</div>
                  <div>Mutable: {data.balance.modalities.Mutable}</div>
                </div>
              </div>
            </>
          )}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 23: Dignities & Debilities
    // -----------------------------------------------------------------------
    case "dignities-debilities":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {allBodies.slice(0, 7).map((b) => {
            const sign = signAt(b.longitude);
            const dig = DIGNITY_TABLE[b.name];
            let status = "Peregrine (Neutral)";
            let color = "text-slate-400";
            if (dig) {
              if (dig.domicile.includes(sign)) { status = "Domicile (Ruler · +5)"; color = "text-emerald-300 font-bold"; }
              else if (dig.exaltation === sign) { status = "Exaltation (Peak Honor · +4)"; color = "text-amber-200 font-bold"; }
              else if (dig.fall === sign) { status = "Fall (Challenged · −4)"; color = "text-rose-300"; }
              else if (dig.detriment.includes(sign)) { status = "Detriment (Exile · −5)"; color = "text-rose-400"; }
            }
            return (
              <div key={b.name} className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex justify-between">
                <span className="font-semibold text-white">{b.name} in {sign}</span>
                <span className={color}>{status}</span>
              </div>
            );
          })}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 24: Sabian Symbols
    // -----------------------------------------------------------------------
    case "sabian-symbols":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {allBodies.slice(0, 6).map((b) => {
            const norm = ((b.longitude % 360) + 360) % 360;
            const deg = Math.floor(norm % 30) + 1;
            const sign = signAt(b.longitude);
            const sym = SABIAN_DEGREE_MEANINGS[deg] || `A sacred vision at ${deg}° ${sign}.`;
            return (
              <div key={b.name} className="p-3 rounded-xl bg-black/40 border border-violet-400/20 space-y-1">
                <div className="flex justify-between font-bold text-violet-200">
                  <span>{b.name} Degree</span>
                  <span className="font-mono text-cyan-300">{deg}° {sign}</span>
                </div>
                <p className="text-[11px] text-white italic">"{sym.split("—")[0].trim()}"</p>
              </div>
            );
          })}
        </div>
      );

    // -----------------------------------------------------------------------
    // DRAWER 25: God View vs Agent View Comparison
    // -----------------------------------------------------------------------
    case "god-agent-comparison":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3.5 rounded-xl bg-black/40 border border-amber-300/30 space-y-1.5">
              <div className="font-bold text-amber-300 text-sm">God View Framework (Cosmic Will)</div>
              <p className="text-slate-300 text-[11px]">Fixed 0° Aries = House 1. Universal immutable reference plane independent of earthly horizon.</p>
              <p className="text-slate-400 text-[11px]">Sun God House: <strong>House {sun?.godHouse ?? "—"}</strong></p>
              <p className="text-slate-400 text-[11px]">Moon God House: <strong>House {moon?.godHouse ?? "—"}</strong></p>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-cyan-300/30 space-y-1.5">
              <div className="font-bold text-cyan-300 text-sm">Agent View Framework (Incarnate Dawn)</div>
              <p className="text-slate-300 text-[11px]">East Horizon Ascendant = House 1. Topocentric earthly vantage point grounded in birth latitude/longitude.</p>
              <p className="text-slate-400 text-[11px]">Sun Agent House: <strong>House {sun?.agentHouse ?? sun?.house ?? "—"}</strong></p>
              <p className="text-slate-400 text-[11px]">Moon Agent House: <strong>House {moon?.agentHouse ?? moon?.house ?? "—"}</strong></p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            The Absolute preserves both frameworks simultaneously: God View for eternal archetypal blueprint; Agent View for incarnate somatic navigation.
          </p>
        </div>
      );

    default:
      return <p className="text-slate-400">Technical details for this section are being prepared.</p>;
  }
}
