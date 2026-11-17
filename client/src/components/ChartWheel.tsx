import { PlacementMiniReading } from "./PlacementMiniReading";
import { FocusedPlacementReading } from "./FocusedPlacementReading";
import { FIXED_STARS, NAKSHATRAS, MANAZIL } from "../../../shared/hybrid";
import {
  calculateEnergyStarsAndLots,
  type ArabicLotEnergyEntry,
  type NatalFixedStarPosition,
} from "../../../shared/energyStarsAndLots";
import { useEffect, useMemo, useState } from "react";
import type { ChartResult, ChartRow, TransitContact, MinorTransitContact } from "../../../server/astronomy";

const PLANET_COLORS: Record<string, string> = {
  Sun: "#F5C451",
  Moon: "#F1F5F9",
  Mercury: "#38BDF8",
  Venus: "#F472B6",
  Mars: "#FB7185",
  Jupiter: "#C084FC",
  Saturn: "#94A3B8",
  Uranus: "#2DD4BF",
  Neptune: "#818CF8",
  Pluto: "#E879F9",
  "North Node": "#34D399",
  "South Node": "#FBBF24",
  Ascendant: "#67E8F9",
  Descendant: "#F0ABFC",
};

const ZODIAC_ELEMENTS: Array<{
  sign: string;
  abbr: string;
  color: string;
  element: "Fire" | "Earth" | "Air" | "Water";
  path: string;
}> = [
  {
    sign: "Aries",
    abbr: "ARI",
    color: "#FB923C",
    element: "Fire",
    path: "M 0 7.5 L 0 -1.5 M 0 -1.5 C 0 -7.5 -7.5 -7.5 -7.5 -2.5 C -7.5 -0.5 -5.5 0.5 -4.2 0 M 0 -1.5 C 0 -7.5 7.5 -7.5 7.5 -2.5 C 7.5 -0.5 5.5 0.5 4.2 0",
  },
  {
    sign: "Taurus",
    abbr: "TAU",
    color: "#34D399",
    element: "Earth",
    path: "M -5.8 -7.2 C -3.8 -2.8 3.8 -2.8 5.8 -7.2 M -4.8 3.2 A 4.8 4.8 0 1 0 4.8 3.2 A 4.8 4.8 0 1 0 -4.8 3.2",
  },
  {
    sign: "Gemini",
    abbr: "GEM",
    color: "#38BDF8",
    element: "Air",
    path: "M -6.8 -6.5 Q 0 -3.8 6.8 -6.5 M -6.8 6.5 Q 0 3.8 6.8 6.5 M -2.8 -5 L -2.8 5 M 2.8 -5 L 2.8 5",
  },
  {
    sign: "Cancer",
    abbr: "CAN",
    color: "#A78BFA",
    element: "Water",
    path: "M -4.8 -3.6 A 2.6 2.6 0 1 0 -4.79 -3.6 M -5 -6.2 C 0.5 -6.2 5 -3.6 7.5 -1 M 4.8 3.6 A 2.6 2.6 0 1 0 4.79 3.6 M 5 6.2 C -0.5 6.2 -5 3.6 -7.5 1",
  },
  {
    sign: "Leo",
    abbr: "LEO",
    color: "#FBBF24",
    element: "Fire",
    path: "M -4.8 2.2 A 2.8 2.8 0 1 0 -4.79 2.2 M -2.1 1.4 C -2.1 -5.2 3.8 -7.2 5.4 -2.4 C 6.2 0.2 2.4 5.2 5.2 6.4 C 6.8 7 8 5.4 8 4.2",
  },
  {
    sign: "Virgo",
    abbr: "VIR",
    color: "#2DD4BF",
    element: "Earth",
    path: "M -6.8 -5.5 L -6.8 4.8 M -6.8 -1.8 C -6.8 -5.5 -2 -5.5 -2 -1.8 L -2 4.8 M -2 -1.8 C -2 -5.5 2.8 -5.5 2.8 -1.8 L 2.8 4.5 C 2.8 7.4 5.8 7.4 7.5 4.2 M 2.8 0.8 C 6.8 -0.8 7.2 3.6 1 6.8",
  },
  {
    sign: "Libra",
    abbr: "LIB",
    color: "#7DD3FC",
    element: "Air",
    path: "M -7.5 4.8 L 7.5 4.8 M -7.5 1.2 L -3.3 1.2 A 3.3 3.3 0 1 1 3.3 1.2 L 7.5 1.2",
  },
  {
    sign: "Scorpio",
    abbr: "SCO",
    color: "#C084FC",
    element: "Water",
    path: "M -6.8 -5.5 L -6.8 4.2 M -6.8 -1.8 C -6.8 -5.5 -2 -5.5 -2 -1.8 L -2 4.2 M -2 -1.8 C -2 -5.5 2.8 -5.5 2.8 -1.8 L 2.8 4 C 2.8 6.4 5.2 6.8 7.5 4.2 M 5.4 3.8 L 7.8 3.8 L 7 6.2",
  },
  {
    sign: "Sagittarius",
    abbr: "SAG",
    color: "#F59E0B",
    element: "Fire",
    path: "M -6.5 6.5 L 6.5 -6.5 M 1 -6.5 L 6.5 -6.5 L 6.5 -1 M -3.8 -0.2 L 0.2 3.8",
  },
  {
    sign: "Capricorn",
    abbr: "CAP",
    color: "#4ADE80",
    element: "Earth",
    path: "M -6.8 -5 L -3.6 4.2 L 0 -2.6 L 2.8 4 C 4.5 7.6 8.2 4.8 6.4 1.2 C 5 -1.4 1.8 0 2.6 3",
  },
  {
    sign: "Aquarius",
    abbr: "AQU",
    color: "#22D3EE",
    element: "Air",
    path: "M -7.2 -2.6 L -3.6 -5.4 L 0 -2.6 L 3.6 -5.4 L 7.2 -2.6 M -7.2 3.2 L -3.6 0.4 L 0 3.2 L 3.6 0.4 L 7.2 3.2",
  },
  {
    sign: "Pisces",
    abbr: "PIS",
    color: "#818CF8",
    element: "Water",
    path: "M -5.4 -6.6 C -1.2 -2 -1.2 2 -5.4 6.6 M 5.4 -6.6 C 1.2 -2 1.2 2 5.4 6.6 M -6.6 0 L 6.6 0",
  },
];

const ASPECT_STYLES: Record<
  TransitContact["aspect"] | MinorTransitContact["aspect"],
  { color: string; label: string; isMajor: boolean; dash?: string }
> = {
  conjunction: { color: "#F5C451", label: "Conjunction", isMajor: true },
  trine: { color: "#2DD4BF", label: "Trine", isMajor: true },
  sextile: { color: "#38BDF8", label: "Sextile", isMajor: true },
  square: { color: "#FB7185", label: "Square", isMajor: true, dash: "5 4" },
  opposition: { color: "#F43F5E", label: "Opposition", isMajor: true, dash: "7 4" },
  semisextile: { color: "#67E8F9", label: "Semisextile", isMajor: false, dash: "2 3" },
  semisquare: { color: "#FB923C", label: "Semisquare", isMajor: false, dash: "3 3" },
  quincunx: { color: "#C084FC", label: "Quincunx", isMajor: false, dash: "2 4" },
};

const shortName = (name: string) =>
  name === "North Node"
    ? "NN"
    : name === "South Node"
    ? "SN"
    : name === "Ascendant"
    ? "ASC"
    : name === "Descendant"
    ? "DSC"
    : name.slice(0, 2).toUpperCase();

const normalize = (value: number) => ((value % 360) + 360) % 360;

const point = (longitude: number, radius: number, center: number, anchorLon = 0) => {
  // Standard astrology wheel: anchor (Ascendant / House 1 cusp) at 9 o'clock (180°), increasing longitude moves counterclockwise.
  const svgDeg = 180 - (longitude - anchorLon);
  const rad = (svgDeg * Math.PI) / 180;
  return {
    x: center + Math.cos(rad) * radius,
    y: center + Math.sin(rad) * radius,
  };
};

const signedAngularDelta = (a: number, b: number) => {
  const d = normalize(b - a);
  return d > 180 ? d - 360 : d;
};

/**
 * Circular anti-collision solver: preserves each body's true longitude for its
 * marker orb while separating dense badge labels by at least `minSepDeg`.
 */
function spreadLabelAngles<T extends { longitude: number }>(
  items: T[],
  minSepDeg = 11.5
): Array<{ item: T; labelAngle: number }> {
  if (!items.length) return [];
  const sorted = items
    .map((item) => ({ item, orig: normalize(item.longitude), labelAngle: normalize(item.longitude) }))
    .sort((a, b) => a.orig - b.orig);

  for (let pass = 0; pass < 18; pass++) {
    let moved = false;
    for (let i = 0; i < sorted.length; i++) {
      const curr = sorted[i];
      const next = sorted[(i + 1) % sorted.length];
      let gap = normalize(next.labelAngle - curr.labelAngle);
      if (sorted.length === 1) break;
      if (gap < minSepDeg) {
        const push = (minSepDeg - gap) * 0.52;
        curr.labelAngle = normalize(curr.labelAngle - push);
        next.labelAngle = normalize(next.labelAngle + push);
        moved = true;
      }
    }
    // Gently pull labels back toward their true origin while respecting minSepDeg
    for (const node of sorted) {
      const pull = signedAngularDelta(node.labelAngle, node.orig) * 0.12;
      node.labelAngle = normalize(node.labelAngle + pull);
    }
    if (!moved && pass > 4) break;
  }

  return sorted.map(({ item, labelAngle }) => ({ item, labelAngle }));
}

function PlanetVectorGlyph({ name, color }: { name: string; color: string }) {
  switch (name) {
    case "Sun":
      return (
        <g stroke={color} fill="none" strokeWidth="1.5">
          <circle cx="0" cy="0" r="4.5" />
          <circle cx="0" cy="0" r="1.1" fill={color} />
        </g>
      );
    case "Moon":
      return (
        <path
          d="M 2.5 -4.5 A 4.8 4.8 0 1 0 2.5 4.5 A 3.6 3.6 0 1 1 2.5 -4.5 Z"
          fill={color}
          stroke={color}
          strokeWidth="0.8"
        />
      );
    case "Mercury":
      return (
        <g stroke={color} fill="none" strokeWidth="1.4" strokeLinecap="round">
          <path d="M -2.5 -5.5 C -1.5 -3.6 1.5 -3.6 2.5 -5.5" />
          <circle cx="0" cy="-0.8" r="2.7" />
          <path d="M 0 1.9 L 0 5.6 M -2.3 3.8 L 2.3 3.8" />
        </g>
      );
    case "Venus":
      return (
        <g stroke={color} fill="none" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="0" cy="-1.6" r="3.1" />
          <path d="M 0 1.5 L 0 5.6 M -2.4 3.6 L 2.4 3.6" />
        </g>
      );
    case "Mars":
      return (
        <g stroke={color} fill="none" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="-1.3" cy="1.3" r="3" />
          <path d="M 0.9 -0.9 L 4.8 -4.8 M 1.6 -4.8 L 4.8 -4.8 L 4.8 -1.6" />
        </g>
      );
    case "Jupiter":
      return (
        <path
          d="M -3.5 -2.2 C -3.5 -5 0.5 -5 0.5 -2.2 C 0.5 0 -3.5 1.2 -3.5 2.5 L 3.8 2.5 M 1.8 -4.5 L 1.8 5.2"
          stroke={color}
          fill="none"
          strokeWidth="1.45"
          strokeLinecap="round"
        />
      );
    case "Saturn":
      return (
        <path
          d="M -2.5 -5.2 L -2.5 4.2 M -4.2 -3.2 L -0.5 -3.2 M -2.5 0 C -0.5 -1.5 2.5 -0.8 2.2 1.8 C 2 3.8 0.5 4.6 3.5 4.8"
          stroke={color}
          fill="none"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      );
    case "Uranus":
      return (
        <g stroke={color} fill="none" strokeWidth="1.35" strokeLinecap="round">
          <circle cx="0" cy="3" r="2.2" />
          <path d="M 0 0.8 L 0 -5 M -3.5 -4.5 L -3.5 0.5 M 3.5 -4.5 L 3.5 0.5 M -3.5 -2 L 3.5 -2" />
        </g>
      );
    case "Neptune":
      return (
        <path
          d="M 0 -5.2 L 0 5.4 M -2.4 3 L 2.4 3 M -3.6 -4.5 C -3.6 -0.2 3.6 -0.2 3.6 -4.5"
          stroke={color}
          fill="none"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      );
    case "Pluto":
      return (
        <g stroke={color} fill="none" strokeWidth="1.35" strokeLinecap="round">
          <circle cx="0" cy="-3.2" r="2.1" />
          <path d="M -3.4 -3.2 C -3.4 1.2 3.4 1.2 3.4 -3.2 M 0 0.2 L 0 5.4 M -2.4 3.2 L 2.4 3.2" />
        </g>
      );
    case "North Node":
      return (
        <g stroke={color} fill="none" strokeWidth="1.4" strokeLinecap="round">
          <path d="M -3.2 2.8 C -5.5 -2.5 -2 -5.2 0 -5.2 C 2 -5.2 5.5 -2.5 3.2 2.8" />
          <circle cx="-3.6" cy="3.6" r="1.2" />
          <circle cx="3.6" cy="3.6" r="1.2" />
        </g>
      );
    case "South Node":
      return (
        <g stroke={color} fill="none" strokeWidth="1.4" strokeLinecap="round">
          <path d="M -3.2 -2.8 C -5.5 2.5 -2 5.2 0 5.2 C 2 5.2 5.5 2.5 3.2 -2.8" />
          <circle cx="-3.6" cy="-3.6" r="1.2" />
          <circle cx="3.6" cy="-3.6" r="1.2" />
        </g>
      );
    default:
      return (
        <text
          x="0"
          y="1"
          fill={color}
          fontSize="7.5"
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-monospace, monospace"
        >
          {shortName(name)}
        </text>
      );
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-2 last:border-0 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-mono tabular-nums text-slate-100">{value}</span>
    </div>
  );
}

export function ChartWheel({ chart }: { chart: ChartResult }) {
  const hasTransits = Boolean(chart.transits?.length);
  const [layers, setLayers] = useState({
    stars: false,
    lots: false,
    vedic: false,
    arabic: false,
    chinese: false,
    aspects: true,
    natal: true,
    transits: hasTransits,
    houses: true,
    zodiac: true,
    labels: true,
    nodes: true,
  });
  const [selectedStar, setSelectedStar] = useState<{ name: string; longitude: number } | null>(null);
  const [selectedLot, setSelectedLot] = useState<ArabicLotEnergyEntry | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ kind: "natal" | "transit"; row: ChartRow } | null>(null);
  const [hoveredBody, setHoveredBody] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPoint(null);
    setSelectedHouse(null);
    setSelectedStar(null);
    setSelectedLot(null);
    setHoveredBody(null);
  }, [chart]);

  const starsAndLots = useMemo(() => calculateEnergyStarsAndLots(chart), [chart]);

  const selectedStarPosition: NatalFixedStarPosition | null = useMemo(() => {
    if (!selectedStar) return null;
    return (
      starsAndLots.natalStarPositions.find((pos) => pos.starName === selectedStar.name) ?? null
    );
  }, [selectedStar, starsAndLots.natalStarPositions]);

  const size = 820;
  const center = size / 2;
  const outerBezelR = 392;
  const zodiacOuterR = 382;
  const zodiacInnerR = 336;
  const rulerR = 322;
  const natalLabelR = 296;
  const natalOrbR = 264;
  const houseRingR = 236;
  const transitOrbR = 204;
  const transitLabelR = 175;
  const aspectApertureR = 148;
  const centerHubR = 54;

  const houses = chart.houses.slice(0, 12);
  const anchorLon = houses[0] ?? 0;
  const pt = (longitude: number, radius: number) => point(longitude, radius, center, anchorLon);

  const natalRows = useMemo(
    () =>
      [...chart.movingBodies, chart.ascendant, chart.descendant, chart.northNode, chart.southNode].filter(
        (row): row is ChartRow => Boolean(row)
      ),
    [chart]
  );

  const transitRows = useMemo(
    () =>
      chart.transits.filter((row) =>
        [
          "Sun",
          "Moon",
          "Mercury",
          "Venus",
          "Mars",
          "Jupiter",
          "Saturn",
          "Uranus",
          "Neptune",
          "Pluto",
          "North Node",
          "South Node",
        ].includes(row.name)
      ),
    [chart]
  );

  const visibleNatalRows = useMemo(
    () => natalRows.filter((row) => layers.nodes || !row.name.includes("Node")),
    [natalRows, layers.nodes]
  );

  const visibleTransitRows = useMemo(
    () => transitRows.filter((row) => layers.nodes || !row.name.includes("Node")),
    [transitRows, layers.nodes]
  );

  const spreadNatal = useMemo(() => spreadLabelAngles(visibleNatalRows, 11.5), [visibleNatalRows]);
  const spreadTransits = useMemo(() => spreadLabelAngles(visibleTransitRows, 13.5), [visibleTransitRows]);
  const spreadLots = useMemo(() => spreadLabelAngles(starsAndLots.lots, 11), [starsAndLots.lots]);
  const spreadKeyStars = useMemo(
    () =>
      spreadLabelAngles(
        starsAndLots.natalStarPositions
          .filter((s) => s.isKeyMarker || s.natalConjunctions.length > 0)
          .map((s) => ({ ...s, longitude: s.starLongitude })),
        9.5
      ),
    [starsAndLots.natalStarPositions]
  );
  const starPosByName = useMemo(
    () => new Map(starsAndLots.natalStarPositions.map((s) => [s.starName, s])),
    [starsAndLots.natalStarPositions]
  );

  const natalByName = useMemo(() => new Map(natalRows.map((row) => [row.name, row])), [natalRows]);

  const transitAspects = useMemo(
    () =>
      transitRows.flatMap((transit) =>
        [...transit.natalContacts, ...transit.minorNatalContacts]
          .map((contact) => {
            const natal = natalByName.get(contact.natalName);
            return natal ? { transit, natal, contact } : null;
          })
          .filter(Boolean) as Array<{
          transit: ChartRow;
          natal: ChartRow;
          contact: TransitContact | MinorTransitContact;
        }>
      ),
    [transitRows, natalByName]
  );

  // Internal Natal-to-Natal major aspect geometry when viewing Natal Only (so center aperture is never blank)
  const natalInternalAspects = useMemo(() => {
    const out: Array<{
      a: ChartRow;
      b: ChartRow;
      aspect: keyof typeof ASPECT_STYLES;
      orb: number;
    }> = [];
    const bodies = chart.movingBodies.slice(0, 10);
    const rules: Array<{ angle: number; aspect: keyof typeof ASPECT_STYLES; maxOrb: number }> = [
      { angle: 0, aspect: "conjunction", maxOrb: 6 },
      { angle: 60, aspect: "sextile", maxOrb: 4 },
      { angle: 90, aspect: "square", maxOrb: 5 },
      { angle: 120, aspect: "trine", maxOrb: 5 },
      { angle: 180, aspect: "opposition", maxOrb: 6 },
    ];
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const diff = Math.abs(normalize(bodies[i].longitude - bodies[j].longitude));
        const sep = Math.min(diff, 360 - diff);
        for (const r of rules) {
          const orb = Math.abs(sep - r.angle);
          if (orb <= r.maxOrb) {
            out.push({ a: bodies[i], b: bodies[j], aspect: r.aspect, orb: Number(orb.toFixed(2)) });
            break;
          }
        }
      }
    }
    return out;
  }, [chart.movingBodies]);

  const activeHouse = selectedHouse ? houses[selectedHouse - 1] : null;
  const activeRows = selectedHouse ? natalRows.filter((row) => row.house === selectedHouse) : [];

  const focusTitle = selectedLot
    ? selectedLot.meta.name
    : selectedStar
    ? `Fixed Star ${selectedStar.name}`
    : selectedPoint
    ? `${selectedPoint.kind === "transit" ? "Transit" : "Natal"} ${selectedPoint.row.name}`
    : selectedHouse
    ? `House ${selectedHouse}`
    : "Chart Focus";

  const focusDescription = selectedLot
    ? `${selectedLot.meta.lifeDomain} · Standalone natal placement in House ${selectedLot.house}.`
    : selectedStarPosition
    ? `${selectedStarPosition.starDisplay} · House ${selectedStarPosition.house} (${selectedStarPosition.houseArena})`
    : selectedStar
    ? `${selectedStar.name} is anchored at ${selectedStar.longitude.toFixed(2)}° in the fixed-star catalog.`
    : selectedPoint
    ? selectedPoint.kind === "transit"
      ? "A live moving planet in the current sky relative to your birth chart."
      : "An enduring birth-chart placement anchored to your natal horizon."
    : selectedHouse
    ? "Tap any planet inside or outside this wedge to inspect exact degrees and aspects."
    : "Tap any zodiac house, planet, fixed star, or Arabic Lot to inspect its exact degrees and meaning.";

  const highlightedBodyKey = hoveredBody || (selectedPoint ? `${selectedPoint.kind}:${selectedPoint.row.name}` : null);

  return (
    <div className="chart-wheel-shell rounded-3xl border border-cyan-300/25 bg-[#060B18] p-3.5 shadow-[0_24px_70px_rgba(0,0,0,0.65)] sm:p-6">
      {/* Header & Quick Observatory Presets */}
      <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E5C16C]">
            Horological Celestial Dial
          </p>
          <h3 className="mt-0.5 font-serif text-xl font-bold text-white sm:text-2xl">
            Interactive Natal & Transit Wheel
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>Outer: Birth Chart</span>
            <span aria-hidden="true">·</span>
            <span>Inner: Live Transits</span>
            <span aria-hidden="true">·</span>
            <span>Core: Geometric Aspects</span>
          </div>
        </div>

        {/* One-Tap Observatory Presets */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-[#0B1224] p-1">
          <button
            type="button"
            onClick={() =>
              setLayers({
                stars: false,
                lots: false,
                vedic: false,
                arabic: false,
                chinese: false,
                aspects: true,
                natal: true,
                transits: hasTransits,
                houses: true,
                zodiac: true,
                labels: true,
                nodes: true,
              })
            }
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              layers.natal && layers.aspects && !layers.stars && !layers.lots && !layers.vedic
                ? "bg-[#E5C16C] text-slate-950 shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Observatory Default
          </button>
          <button
            type="button"
            onClick={() =>
              setLayers({
                stars: false,
                lots: false,
                vedic: false,
                arabic: false,
                chinese: false,
                aspects: true,
                natal: true,
                transits: false,
                houses: true,
                zodiac: true,
                labels: true,
                nodes: false,
              })
            }
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              !layers.transits && layers.aspects && !layers.stars && !layers.lots
                ? "bg-cyan-400/25 text-cyan-100 border border-cyan-400/40"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Natal Geometry
          </button>
          <button
            type="button"
            onClick={() =>
              setLayers({
                stars: true,
                lots: true,
                vedic: true,
                arabic: true,
                chinese: false,
                aspects: true,
                natal: true,
                transits: hasTransits,
                houses: true,
                zodiac: true,
                labels: true,
                nodes: true,
              })
            }
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              layers.stars && layers.lots
                ? "bg-violet-400/25 text-violet-100 border border-violet-400/40"
                : "text-slate-300 hover:text-white"
            }`}
          >
            All Sky Layers
          </button>
        </div>
      </div>

      {/* Tactile Individual Layer Toggles */}
      <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Celestial layer visibility">
        {(
          [
            ["zodiac", "Zodiac Bezel"],
            ["houses", "12 Houses"],
            ["natal", "Natal Planets"],
            ...(hasTransits ? ([["transits", "Live Transits"]] as const) : []),
            ["aspects", "Aspect Chords"],
            ["nodes", "Lunar Nodes"],
            ["stars", "Fixed Stars"],
            ...(starsAndLots.lotsAvailable ? ([["lots", "Arabic Lots"]] as const) : []),
            ["vedic", "27 Nakshatras"],
            ["arabic", "28 Manzils"],
          ] as const
        ).map(([key, label]) => {
          const active = layers[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setLayers((old) => ({ ...old, [key]: !old[key] }))}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                active
                  ? "border-cyan-400/45 bg-cyan-950/50 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200"
              }`}
            >
              {active ? "✓ " : ""}
              {label}
            </button>
          );
        })}
      </div>

      {/* Main Wheel + Focus Panel */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="mx-auto w-full max-w-[780px] overflow-hidden rounded-2xl border border-white/10 bg-[#040711] p-1.5 shadow-[inset_0_0_50px_rgba(14,30,68,0.45)] sm:p-4">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="h-auto w-full"
            role="img"
            aria-label="Interactive natal and transit astrology chart wheel"
          >
            <defs>
              <radialGradient id="wheelObsidianCore" cx="50%" cy="46%" r="54%">
                <stop offset="0%" stopColor="#122146" stopOpacity="0.95" />
                <stop offset="55%" stopColor="#080F23" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#040711" stopOpacity="1" />
              </radialGradient>
              <radialGradient id="wheelApertureGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.24" />
                <stop offset="65%" stopColor="#0F172A" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="goldBezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5D78B" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#B88E3D" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#67E8F9" stopOpacity="0.6" />
              </linearGradient>
              <filter id="wheelGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="softChordGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer Precision Bezel & Concentric Tracks */}
            <circle cx={center} cy={center} r={outerBezelR} fill="#060B18" stroke="url(#goldBezelGrad)" strokeWidth="2.4" />
            <circle cx={center} cy={center} r={zodiacOuterR} fill="#0B1328" stroke="rgba(229,193,108,0.4)" strokeWidth="1" />
            <circle cx={center} cy={center} r={zodiacInnerR} fill="url(#wheelObsidianCore)" stroke="rgba(229,193,108,0.45)" strokeWidth="1.2" />
            <circle cx={center} cy={center} r={rulerR} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="0.9" />
            <circle cx={center} cy={center} r={natalOrbR} fill="none" stroke="rgba(245,196,81,0.24)" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx={center} cy={center} r={houseRingR} fill="none" stroke="rgba(103,232,249,0.25)" strokeWidth="1" />
            <circle cx={center} cy={center} r={transitOrbR} fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="1" strokeDasharray="2 5" />
            <circle cx={center} cy={center} r={aspectApertureR} fill="url(#wheelApertureGlow)" stroke="rgba(229,193,108,0.35)" strokeWidth="1.2" />

            {/* Subtle Celestial Background Rings inside Aspect Aperture */}
            <circle cx={center} cy={center} r={102} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.8" />
            <circle cx={center} cy={center} r={centerHubR} fill="#060C1D" stroke="rgba(229,193,108,0.45)" strokeWidth="1.1" />

            {/* 360° Vernier Degree Ticks */}
            {Array.from({ length: 120 }).map((_, idx) => {
              const deg = idx * 3;
              const isSignBoundary = deg % 30 === 0;
              const isMajor15 = deg % 15 === 0;
              const r1 = zodiacInnerR;
              const r2 = isSignBoundary ? rulerR - 8 : isMajor15 ? rulerR - 4 : rulerR + 4;
              const a = pt(deg, r1);
              const b = pt(deg, r2);
              return (
                <line
                  key={`tick-${deg}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isSignBoundary ? "#E5C16C" : isMajor15 ? "#7DD3FC" : "#475569"}
                  strokeOpacity={isSignBoundary ? 0.75 : isMajor15 ? 0.5 : 0.45}
                  strokeWidth={isSignBoundary ? 1.5 : 0.9}
                />
              );
            })}

            {/* 12 Houses Sectors & Non-Overlapping Roman/Numeric Pockets (Counterclockwise from 9 o'clock ASC) */}
            {layers.houses &&
              houses.map((longitude, i) => {
                const nextLon = houses[(i + 1) % 12];
                const innerA = pt(longitude, aspectApertureR);
                const innerB = pt(nextLon, aspectApertureR);
                const outerA = pt(longitude, zodiacInnerR);
                const outerB = pt(nextLon, zodiacInnerR);
                const midLon = normalize(longitude + ((normalize(nextLon - longitude) || 30) / 2));
                const houseLabelPt = pt(midLon, 222);
                const house = i + 1;
                const active = selectedHouse === house;
                const isAngular = house === 1 || house === 4 || house === 7 || house === 10;
                const sectorFill = active
                  ? "rgba(56, 189, 248, 0.14)"
                  : i % 2 === 0
                  ? "rgba(15, 23, 42, 0.25)"
                  : "rgba(30, 41, 59, 0.08)";

                return (
                  <g
                    key={`house-${house}`}
                    onClick={() => {
                      setSelectedHouse(house);
                      setSelectedPoint(null);
                      setSelectedStar(null);
                      setSelectedLot(null);
                    }}
                    className="cursor-pointer"
                  >
                    <path
                      d={`M ${innerA.x} ${innerA.y} L ${outerA.x} ${outerA.y} A ${zodiacInnerR} ${zodiacInnerR} 0 0 0 ${outerB.x} ${outerB.y} L ${innerB.x} ${innerB.y} A ${aspectApertureR} ${aspectApertureR} 0 0 1 ${innerA.x} ${innerA.y} Z`}
                      fill={sectorFill}
                      stroke="none"
                    />
                    <line
                      x1={innerA.x}
                      y1={innerA.y}
                      x2={outerA.x}
                      y2={outerA.y}
                      stroke={active ? "#38BDF8" : isAngular ? "#E5C16C" : "#475569"}
                      strokeOpacity={active ? 0.95 : isAngular ? 0.72 : 0.42}
                      strokeWidth={active ? 2 : isAngular ? 1.5 : 0.9}
                    />
                    <circle
                      cx={houseLabelPt.x}
                      cy={houseLabelPt.y}
                      r="10"
                      fill={active ? "rgba(56,189,248,0.22)" : "rgba(6,11,24,0.85)"}
                      stroke={active ? "#38BDF8" : "rgba(148,163,184,0.25)"}
                      strokeWidth="0.9"
                    />
                    <text
                      x={houseLabelPt.x}
                      y={houseLabelPt.y + 0.5}
                      fill={active ? "#E0F2FE" : isAngular ? "#F5D78B" : "#94A3B8"}
                      fontSize="10.5"
                      fontWeight="700"
                      fontFamily="ui-monospace, monospace"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {house}
                    </text>
                  </g>
                );
              })}

            {/* Zodiac Bezel Sectors & Bespoke Vector Glyphs (Counterclockwise) */}
            {layers.zodiac &&
              ZODIAC_ELEMENTS.map((z, i) => {
                const startDeg = i * 30;
                const midDeg = startDeg + 15;
                const endDeg = startDeg + 30;
                const outerA = pt(startDeg, zodiacOuterR);
                const outerB = pt(endDeg, zodiacOuterR);
                const innerA = pt(startDeg, zodiacInnerR);
                const innerB = pt(endDeg, zodiacInnerR);
                const glyphPt = pt(midDeg, (zodiacOuterR + zodiacInnerR) / 2 - 2);
                const abbrPt = pt(midDeg, zodiacInnerR + 9);

                return (
                  <g key={z.sign}>
                    <path
                      d={`M ${innerA.x} ${innerA.y} L ${outerA.x} ${outerA.y} A ${zodiacOuterR} ${zodiacOuterR} 0 0 0 ${outerB.x} ${outerB.y} L ${innerB.x} ${innerB.y} A ${zodiacInnerR} ${zodiacInnerR} 0 0 1 ${innerA.x} ${innerA.y} Z`}
                      fill={i % 2 === 0 ? "rgba(18, 30, 58, 0.72)" : "rgba(9, 16, 36, 0.85)"}
                      stroke="rgba(229,193,108,0.28)"
                      strokeWidth="1"
                    />
                    <g transform={`translate(${glyphPt.x}, ${glyphPt.y}) scale(1.15)`}>
                      <path
                        d={z.path}
                        fill="none"
                        stroke={z.color}
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                    <text
                      x={abbrPt.x}
                      y={abbrPt.y}
                      fill="rgba(226,232,240,0.62)"
                      fontSize="7.2"
                      fontWeight="700"
                      letterSpacing="0.08em"
                      fontFamily="ui-monospace, monospace"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {z.abbr}
                    </text>
                    <title>{z.sign} ({z.element})</title>
                  </g>
                );
              })}

            {/* Optional Deep Layers: Nakshatras, Arabic Manzils, Fixed Stars */}
            {layers.vedic &&
              NAKSHATRAS.map((name, i) => {
                const p = pt(((i + 0.5) * 360) / 27, rulerR - 1);
                return (
                  <g key={name}>
                    <title>Vedic Nakshatra {i + 1}: {name}</title>
                    <circle cx={p.x} cy={p.y} r="2.6" fill="#F5C451" fillOpacity="0.85" />
                  </g>
                );
              })}

            {layers.arabic &&
              MANAZIL.map((name, i) => {
                const p = pt(((i + 0.5) * 360) / 28, rulerR - 9);
                return (
                  <g key={name}>
                    <title>Arabic Manzil {i + 1}: {name}</title>
                    <circle cx={p.x} cy={p.y} r="2.3" fill="#38BDF8" fillOpacity="0.85" />
                  </g>
                );
              })}

            {layers.stars &&
              FIXED_STARS.map(([name, longitude]) => {
                const pos = starPosByName.get(name);
                const p = pt(longitude, zodiacInnerR - 6);
                const active = selectedStar?.name === name;
                const isAlgol = name === "Algol";
                const starFill = active
                  ? "#FEF08A"
                  : isAlgol
                  ? "#FB7185"
                  : pos?.isRoyal
                  ? "#FDE047"
                  : "#F5C451";
                return (
                  <g
                    key={name}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect fixed star ${name}`}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedStar({ name, longitude });
                      setSelectedPoint(null);
                      setSelectedHouse(null);
                      setSelectedLot(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedStar({ name, longitude });
                        setSelectedPoint(null);
                        setSelectedHouse(null);
                        setSelectedLot(null);
                      }
                    }}
                  >
                    <polygon
                      points={isAlgol || pos?.isRoyal ? "0,-6 1.7,-1.7 6,0 1.7,1.7 0,6 -1.7,1.7 -6,0 -1.7,-1.7" : "0,-4.5 1.3,-1.3 4.5,0 1.3,1.3 0,4.5 -1.3,1.3 -4.5,0 -1.3,-1.3"}
                      transform={`translate(${p.x}, ${p.y})`}
                      fill={starFill}
                      stroke="#040711"
                      strokeWidth="0.6"
                      filter={active || isAlgol ? "url(#wheelGlow)" : undefined}
                    />
                    <title>
                      {name} · {pos ? `${pos.starDisplay} · House ${pos.house}` : `${longitude.toFixed(2)}° Fixed Star`}
                    </title>
                  </g>
                );
              })}

            {layers.stars &&
              spreadKeyStars.map(({ item: s, labelAngle }) => {
                const p = pt(s.starLongitude, zodiacInnerR - 6);
                const lblPt = pt(labelAngle, rulerR - 12);
                const isAlgol = s.starName === "Algol";
                const active = selectedStar?.name === s.starName;
                return (
                  <g
                    key={`star-lbl-${s.starName}`}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedStar({ name: s.starName, longitude: s.starLongitude });
                      setSelectedPoint(null);
                      setSelectedHouse(null);
                      setSelectedLot(null);
                    }}
                  >
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={lblPt.x}
                      y2={lblPt.y}
                      stroke={isAlgol ? "#FB7185" : "#F5C451"}
                      strokeOpacity={active ? 0.85 : 0.35}
                      strokeWidth="0.7"
                    />
                    <text
                      x={lblPt.x}
                      y={lblPt.y}
                      fill={isAlgol ? "#FDA4AF" : active ? "#FEF08A" : "#FDE68A"}
                      fontSize="7"
                      fontWeight="700"
                      fontFamily="ui-monospace, monospace"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {s.starName.slice(0, 3).toUpperCase()}
                    </text>
                  </g>
                );
              })}

            {/* HERMETIC ARABIC LOTS LAYER (Standalone Natal Diamonds) */}
            {layers.lots &&
              starsAndLots.lotsAvailable &&
              spreadLots.map(({ item: lot, labelAngle }) => {
                const lotTrackR = 249;
                const lotLblTrackR = 231;
                const orbPt = pt(lot.longitude, lotTrackR);
                const lblPt = pt(labelAngle, lotLblTrackR);
                const active = selectedLot?.meta.id === lot.meta.id;
                const code = lot.meta.id === "nemesis" ? "NM" : lot.meta.shortName.slice(0, 2).toUpperCase();
                return (
                  <g
                    key={`lot-${lot.meta.id}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect ${lot.meta.name}`}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedLot(lot);
                      setSelectedStar(null);
                      setSelectedPoint(null);
                      setSelectedHouse(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedLot(lot);
                        setSelectedStar(null);
                        setSelectedPoint(null);
                        setSelectedHouse(null);
                      }
                    }}
                  >
                    <line
                      x1={orbPt.x}
                      y1={orbPt.y}
                      x2={lblPt.x}
                      y2={lblPt.y}
                      stroke="#E5C16C"
                      strokeOpacity={active ? 0.9 : 0.4}
                      strokeWidth="0.8"
                    />
                    <rect
                      x="-4.5"
                      y="-4.5"
                      width="9"
                      height="9"
                      transform={`translate(${orbPt.x}, ${orbPt.y}) rotate(45)`}
                      fill={active ? "#FEF08A" : "#D9B66F"}
                      stroke="#040711"
                      strokeWidth="1.2"
                      filter={active ? "url(#wheelGlow)" : undefined}
                    />
                    <text
                      x={lblPt.x}
                      y={lblPt.y}
                      fill={active ? "#FEF08A" : "#F3D79B"}
                      fontSize="7.4"
                      fontWeight="700"
                      fontFamily="ui-monospace, monospace"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {code}
                    </text>
                    <title>
                      {lot.meta.name} · {lot.display} (House {lot.house})
                    </title>
                  </g>
                );
              })}

            {/* INNER ASPECT APERTURE: Luminous Transit-to-Natal or Natal-to-Natal Geometry */}
            {layers.aspects &&
              layers.natal &&
              layers.transits &&
              transitAspects.map(({ transit, natal, contact }, index) => {
                const a = pt(natal.longitude, aspectApertureR);
                const b = pt(transit.longitude, aspectApertureR);
                const style = ASPECT_STYLES[contact.aspect];
                const isConnected =
                  highlightedBodyKey === `transit:${transit.name}` ||
                  highlightedBodyKey === `natal:${natal.name}`;
                const dimmed = Boolean(highlightedBodyKey && !isConnected);
                const strokeOpacity = isConnected ? 0.96 : dimmed ? 0.12 : style.isMajor ? 0.72 : 0.42;

                return (
                  <g
                    key={`t-aspect-${transit.name}-${natal.name}-${index}`}
                      onClick={() => {
                        setSelectedPoint({ kind: "transit", row: transit });
                        setSelectedHouse(null);
                        setSelectedStar(null);
                        setSelectedLot(null);
                      }}
                      className="cursor-pointer"
                    >
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={style.color}
                        strokeOpacity={strokeOpacity}
                        strokeWidth={isConnected ? 2.2 : style.isMajor ? 1.4 : 1.0}
                        strokeDasharray={style.dash}
                        filter={isConnected ? "url(#softChordGlow)" : undefined}
                      />
                      <title>
                        Transit {transit.name} {contact.aspect} Natal {natal.name} ({contact.orb.toFixed(2)}° orb)
                      </title>
                    </g>
                  );
                })}

              {layers.aspects &&
                layers.natal &&
                !layers.transits &&
                natalInternalAspects.map(({ a: rowA, b: rowB, aspect, orb }, index) => {
                  const pA = pt(rowA.longitude, aspectApertureR);
                  const pB = pt(rowB.longitude, aspectApertureR);
                  const style = ASPECT_STYLES[aspect];
                  const isConnected =
                    highlightedBodyKey === `natal:${rowA.name}` ||
                    highlightedBodyKey === `natal:${rowB.name}`;
                  const dimmed = Boolean(highlightedBodyKey && !isConnected);
                  return (
                    <g
                      key={`n-aspect-${rowA.name}-${rowB.name}-${index}`}
                      onClick={() => {
                        setSelectedPoint({ kind: "natal", row: rowA });
                        setSelectedHouse(null);
                        setSelectedStar(null);
                        setSelectedLot(null);
                      }}
                      className="cursor-pointer"
                    >
                      <line
                        x1={pA.x}
                        y1={pA.y}
                        x2={pB.x}
                        y2={pB.y}
                        stroke={style.color}
                        strokeOpacity={isConnected ? 0.96 : dimmed ? 0.14 : 0.72}
                        strokeWidth={isConnected ? 2.2 : 1.4}
                        strokeDasharray={style.dash}
                        filter={isConnected ? "url(#softChordGlow)" : undefined}
                      />
                      <title>
                        Natal {rowA.name} {aspect} Natal {rowB.name} ({orb.toFixed(2)}° orb)
                      </title>
                    </g>
                  );
                })}

              {/* NATAL PLANETS: Exact Marker Orb + Anti-Collision Elbow Label Medallion */}
              {layers.natal &&
                spreadNatal.map(({ item: row, labelAngle }) => {
                  const orbPt = pt(row.longitude, natalOrbR);
                  const anchorPt = pt(row.longitude, aspectApertureR);
                  const labelPt = pt(labelAngle, natalLabelR);
                  const color = PLANET_COLORS[row.name] ?? "#E5C16C";
                  const active =
                    (selectedPoint?.row.name === row.name && selectedPoint.kind === "natal") ||
                    hoveredBody === `natal:${row.name}`;
                  const degInSign = Math.floor(normalize(row.longitude) % 30);

                  return (
                    <g
                      key={`natal-${row.name}`}
                      onMouseEnter={() => setHoveredBody(`natal:${row.name}`)}
                      onMouseLeave={() => setHoveredBody(null)}
                      onClick={() => {
                        setSelectedPoint({ kind: "natal", row });
                        setSelectedHouse(null);
                        setSelectedStar(null);
                        setSelectedLot(null);
                      }}
                    className="cursor-pointer"
                  >
                    {/* Subtle projection ray down to aperture */}
                    <line
                      x1={anchorPt.x}
                      y1={anchorPt.y}
                      x2={orbPt.x}
                      y2={orbPt.y}
                      stroke={color}
                      strokeOpacity={active ? 0.65 : 0.18}
                      strokeWidth={active ? 1.2 : 0.8}
                    />
                    {/* Leader line from exact orb to non-overlapping label */}
                    {layers.labels && (
                      <line
                        x1={orbPt.x}
                        y1={orbPt.y}
                        x2={labelPt.x}
                        y2={labelPt.y}
                        stroke={color}
                        strokeOpacity={active ? 0.85 : 0.45}
                        strokeWidth="1"
                      />
                    )}
                    {/* True Degree Planet Orb */}
                    {active && (
                      <circle
                        cx={orbPt.x}
                        cy={orbPt.y}
                        r="11.5"
                        fill="none"
                        stroke={color}
                        strokeOpacity="0.65"
                        strokeWidth="1.2"
                      />
                    )}
                    <circle
                      cx={orbPt.x}
                      cy={orbPt.y}
                      r={active ? 7.5 : 5.5}
                      fill={color}
                      stroke="#040711"
                      strokeWidth="1.8"
                      filter={active ? "url(#wheelGlow)" : undefined}
                    />

                    {/* Crisp Non-Overlapping Medallion Badge */}
                    {layers.labels && (
                      <g transform={`translate(${labelPt.x}, ${labelPt.y})`}>
                        <rect
                          x="-17"
                          y="-10.5"
                          width="34"
                          height="21"
                          rx="6"
                          fill={active ? "#152347" : "#081024"}
                          stroke={active ? color : "rgba(255,255,255,0.22)"}
                          strokeWidth={active ? "1.3" : "0.8"}
                        />
                        <g transform="translate(-8.5, 0) scale(0.82)">
                          <PlanetVectorGlyph name={row.name} color={color} />
                        </g>
                        <text
                          x="8.5"
                          y="0.5"
                          fill="#E2E8F0"
                          fontSize="8.2"
                          fontWeight="700"
                          fontFamily="ui-monospace, monospace"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {degInSign}°
                        </text>
                      </g>
                    )}
                    <title>Natal {row.name} · {row.display} (House {row.house})</title>
                  </g>
                );
              })}

            {/* LIVE TRANSIT PLANETS: Cyan Ring Orbs + Anti-Collision Badges */}
            {layers.transits &&
              spreadTransits.map(({ item: row, labelAngle }) => {
                const orbPt = pt(row.longitude, transitOrbR);
                const labelPt = pt(labelAngle, transitLabelR);
                const color = PLANET_COLORS[row.name] ?? "#38BDF8";
                const active =
                  (selectedPoint?.row.name === row.name && selectedPoint.kind === "transit") ||
                  hoveredBody === `transit:${row.name}`;
                const degInSign = Math.floor(normalize(row.longitude) % 30);

                return (
                  <g
                    key={`transit-${row.name}`}
                    onMouseEnter={() => setHoveredBody(`transit:${row.name}`)}
                    onMouseLeave={() => setHoveredBody(null)}
                    onClick={() => {
                      setSelectedPoint({ kind: "transit", row });
                      setSelectedHouse(null);
                      setSelectedStar(null);
                      setSelectedLot(null);
                    }}
                    className="cursor-pointer"
                  >
                    {layers.labels && (
                      <line
                        x1={orbPt.x}
                        y1={orbPt.y}
                        x2={labelPt.x}
                        y2={labelPt.y}
                        stroke="#38BDF8"
                        strokeOpacity={active ? 0.85 : 0.4}
                        strokeWidth="0.9"
                      />
                    )}
                    <circle
                      cx={orbPt.x}
                      cy={orbPt.y}
                      r={active ? 6.8 : 4.8}
                      fill="#040711"
                      stroke={color}
                      strokeWidth="2.2"
                      filter={active ? "url(#wheelGlow)" : undefined}
                    />
                    {layers.labels && (
                      <g transform={`translate(${labelPt.x}, ${labelPt.y})`}>
                        <rect
                          x="-15"
                          y="-9"
                          width="30"
                          height="18"
                          rx="5"
                          fill={active ? "#0E2A47" : "#071529"}
                          stroke={active ? "#38BDF8" : "rgba(56,189,248,0.38)"}
                          strokeWidth="0.85"
                        />
                        <text
                          x="0"
                          y="0.5"
                          fill="#BAE6FD"
                          fontSize="7.6"
                          fontWeight="700"
                          fontFamily="ui-monospace, monospace"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {shortName(row.name)} {degInSign}°
                        </text>
                      </g>
                    )}
                    <title>Transit {row.name} · {row.display}</title>
                  </g>
                );
              })}

            {/* Cardinal Crosshair + Central Observatory Hub */}
            <line
              x1={center - aspectApertureR}
              y1={center}
              x2={center + aspectApertureR}
              y2={center}
              stroke="rgba(229,193,108,0.22)"
              strokeWidth="0.8"
            />
            <line
              x1={center}
              y1={center - aspectApertureR}
              x2={center}
              y2={center + aspectApertureR}
              stroke="rgba(229,193,108,0.22)"
              strokeWidth="0.8"
            />

            <text
              x={center}
              y={center - 8}
              fill="#F8FAFC"
              fontSize="12.5"
              fontWeight="700"
              letterSpacing="0.06em"
              textAnchor="middle"
              fontFamily="Playfair Display, Georgia, serif"
            >
              THE ABSOLUTE
            </text>
            <text
              x={center}
              y={center + 9}
              fill="#94A3B8"
              fontSize="7.8"
              letterSpacing="0.16em"
              fontFamily="ui-monospace, monospace"
              textAnchor="middle"
            >
              {chart.worldview === "god" ? "GOD FRAME" : "AGENT FRAME"}
            </text>
          </svg>
        </div>

        {/* Selected Focus Inspector Panel */}
        <aside className="rounded-2xl border border-cyan-300/20 bg-[#0A1124]/95 p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
              Selected Focus
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedHouse(null);
                setSelectedPoint(null);
                setSelectedStar(null);
                setSelectedLot(null);
              }}
              className="text-[11px] font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Reset
            </button>
          </div>

          <h3 className="font-serif text-2xl font-bold text-white">{focusTitle}</h3>
          {!selectedPoint && (
            <p className="mt-2 text-xs leading-6 text-slate-300">{focusDescription}</p>
          )}

          {selectedHouse && activeHouse !== undefined && (
            <div className="mt-4 space-y-2">
              <DetailRow label="House Cusp" value={activeHouse ? `${activeHouse.toFixed(2)}°` : "—"} />
              <DetailRow label="Placements" value={`${activeRows.length}`} />
              <div className="space-y-1.5 pt-2">
                {activeRows.map((row) => (
                  <button
                    type="button"
                    key={row.name}
                    onClick={() => setSelectedPoint({ kind: "natal", row })}
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left text-xs text-slate-200 hover:border-cyan-300/40 hover:text-white cursor-pointer"
                  >
                    <span className="font-semibold">{row.name}</span>
                    <span className="font-mono text-cyan-200">{row.display}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedPoint && (
            <div className="mt-4 space-y-2">
              <DetailRow label="Position" value={selectedPoint.row.display} />
              <DetailRow label="House" value={`House ${selectedPoint.row.house}`} />
              <DetailRow
                label="Layer"
                value={selectedPoint.kind === "transit" ? "Live Transit" : "Natal Anchor"}
              />
              {selectedPoint.kind === "transit" && (
                <div className="mt-3 space-y-2 pt-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E5C16C]">
                    Natal Contacts
                  </div>
                  {[
                    ...((selectedPoint.row as ChartResult["transits"][number]).natalContacts ?? []),
                    ...((selectedPoint.row as ChartResult["transits"][number]).minorNatalContacts ?? []),
                  ].length ? (
                    [
                      ...((selectedPoint.row as ChartResult["transits"][number]).natalContacts ?? []),
                      ...((selectedPoint.row as ChartResult["transits"][number]).minorNatalContacts ?? []),
                    ].map((contact, index) => (
                      <div
                        key={`${contact.natalName}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200"
                      >
                        <span>
                          <span className="font-semibold text-white">{contact.aspect}</span>{" "}
                          {contact.natalName}
                        </span>
                        <span className="font-mono text-slate-400">{contact.orb.toFixed(1)}°</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400">No natal contact within 5°.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedPoint && (
            <div className="mt-4">
              <PlacementMiniReading chart={chart} name={selectedPoint.row.name} layer={selectedPoint.kind} />
            </div>
          )}
          {selectedStarPosition && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
              <DetailRow label="Position" value={selectedStarPosition.starDisplay} />
              <DetailRow label="Natal House" value={`House ${selectedStarPosition.house}`} />
              <DetailRow label="Planetary Nature" value={selectedStarPosition.nature} />
              <p className="text-xs leading-6 text-slate-200">
                {selectedStarPosition.personalHouseReading}
              </p>
              <div className="rounded-xl border border-rose-400/25 bg-rose-950/20 p-3 text-xs leading-relaxed text-rose-200">
                <strong className="font-semibold text-rose-300">
                  {selectedStarPosition.starName === "Algol" ? "Sabotage / Pressure Risk: " : "Watch Out For: "}
                </strong>
                {selectedStarPosition.sabotageOrShadowRisk}
              </div>
            </div>
          )}
          {selectedStar && (
            <div className="mt-4">
              <FocusedPlacementReading chart={chart} name={selectedStar.name} kind="star" />
            </div>
          )}
          {selectedLot && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
              <DetailRow label="Position" value={selectedLot.display} />
              <DetailRow label="Natal House" value={`House ${selectedLot.house}`} />
              <DetailRow label="Ruler Planet" value={selectedLot.meta.rulerPlanet} />
              <DetailRow
                label={`${selectedLot.sect === "day" ? "Day" : "Night"} Formula`}
                value={selectedLot.formulaUsed}
              />
              <p className="text-xs leading-6 text-slate-200">
                {selectedLot.personalPlacementReading}
              </p>
              {selectedLot.natalStarContacts.length > 0 && (
                <p className="text-[11px] text-[#F3D79B]">
                  Aligned Fixed Stars:{" "}
                  {selectedLot.natalStarContacts
                    .map((s) => `${s.starName} (${s.orbDeg.toFixed(1)}°)`)
                    .join(", ")}
                </p>
              )}
              {selectedLot.liveTransits.length > 0 && (
                <div className="rounded-xl border border-cyan-400/25 bg-cyan-950/25 p-3 text-xs text-cyan-200">
                  <strong>Active Today:</strong> {selectedLot.liveTransits[0].realLifeTakeaway}
                </div>
              )}
            </div>
          )}

          {/* Compact Aspect Key */}
          <div className="mt-5 border-t border-white/10 pt-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Aspect Line Legend
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <i className="h-0.5 w-3 bg-[#F5C451]" /> Conjunction
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-0.5 w-3 bg-[#2DD4BF]" /> Trine
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-0.5 w-3 bg-[#38BDF8]" /> Sextile
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-0.5 w-3 border-t border-dashed border-[#FB7185]" /> Square / Opp
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Angles Telemetry Strip */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 font-mono text-[11px] text-slate-300 tabular-nums sm:grid-cols-4">
        <span>{chart.ascendant ? `ASC ${chart.ascendant.display}` : "ASC · God View"}</span>
        <span>{chart.descendant ? `DSC ${chart.descendant.display}` : "DSC · Unavailable"}</span>
        <span>NN {chart.northNode.display}</span>
        <span>SN {chart.southNode.display}</span>
      </div>
    </div>
  );
}
