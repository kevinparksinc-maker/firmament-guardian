import { useMemo, useState, useRef } from "react";
import {
  Compass,
  Eye,
  Layers3,
  Orbit,
  Sparkles,
  Star,
  ChevronDown,
  BookOpen,
  Globe,
  Radio,
  Sliders,
  Download,
  Maximize2,
  Minimize2,
  Zap,
  Info,
} from "lucide-react";
import type { ChartResult, ChartRow } from "../../../server/astronomy";
import { FIXED_STARS, formatLongitude, normalizeLongitude, ZODIAC_SIGNS } from "../../../shared/hybrid";
import { toast } from "sonner";
import "./ChartObservatory2050.css";

type Frame = "god" | "agent";
type Layer = "nakshatra" | "manzil" | "decan" | "stars";
type Projection = "planisphere" | "wheel" | "diamond" | "dome";

const SYMBOLS: Record<string, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
  "North Node": "☊",
  "South Node": "☋",
  Ascendant: "AC",
  Midheaven: "MC",
};

const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

// Major prominent fixed stars with catalog coordinates & magnitude
const STAR_CATALOG: Array<{
  name: string;
  lon: number;
  mag: number;
  constellation: string;
  meaning: string;
}> = [
  { name: "Sirius", lon: 79.35, mag: -1.46, constellation: "Canis Major", meaning: "The Scorcher · Archetype of brilliance, devotion, and high leadership" },
  { name: "Rigel", lon: 52.1, mag: 0.18, constellation: "Orion", meaning: "The Left Foot · Technical skill, invention, and mechanical genius" },
  { name: "Betelgeuse", lon: 88.8, mag: 0.45, constellation: "Orion", meaning: "Armpit of the Giant · Martial power, military authority, and renown" },
  { name: "Aldebaran", lon: 45.0, mag: 0.85, constellation: "Taurus", meaning: "Royal Star of the East · Eloquence, steadfast integrity, high principles" },
  { name: "Regulus", lon: 135.0, mag: 1.36, constellation: "Leo", meaning: "Royal Star of the North · Sovereign dignity, royal bearing, magnanimity" },
  { name: "Spica", lon: 179.1, mag: 0.98, constellation: "Virgo", meaning: "The Wheat Ear · Refined craft, artistic elegance, and auspicious harvest" },
  { name: "Antares", lon: 225.02, mag: 1.06, constellation: "Scorpius", meaning: "Royal Star of the West · Fierce courage, transformative will, depth" },
  { name: "Vega", lon: 285.3, mag: 0.03, constellation: "Lyra", meaning: "The Swooping Eagle · Musical genius, artistic charisma, and idealism" },
  { name: "Altair", lon: 301.8, mag: 0.77, constellation: "Aquila", meaning: "The Flying Eagle · Bold ambition, adventurous instinct, and piercing vision" },
  { name: "Deneb", lon: 335.5, mag: 1.25, constellation: "Cygnus", meaning: "The Tail of the Swan · Swift learning, intellectual ascent, and idealism" },
  { name: "Fomalhaut", lon: 315.0, mag: 1.17, constellation: "Piscis Austrinus", meaning: "Royal Star of the South · Mystical insight, dreams, and poetic inspiration" },
  { name: "Polaris", lon: 63.83, mag: 1.98, constellation: "Ursa Minor", meaning: "The Pole Star · Unwavering navigation, cosmic compass, constancy" },
  { name: "Algol", lon: 31.43, mag: 2.12, constellation: "Perseus", meaning: "The Demon Star · Primal creative passion, fierce protection, transformation" },
  { name: "Hamal", lon: 12.93, mag: 2.01, constellation: "Aries", meaning: "The Ram's Head · Pioneer impulse, decisive breakthrough, independence" },
  { name: "Arcturus", lon: 204.2, mag: -0.05, constellation: "Boötes", meaning: "The Guardian · Protection, exploration, and navigational guardianship" },
];

// Major constellation wireframe lines in ecliptic polar coords
const CONSTELLATIONS = [
  // Orion
  { name: "Orion", lines: [[52.1, 220, 88.8, 235], [52.1, 220, 79.35, 200]] },
  // Summer Triangle
  { name: "Summer Triangle", lines: [[285.3, 170, 301.8, 190], [301.8, 190, 335.5, 175], [335.5, 175, 285.3, 170]] },
  // Royal Stars Quadrangle
  { name: "Royal Cross", lines: [[45.0, 210, 135.0, 210], [135.0, 210, 225.02, 210], [225.02, 210, 315.0, 210], [315.0, 210, 45.0, 210]] },
];

function starDistance(a: number, b: number) {
  const diff = Math.abs(normalizeLongitude(a) - normalizeLongitude(b));
  return Math.min(diff, 360 - diff);
}

// Polar coordinate mapping
const point = (lon: number, r: number, cx = 300, cy = 300) => {
  const a = ((lon - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
};

// Diamond coordinate mapping
const diamondPoint = (lon: number, r: number, cx = 300, cy = 300) => {
  const a = ((lon - 90) * Math.PI) / 180;
  const x = Math.cos(a);
  const y = Math.sin(a);
  const d = Math.abs(x) + Math.abs(y) || 1;
  return { x: cx + (x * r) / d, y: cy + (y * r) / d };
};

export function ChartObservatory2050({ chart }: { chart: ChartResult }) {
  const [frame, setFrame] = useState<Frame>(
    chart.worldview === "god" ? "god" : chart.agentViewAvailable ? "agent" : "god"
  );
  const [projection, setProjection] = useState<Projection>("planisphere");
  const [layer, setLayer] = useState<Layer>("nakshatra");
  const [selectedBody, setSelectedBody] = useState<string>("Sun");
  const [selectedStar, setSelectedStar] = useState<string | null>(null);

  // Flashy layer controls
  const [showAspects, setShowAspects] = useState(true);
  const [showStars, setShowStars] = useState(true);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showMansions, setShowMansions] = useState(false);
  const [timeDriftHours, setTimeDriftHours] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  const canAgent = chart.agentViewAvailable;

  // Base rows + time drift simulation (if scrubbed)
  const rows = useMemo(() => {
    return chart.movingBodies.map(body => {
      if (timeDriftHours === 0) return body;
      const speedPerHour = (body.speed ?? 0.985) / 24;
      const adjustedLon = normalizeLongitude(body.longitude + speedPerHour * timeDriftHours);
      return {
        ...body,
        longitude: adjustedLon,
        display: formatLongitude(adjustedLon),
      };
    });
  }, [chart.movingBodies, timeDriftHours]);

  const selectedRow = rows.find(r => r.name === selectedBody) ?? rows[0];

  // Nearest fixed star to selected body
  const nearestStar = useMemo(() => {
    if (!selectedRow) return undefined;
    return STAR_CATALOG.map(s => ({
      ...s,
      separation: starDistance(selectedRow.longitude, s.lon),
    })).sort((a, b) => a.separation - b.separation)[0];
  }, [selectedRow]);

  // Major geometric aspect connections between moving bodies
  const aspectChords = useMemo(() => {
    const chords: Array<{
      p1: ChartRow;
      p2: ChartRow;
      type: "conjunction" | "trine" | "sextile" | "square" | "opposition";
      orb: number;
      color: string;
      strokeWidth: number;
      strokeDash?: string;
    }> = [];

    const activeBodies = rows.slice(0, 10); // Main 10 planets
    for (let i = 0; i < activeBodies.length; i++) {
      for (let j = i + 1; j < activeBodies.length; j++) {
        const b1 = activeBodies[i];
        const b2 = activeBodies[j];
        const dist = starDistance(b1.longitude, b2.longitude);

        if (dist <= 7) {
          chords.push({ p1: b1, p2: b2, type: "conjunction", orb: dist, color: "#facc15", strokeWidth: 2.2 });
        } else if (Math.abs(dist - 120) <= 7) {
          chords.push({ p1: b1, p2: b2, type: "trine", orb: Math.abs(dist - 120), color: "#38bdf8", strokeWidth: 1.8 });
        } else if (Math.abs(dist - 60) <= 6) {
          chords.push({ p1: b1, p2: b2, type: "sextile", orb: Math.abs(dist - 60), color: "#c084fc", strokeWidth: 1.4, strokeDash: "4 3" });
        } else if (Math.abs(dist - 90) <= 6) {
          chords.push({ p1: b1, p2: b2, type: "square", orb: Math.abs(dist - 90), color: "#fb923c", strokeWidth: 1.5 });
        } else if (Math.abs(dist - 180) <= 7) {
          chords.push({ p1: b1, p2: b2, type: "opposition", orb: Math.abs(dist - 180), color: "#fb7185", strokeWidth: 1.8 });
        }
      }
    }
    return chords;
  }, [rows]);

  // Aspects involving the currently selected body
  const selectedBodyAspects = useMemo(() => {
    if (!selectedRow) return [];
    return aspectChords.filter(c => c.p1.name === selectedRow.name || c.p2.name === selectedRow.name);
  }, [selectedRow, aspectChords]);

  const activeHouseName = (row: ChartRow) => {
    const house =
      frame === "god"
        ? row.godHouse ?? Math.floor(normalizeLongitude(row.longitude) / 30) + 1
        : row.agentHouse;
    return house ? `House ${house}` : "Not available";
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    try {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = `celestial-chart-map-${chart.utc.slice(0, 10)}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success("High-Resolution SVG Chart Map exported successfully");
    } catch {
      toast.error("Failed to export chart snapshot");
    }
  };

  const ascLongitude = frame === "god" ? 0 : chart.ascendant?.longitude ?? 0;

  return (
    <section className="cg2050" aria-labelledby="cg2050-title">
      {/* Header bar */}
      <header className="cg2050-header">
        <div>
          <p className="cg2050-eyebrow">
            <Orbit size={16} /> DIVINE OBSERVATORY · HIGH-CLASS MAP CHART
          </p>
          <h2 id="cg2050-title">
            The Firmament <em>Sky Map & Wheel</em>
          </h2>
          <p>
            An astronomical planisphere and multi-projection divine map chart. Grounded in precise Swiss Ephemeris coordinates with live geometric aspect chords, prominent stellar beacons, and dual God/Agent reference frames.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="cg2050-trust">
            <i /> {chart.movingBodies.length} BODIES · PRECISION OBSERVER
          </span>
          <button
            type="button"
            onClick={handleExportSVG}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
            title="Download Vector SVG Map"
          >
            <Download size={13} />
            <span>Export SVG Map</span>
          </button>
        </div>
      </header>

      {/* Main Body Grid */}
      <div className="cg2050-body">
        {/* Left Visual Column */}
        <div className="cg2050-visual">
          {/* Controls: Projections & Frame */}
          <div className="cg2050-toolbar-row">
            {/* Projection selector */}
            <div className="cg2050-projections" role="group" aria-label="Divine map projection">
              <button
                type="button"
                aria-pressed={projection === "planisphere"}
                onClick={() => setProjection("planisphere")}
              >
                <Globe size={14} />
                <span>Planisphere Map</span>
              </button>
              <button
                type="button"
                aria-pressed={projection === "wheel"}
                onClick={() => setProjection("wheel")}
              >
                <Orbit size={14} />
                <span>Observatory Wheel</span>
              </button>
              <button
                type="button"
                aria-pressed={projection === "diamond"}
                onClick={() => setProjection("diamond")}
              >
                <span>◇ Diamond Chakra</span>
              </button>
              <button
                type="button"
                aria-pressed={projection === "dome"}
                onClick={() => setProjection("dome")}
              >
                <Radio size={14} />
                <span>3D Horizon Dome</span>
              </button>
            </div>

            {/* Frame Switcher */}
            <div className="cg2050-frame-switch" role="group" aria-label="Reference Frame">
              <button
                type="button"
                aria-pressed={frame === "god"}
                onClick={() => setFrame("god")}
                title="Fixed 0° Aries anchor"
              >
                <Eye size={14} />
                <span>God View</span>
              </button>
              <button
                type="button"
                disabled={!canAgent}
                aria-pressed={frame === "agent"}
                onClick={() => setFrame("agent")}
                title="Observer local Ascendant houses"
              >
                <Compass size={14} />
                <span>Agent View</span>
              </button>
            </div>
          </div>

          {/* Flashy Layer Toggles Strip */}
          <div className="cg2050-layers-strip">
            <span className="title">Layers:</span>
            <button
              type="button"
              className="cg2050-layer-btn"
              aria-pressed={showAspects}
              onClick={() => setShowAspects(v => !v)}
            >
              <Zap size={12} className={showAspects ? "text-cyan-300" : ""} />
              <span>Aspect Chords</span>
            </button>
            <button
              type="button"
              className="cg2050-layer-btn"
              aria-pressed={showStars}
              onClick={() => setShowStars(v => !v)}
            >
              <Star size={12} className={showStars ? "text-amber-300" : ""} />
              <span>Fixed Stars</span>
            </button>
            <button
              type="button"
              className="cg2050-layer-btn"
              aria-pressed={showConstellations}
              onClick={() => setShowConstellations(v => !v)}
            >
              <Sparkles size={12} className={showConstellations ? "text-violet-300" : ""} />
              <span>Constellations</span>
            </button>
            <button
              type="button"
              className="cg2050-layer-btn"
              aria-pressed={showMansions}
              onClick={() => setShowMansions(v => !v)}
            >
              <Layers3 size={12} className={showMansions ? "text-emerald-300" : ""} />
              <span>Mansions (27)</span>
            </button>
          </div>

          {/* THE SVG MAP STAGE */}
          <div className="cg2050-wheel">
            {/* PROJECTION 1: DIVINE PLANISPHERE SKY MAP */}
            {projection === "planisphere" && (
              <svg
                ref={svgRef}
                viewBox="0 0 600 600"
                role="img"
                aria-label={`Divine Planisphere Map displaying ${rows.length} planets and ${STAR_CATALOG.length} fixed stars`}
              >
                <defs>
                  {/* Space radial background */}
                  <radialGradient id="planiBg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0b1736" />
                    <stop offset="50%" stopColor="#070d24" />
                    <stop offset="85%" stopColor="#030612" />
                    <stop offset="100%" stopColor="#01030a" />
                  </radialGradient>

                  {/* Luminous Glow Filter */}
                  <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Planet Flare Glow */}
                  <filter id="planetHalo" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="5" result="glow" />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Ecliptic Gradient Ring */}
                  <linearGradient id="eclipticGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
                    <stop offset="50%" stopColor="#c084fc" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#facc15" stopOpacity="0.7" />
                  </linearGradient>
                </defs>

                {/* Outer Divine Sphere Disc */}
                <circle cx="300" cy="300" r="280" fill="url(#planiBg)" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="1.5" />
                <circle cx="300" cy="300" r="270" fill="none" stroke="#60a5fa" strokeOpacity="0.15" strokeDasharray="3 5" />
                <circle cx="300" cy="300" r="215" fill="none" stroke="url(#eclipticGrad)" strokeWidth="2.5" filter="url(#laserGlow)" />
                <circle cx="300" cy="300" r="145" fill="none" stroke="#94a3b8" strokeOpacity="0.18" strokeDasharray="2 4" />
                <circle cx="300" cy="300" r="75" fill="none" stroke="#94a3b8" strokeOpacity="0.12" />

                {/* Divine Axis Crosshairs */}
                <line x1="300" y1="20" x2="300" y2="580" stroke="#38bdf8" strokeOpacity="0.2" strokeWidth="1" />
                <line x1="20" y1="300" x2="580" y2="300" stroke="#38bdf8" strokeOpacity="0.2" strokeWidth="1" />

                {/* 12 Zodiac Gates Segments along the Ecliptic */}
                {Array.from({ length: 12 }, (_, i) => {
                  const deg = ascLongitude + i * 30;
                  const ptInner = point(deg, 195);
                  const ptOuter = point(deg, 275);
                  const glyphPt = point(deg + 15, 248);
                  const houseLabel = point(deg + 15, 175);

                  return (
                    <g key={`gate-${i}`}>
                      <line x1={ptInner.x} y1={ptInner.y} x2={ptOuter.x} y2={ptOuter.y} stroke="#38bdf8" strokeOpacity="0.25" strokeWidth="1" />
                      <text
                        x={glyphPt.x}
                        y={glyphPt.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="15"
                        fill="#f8fafc"
                        opacity="0.9"
                      >
                        {SIGN_GLYPHS[i]}
                      </text>
                      <text
                        x={houseLabel.x}
                        y={houseLabel.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="9"
                        fontFamily="'DM Mono', monospace"
                        fontWeight="bold"
                        fill={frame === "god" ? "#facc15" : "#38bdf8"}
                        opacity="0.8"
                      >
                        H{i + 1}
                      </text>
                    </g>
                  );
                })}

                {/* 27 Nakshatras Ring (if layer toggled) */}
                {showMansions &&
                  Array.from({ length: 27 }, (_, i) => {
                    const start = (i * 360) / 27;
                    const a = point(start, 260);
                    const b = point(start, 270);
                    return <line key={`nak-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#10b981" strokeOpacity="0.5" strokeWidth="1" />;
                  })}

                {/* Constellation Guide Wireframes */}
                {showConstellations &&
                  CONSTELLATIONS.map(c => (
                    <g key={c.name} opacity="0.35">
                      {c.lines.map(([l1, r1, l2, r2], idx) => {
                        const p1 = point(l1, r1);
                        const p2 = point(l2, r2);
                        return <line key={idx} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#818cf8" strokeWidth="1.2" strokeDasharray="3 3" />;
                      })}
                    </g>
                  ))}

                {/* Fixed Stars Starfield */}
                {showStars &&
                  STAR_CATALOG.map(star => {
                    const p = point(star.lon, 225 - star.mag * 8);
                    const isSelected = selectedStar === star.name;
                    const radius = Math.max(2, 5 - star.mag);

                    return (
                      <g
                        key={star.name}
                        onClick={() => setSelectedStar(isSelected ? null : star.name)}
                        style={{ cursor: "pointer" }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Fixed Star ${star.name}`}
                      >
                        {/* Shimmering Star Glow */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={radius * (isSelected ? 2.5 : 1.8)}
                          fill="#fef08a"
                          opacity={isSelected ? "0.6" : "0.2"}
                          filter="url(#laserGlow)"
                        />
                        <circle cx={p.x} cy={p.y} r={radius} fill="#ffffff" />
                        <text
                          x={p.x}
                          y={p.y - 8}
                          fontSize="8"
                          fontFamily="'DM Mono', monospace"
                          textAnchor="middle"
                          fill={isSelected ? "#ffe180" : "#cbd5e1"}
                          opacity={isSelected ? 1 : 0.65}
                        >
                          {star.name}
                        </text>
                      </g>
                    );
                  })}

                {/* Geometric Laser Aspect Chords Network */}
                {showAspects &&
                  aspectChords.map((chord, idx) => {
                    const p1 = point(chord.p1.longitude, 160);
                    const p2 = point(chord.p2.longitude, 160);
                    const isFocus = selectedRow && (chord.p1.name === selectedRow.name || chord.p2.name === selectedRow.name);
                    const opacity = selectedRow ? (isFocus ? 0.95 : 0.12) : 0.45;

                    return (
                      <line
                        key={`chord-${idx}`}
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={chord.color}
                        strokeWidth={isFocus ? chord.strokeWidth + 1 : chord.strokeWidth}
                        strokeDasharray={chord.strokeDash}
                        opacity={opacity}
                        filter={isFocus ? "url(#laserGlow)" : undefined}
                      />
                    );
                  })}

                {/* Planetary Bodies on the Map */}
                {rows.map((row, idx) => {
                  const p = point(row.longitude, 160 + (idx % 2 === 0 ? 0 : 25));
                  const isSelected = selectedRow?.name === row.name;

                  return (
                    <g
                      key={`body-${row.name}`}
                      onClick={() => {
                        setSelectedBody(row.name);
                        setSelectedStar(null);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Inspect ${row.name} at ${row.display}`}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Laser Orbit Track Segment */}
                      <circle cx="300" cy="300" r={160 + (idx % 2 === 0 ? 0 : 25)} fill="none" stroke="#38bdf8" strokeOpacity="0.04" />

                      {/* Halo on focus */}
                      {isSelected && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="22"
                          fill="rgba(56, 189, 248, 0.18)"
                          stroke="#53f4ff"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                          filter="url(#laserGlow)"
                        />
                      )}

                      {/* Body circle */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isSelected ? 14 : 11}
                        fill="#0b1736"
                        stroke={isSelected ? "#ffe180" : "#53f4ff"}
                        strokeWidth={isSelected ? 2.5 : 1.6}
                      />

                      {/* Symbol */}
                      <text
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={isSelected ? "14" : "12"}
                        fill="#ffffff"
                        fontWeight="bold"
                      >
                        {SYMBOLS[row.name] ?? "✦"}
                      </text>

                      {/* Retrograde symbol indicator */}
                      {row.retrograde && (
                        <text
                          x={p.x + 10}
                          y={p.y - 10}
                          fontSize="8"
                          fill="#fb7185"
                          fontWeight="bold"
                          fontFamily="'DM Mono', monospace"
                        >
                          Rx
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Divine Center Core Hub */}
                <circle cx="300" cy="300" r="32" fill="#04091a" stroke="#ffe180" strokeOpacity="0.6" strokeWidth="1.5" />
                <circle cx="300" cy="300" r="4" fill="#53f4ff" filter="url(#laserGlow)" />
                <text x="300" y="293" textAnchor="middle" fontSize="8" fill="#ffe180" letterSpacing="1.5" fontWeight="bold">
                  {frame === "god" ? "GOD AXIS" : "AGENT ASC"}
                </text>
                <text x="300" y="308" textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="'DM Mono', monospace">
                  000°00′
                </text>
              </svg>
            )}

            {/* PROJECTION 2: OBSERVATORY RADIAL WHEEL */}
            {projection === "wheel" && (
              <svg
                ref={svgRef}
                viewBox="0 0 600 600"
                role="img"
                aria-label={`Astrological Wheel displaying ${rows.length} calculated planets in ${frame} houses`}
              >
                <defs>
                  <radialGradient id="wheelCore">
                    <stop stopColor="#1a2b4c" offset="0%" />
                    <stop stopColor="#0a1226" offset="75%" />
                    <stop stopColor="#040816" offset="100%" />
                  </radialGradient>
                  <filter id="wheelGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <circle cx="300" cy="300" r="275" fill="url(#wheelCore)" stroke="#ffe180" strokeOpacity="0.5" strokeWidth="2" />
                <circle cx="300" cy="300" r="245" fill="none" stroke="#53f4ff" strokeOpacity="0.3" />
                <circle cx="300" cy="300" r="215" fill="none" stroke="#c084fc" strokeOpacity="0.35" />
                <circle cx="300" cy="300" r="165" fill="none" stroke="#53f4ff" strokeOpacity="0.25" strokeDasharray="3 5" />

                {/* 12 House Spokes */}
                {Array.from({ length: 12 }, (_, i) => {
                  const deg = ascLongitude + i * 30;
                  const a = point(deg, 120);
                  const b = point(deg, 275);
                  const labelPt = point(deg + 15, 142);
                  const glyphPt = point(i * 30 + 15, 230);

                  return (
                    <g key={`wh-${i}`}>
                      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#53f4ff" strokeOpacity="0.3" strokeWidth="1" />
                      <text x={labelPt.x} y={labelPt.y} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#facc15" fontWeight="bold">
                        {i + 1}
                      </text>
                      <text x={glyphPt.x} y={glyphPt.y} textAnchor="middle" dominantBaseline="central" fontSize="16" fill="#f8fafc">
                        {SIGN_GLYPHS[i]}
                      </text>
                    </g>
                  );
                })}

                {/* Aspect Chords in Wheel Center */}
                {showAspects &&
                  aspectChords.map((chord, idx) => {
                    const p1 = point(chord.p1.longitude, 120);
                    const p2 = point(chord.p2.longitude, 120);
                    const isFocus = selectedRow && (chord.p1.name === selectedRow.name || chord.p2.name === selectedRow.name);
                    const opacity = selectedRow ? (isFocus ? 0.95 : 0.1) : 0.4;
                    return (
                      <line
                        key={`w-chord-${idx}`}
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={chord.color}
                        strokeWidth={isFocus ? 2.5 : 1.2}
                        opacity={opacity}
                      />
                    );
                  })}

                {/* Planets on Wheel */}
                {rows.map(row => {
                  const p = point(row.longitude, 190);
                  const isSelected = selectedRow?.name === row.name;

                  return (
                    <g
                      key={`w-row-${row.name}`}
                      onClick={() => setSelectedBody(row.name)}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isSelected ? 13 : 10}
                        fill="#050d24"
                        stroke={isSelected ? "#ffe180" : "#53f4ff"}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      <text
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={isSelected ? "13" : "11"}
                        fill="#ffffff"
                      >
                        {SYMBOLS[row.name] ?? "✦"}
                      </text>
                    </g>
                  );
                })}

                <circle cx="300" cy="300" r="45" fill="#03081a" stroke="#ffe180" strokeOpacity="0.4" />
                <text x="300" y="295" textAnchor="middle" fontSize="11" fill="#ffe180" letterSpacing="2" fontWeight="bold">
                  {frame === "god" ? "GOD VIEW" : "AGENT VIEW"}
                </text>
                <text x="300" y="312" textAnchor="middle" fontSize="9" fill="#94a3b8">
                  360° WHEEL
                </text>
              </svg>
            )}

            {/* PROJECTION 3: SACRED VEDIC CHAKRA DIAMOND */}
            {projection === "diamond" && (
              <svg
                ref={svgRef}
                viewBox="0 0 600 600"
                role="img"
                aria-label={`Diamond chart displaying ${rows.length} calculated planets`}
              >
                <defs>
                  <radialGradient id="diaBg">
                    <stop offset="0%" stopColor="#1a2550" />
                    <stop offset="100%" stopColor="#050918" />
                  </radialGradient>
                </defs>

                {/* Outer Diamond Bevel */}
                <path d="M300 25 L575 300 L300 575 L25 300 Z" fill="url(#diaBg)" stroke="#53f4ff" strokeWidth="3" />

                {/* Nested Diamond Lines */}
                {[220, 155, 95].map(r => (
                  <path
                    key={r}
                    d={`M300 ${300 - r} L${300 + r} 300 L300 ${300 + r} L${300 - r} 300 Z`}
                    fill="none"
                    stroke={r === 155 ? "#c084fc" : "#ffe180"}
                    strokeOpacity="0.65"
                    strokeWidth="1.5"
                  />
                ))}

                {/* Diagonal Crosshair Cuts */}
                <line x1="25" y1="300" x2="575" y2="300" stroke="#53f4ff" strokeOpacity="0.35" strokeWidth="1.5" />
                <line x1="300" y1="25" x2="300" y2="575" stroke="#53f4ff" strokeOpacity="0.35" strokeWidth="1.5" />

                {/* 12 House Sectors */}
                {Array.from({ length: 12 }, (_, i) => {
                  const deg = ascLongitude + i * 30;
                  const label = diamondPoint(deg + 15, 125);
                  const glyph = diamondPoint(i * 30 + 15, 245);

                  return (
                    <g key={`dia-h-${i}`}>
                      <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central" fill="#facc15" fontSize="14" fontWeight="bold">
                        {i + 1}
                      </text>
                      <text x={glyph.x} y={glyph.y} textAnchor="middle" dominantBaseline="central" fill="#c084fc" fontSize="16">
                        {SIGN_GLYPHS[i]}
                      </text>
                    </g>
                  );
                })}

                {/* Planetary Nodes in Diamond */}
                {rows.map(row => {
                  const q = diamondPoint(row.longitude, 190);
                  const isSelected = selectedRow?.name === row.name;

                  return (
                    <g
                      key={`dia-p-${row.name}`}
                      onClick={() => setSelectedBody(row.name)}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={q.x}
                        cy={q.y}
                        r={isSelected ? 14 : 11}
                        fill="#070e24"
                        stroke={isSelected ? "#ffe180" : "#53f4ff"}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      <text
                        x={q.x}
                        y={q.y}
                        fontSize={isSelected ? "14" : "12"}
                        fill="#ffffff"
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {SYMBOLS[row.name] ?? "✦"}
                      </text>
                    </g>
                  );
                })}

                <text x="300" y="290" textAnchor="middle" fontSize="13" fill="#ffe180" letterSpacing="2" fontWeight="bold">
                  12 GATES
                </text>
                <text x="300" y="315" textAnchor="middle" fontSize="16" fill="#f8fafc" fontFamily="'Playfair Display', Georgia, serif">
                  {frame === "god" ? "GOD VIEW" : "AGENT VIEW"}
                </text>
              </svg>
            )}

            {/* PROJECTION 4: 3D HEMISPHERIC HORIZON DOME */}
            {projection === "dome" && (
              <svg
                ref={svgRef}
                viewBox="0 0 600 500"
                role="img"
                aria-label={`3D Divine Dome displaying ${rows.length} calculated planets`}
              >
                <defs>
                  <radialGradient id="domeSkyGrad" cx="50%" cy="85%" r="90%">
                    <stop offset="0%" stopColor="#155e75" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#1e1b4b" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#030712" />
                  </radialGradient>
                  <linearGradient id="domeRimGrad">
                    <stop offset="0%" stopColor="#53f4ff" />
                    <stop offset="50%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#ffe180" />
                  </linearGradient>
                </defs>

                {/* Dome curved canopy */}
                <path d="M40 300 A260 260 0 0 1 560 300 L560 300 A260 115 0 0 1 40 300 Z" fill="url(#domeSkyGrad)" stroke="#38bdf8" strokeWidth="1.6" />

                {/* Altitude parallel bands */}
                {Array.from({ length: 4 }, (_, i) => {
                  const y = 300 - (i + 1) * 55;
                  const half = Math.sqrt(Math.max(0, 260 * 260 - (y - 300) * (y - 300)));
                  return (
                    <path
                      key={i}
                      d={`M${300 - half} ${y} Q300 ${y + 55} ${300 + half} ${y}`}
                      fill="none"
                      stroke="#38bdf8"
                      strokeOpacity="0.25"
                      strokeDasharray="3 3"
                    />
                  );
                })}

                {/* Zenith Spoke Arcs */}
                {Array.from({ length: 12 }, (_, i) => {
                  const angle = ((i * 30 - 90) * Math.PI) / 180;
                  const endX = 300 + 260 * Math.cos(angle);
                  const endY = 300 + 115 * Math.sin(angle);
                  return (
                    <path
                      key={`zen-${i}`}
                      d={`M300 40 Q${300 + (endX - 300) * 0.65} ${150 + (endY - 300) * 0.15} ${endX} ${endY}`}
                      fill="none"
                      stroke="#818cf8"
                      strokeOpacity="0.2"
                    />
                  );
                })}

                {/* Horizon Ellipse Rim */}
                <ellipse cx="300" cy="300" rx="260" ry="115" fill="none" stroke="url(#domeRimGrad)" strokeWidth="3" />

                {/* Zenith Title */}
                <circle cx="300" cy="40" r="4" fill="#ffe180" />
                <text x="300" y="32" textAnchor="middle" fill="#ffe180" fontSize="12" letterSpacing="3" fontWeight="bold">
                  ZENITH
                </text>

                {/* Cardinal Points */}
                <text x="300" y="440" textAnchor="middle" fill="#53f4ff" fontSize="12" fontWeight="bold">
                  SOUTH (HORIZON)
                </text>
                <text x="575" y="305" textAnchor="start" fill="#53f4ff" fontSize="12" fontWeight="bold">
                  WEST
                </text>
                <text x="25" y="305" textAnchor="end" fill="#53f4ff" fontSize="12" fontWeight="bold">
                  EAST
                </text>

                {/* Planets on 3D Dome */}
                {rows.map((row, idx) => {
                  const a = ((row.longitude - 90) * Math.PI) / 180;
                  const ring = 210 - (idx % 3) * 32;
                  const px = 300 + Math.cos(a) * ring;
                  const py = 300 + Math.sin(a) * ring * 0.45;
                  const isSelected = selectedRow?.name === row.name;

                  return (
                    <g
                      key={`dome-p-${row.name}`}
                      onClick={() => setSelectedBody(row.name)}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={px}
                        cy={py}
                        r={isSelected ? 15 : 11}
                        fill="#0c1738"
                        stroke={isSelected ? "#ffe180" : "#53f4ff"}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      <text
                        x={px}
                        y={py}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={isSelected ? "14" : "12"}
                        fill="#ffffff"
                      >
                        {SYMBOLS[row.name] ?? "✦"}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Time Scrubber / Drift Bar */}
          <div className="cg2050-scrubber">
            <div className="cg2050-scrubber-header">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Sliders size={13} />
                <span>Transit Motion Scrubber</span>
              </span>
              <span className="font-mono text-slate-300">
                {timeDriftHours === 0
                  ? "Exact Calculated Moment"
                  : `${timeDriftHours > 0 ? "+" : ""}${timeDriftHours}h Motion Offset`}
              </span>
            </div>
            <div className="cg2050-scrubber-controls">
              <input
                type="range"
                min="-24"
                max="24"
                step="1"
                value={timeDriftHours}
                onChange={e => setTimeDriftHours(Number(e.target.value))}
                aria-label="Scrub transit motion forward or backward in hours"
              />
              {timeDriftHours !== 0 && (
                <button
                  type="button"
                  onClick={() => setTimeDriftHours(0)}
                  className="cg2050-scrubber-reset"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Frame Caption */}
          <div className="cg2050-frame-caption">
            <span>
              <Eye size={13} className="text-amber-300" /> FIXED STARS PRESERVED
            </span>
            <span>
              <Orbit size={13} className="text-cyan-300" /> TROPICAL PLANETS POSITIONED
            </span>
          </div>
          <p className="cg2050-help">
            {frame === "god"
              ? "Fixed Aries-zero collective houses. The stellar archive and territory lines never drift."
              : "Observer-centered 30° equal houses, beginning from the chart's local Ascendant."}
          </p>
        </div>

        {/* Right Telemetry & Inspector Panel */}
        <div className="cg2050-panel">
          <div>
            <div className="cg2050-panel-kicker">
              <Sparkles size={16} /> INSPECT THE EVIDENCE
            </div>
            <h3>Divine Coordinates</h3>
          </div>

          {/* Planet Selection Pills */}
          <div className="cg2050-planets" role="group" aria-label="Select planet to inspect">
            {rows.map(row => (
              <button
                key={row.name}
                type="button"
                aria-pressed={selectedRow?.name === row.name}
                onClick={() => {
                  setSelectedBody(row.name);
                  setSelectedStar(null);
                }}
                className={selectedRow?.name === row.name ? "cg2050-planet-active" : ""}
              >
                <span>{SYMBOLS[row.name] ?? "✦"}</span>
                {row.name}
              </button>
            ))}
          </div>

          {/* Current Focus HUD */}
          {selectedRow && (
            <div className="cg2050-focus">
              <div className="cg2050-focus-title">
                <div>
                  <span className="kicker">Selected Focus</span>
                  <h4>{selectedRow.name}</h4>
                </div>
                <div>
                  <strong>{selectedRow.display}</strong>
                  <small>{activeHouseName(selectedRow)}</small>
                </div>
              </div>
              <p>
                This planet is at <span className="font-mono text-cyan-200">{selectedRow.display}</span>. In God View, it occupies {selectedRow.godHouse ? `House ${selectedRow.godHouse}` : "its fixed sector"}; in Agent View, it is read through {selectedRow.agentHouse ? `House ${selectedRow.agentHouse}` : "the local houses"}.
              </p>

              {/* Active Aspects to this body */}
              {selectedBodyAspects.length > 0 && (
                <div className="cg2050-aspects-box">
                  <div className="cg2050-aspects-header">
                    Active Geometric Aspects ({selectedBodyAspects.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedBodyAspects.map((asp, i) => {
                      const other = asp.p1.name === selectedRow.name ? asp.p2 : asp.p1;
                      return (
                        <span key={i} className="cg2050-aspect-chip" style={{ borderColor: `${asp.color}66` }}>
                          <span style={{ color: asp.color }}>{asp.type.toUpperCase()}</span>
                          <span className="text-white">{other.name}</span>
                          <span className="text-slate-400">({asp.orb.toFixed(1)}°)</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Star Details (if clicked) */}
          {selectedStar && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Fixed Star Beacon
                </span>
                <span className="font-mono text-xs text-amber-200">
                  Mag {STAR_CATALOG.find(s => s.name === selectedStar)?.mag}
                </span>
              </div>
              <h4 className="font-serif text-lg font-bold text-white mt-1">
                {selectedStar} · {STAR_CATALOG.find(s => s.name === selectedStar)?.constellation}
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                {STAR_CATALOG.find(s => s.name === selectedStar)?.meaning}
              </p>
              <div className="mt-2 text-[11px] font-mono text-amber-200">
                Longitude: {formatLongitude(STAR_CATALOG.find(s => s.name === selectedStar)?.lon ?? 0)}
              </div>
            </div>
          )}

          {/* Permanent Stellar Territories / Overlays */}
          <div>
            <div className="cg2050-overlay-title">
              <Layers3 size={17} />
              <div>
                <strong>Permanent Stellar Territories</strong>
                <span>Ancient 0° Aries-anchored divisions</span>
              </div>
            </div>

            <div className="cg2050-overlays" role="group" aria-label="Fixed divine overlay">
              {[
                { key: "nakshatra" as const, name: "27 Nakshatras" },
                { key: "manzil" as const, name: "28 Manzils" },
                { key: "decan" as const, name: "36 Decans" },
                { key: "stars" as const, name: "Fixed Stars" },
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={layer === item.key}
                  className={layer === item.key ? "cg2050-layer-active" : ""}
                  onClick={() => setLayer(item.key)}
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="cg2050-overlay-result mt-4">
              <span>Selected Fixed Background</span>
              <strong>
                {selectedRow
                  ? layer === "nakshatra"
                    ? `${selectedRow.overlay.nakshatra} · Pada ${selectedRow.overlay.pada}`
                    : layer === "manzil"
                    ? selectedRow.overlay.manzil
                    : layer === "decan"
                    ? selectedRow.overlay.decan
                    : nearestStar
                    ? `${nearestStar.name} (${nearestStar.separation.toFixed(2)}° orb)`
                    : "No Star Selected"
                  : "Select a body"}
              </strong>
              <small>
                {layer === "stars"
                  ? "Nearest archived fixed star beacon by divine separation."
                  : `Permanent coordinate division sector corresponding to ${selectedRow?.name}'s tropical longitude.`}
              </small>
            </div>
          </div>

          {/* Educational synthesis dropdown */}
          <details className="mt-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-3.5">
            <summary className="cursor-pointer flex items-center justify-between text-xs font-semibold text-cyan-200">
              <span className="flex items-center gap-2">
                <BookOpen size={14} />
                <span>How do the two frames synthesize?</span>
              </span>
              <ChevronDown size={14} />
            </summary>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              God View anchors to 0° Aries, representing universal cosmic law. Agent View anchors to your local Ascendant at birth, representing your temporal point of observation on Earth. Both viewpoints operate concurrently on the same true astronomical planetary longitudes.
            </p>
          </details>
        </div>
      </div>

      {/* Footer disclaimer */}
      <footer className="cg2050-disclaimer">
        <Star size={14} />
        <span>
          Planetary longitudes are driven by the Swiss Ephemeris. The fixed star catalog, constellation guides, and 27/28/36 division frames remain precession-locked reference coordinates.
        </span>
      </footer>
    </section>
  );
}