import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import sweph from "sweph";
import { angularDistance, type Worldview } from "./astrologyCore";
import { MAJOR_ASPECT_ORB_DEGREES } from "../shared/chartRules";
import { formatLongitude } from "../shared/hybrid";
import type {
  CalculationEvidence,
  CalculationEvidenceEnvelope,
  EvidenceInputSnapshot,
} from "../shared/calculationEvidence";
import type { ChartInput, ChartRow, TransitRow } from "./astronomy";

const SWISS_MANUAL_URL = "https://www.astro.com/swisseph/swephprg.htm";
const sw = sweph as any;
const C = sw.constants;
const runtimeRequire = createRequire(`${process.cwd()}/package.json`);
const swephPackagePath = join(dirname(runtimeRequire.resolve("sweph")), "package.json");
const SWEPH_WRAPPER_VERSION = String(JSON.parse(readFileSync(swephPackagePath, "utf8")).version);
const BODY_IDS: Record<string, number> = {
  Sun: C.SE_SUN,
  Moon: C.SE_MOON,
  Mercury: C.SE_MERCURY,
  Venus: C.SE_VENUS,
  Mars: C.SE_MARS,
  Jupiter: C.SE_JUPITER,
  Saturn: C.SE_SATURN,
  Uranus: C.SE_URANUS,
  Neptune: C.SE_NEPTUNE,
  Pluto: C.SE_PLUTO,
  "North Node": C.SE_MEAN_NODE ?? 10,
};
const ASPECT_ANGLES: Record<string, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};
const UNVERIFIED_NOTE = "This record exposes calculation provenance; no independent reference comparison has certified this result.";
const BASE_FLAGS = C.SEFLG_MOSEPH | C.SEFLG_SPEED | C.SEFLG_SIDEREAL;
const TOPOCENTRIC_FLAGS = BASE_FLAGS | C.SEFLG_TOPOCTR;

export type CalculationEvidenceBuildInput = {
  input: ChartInput;
  worldview: Worldview;
  readingScope: NonNullable<ChartInput["readingScope"]>;
  utc: string;
  julianDay: number;
  transitDate: string;
  transitJulianDay: number;
  referenceFrame: string;
  transitHouseFrame: string;
  hasNatalLocation: boolean;
  hasTransitLocation: boolean;
  natalSiderealTrace: CanonicalSiderealTrace | null;
  transitSiderealTrace: CanonicalSiderealTrace | null;
  transitAscendantLongitude: number | null;
  transitDescendantLongitude: number | null;
  transitMidheavenLongitude: number | null;
  transitHouseAscendantLongitude: number | null;
  ascendant: ChartRow | null;
  descendant: ChartRow | null;
  midheaven: ChartRow | null;
  houses: number[];
  movingBodies: ChartRow[];
  frozenStars: ChartRow[];
  northNode: ChartRow;
  southNode: ChartRow;
  transits: TransitRow[];
  natalTargets: ChartRow[];
  natalRawLongitudes: Record<string, number>;
  transitRawLongitudes: Record<string, number>;
  natalTopocentricMoonRawLongitude: number | null;
  transitTopocentricMoonRawLongitude: number | null;
};

export type CanonicalSiderealTrace = {
  thetaCanonicalDeg: number;
  greenwichApparentSiderealTimeHours: number;
  observerLongitudeDeg: number;
  mode14AyanamshaDeg: number;
};

function snapshot(
  date: string | undefined,
  time: string | undefined,
  timezone: string | undefined,
  utcIso: string,
  julianDay: number,
  latitude: number | undefined,
  longitude: number | undefined,
  located: boolean,
  timeSource: NonNullable<EvidenceInputSnapshot["timeSource"]>,
  elevationM: number | undefined,
): EvidenceInputSnapshot {
  return {
    ...(timeSource !== "automatic-current-time" && date ? { localDate: date } : {}),
    ...(timeSource === "explicit-local-date-time" && time ? { localTime: time } : {}),
    ...(timeSource === "explicit-local-date-time" && timezone ? { timezone } : {}),
    utcIso,
    julianDay,
    timeSource,
    ...(located && Number.isFinite(latitude) ? { latitudeDeg: latitude } : {}),
    ...(located && Number.isFinite(longitude) ? { longitudeDeg: longitude } : {}),
    ...(located && Number.isFinite(elevationM) ? { elevationM } : {}),
    observerMode: "geocentric",
  };
}

function timeSourceFor(
  date: string | undefined,
  time: string | undefined,
  worldview: Worldview,
  birthTimeKnown: boolean | undefined,
  transit: boolean,
): NonNullable<EvidenceInputSnapshot["timeSource"]> {
  if (!date) return "automatic-current-time";
  if (worldview === "god" && (!time || (!transit && birthTimeKnown === false))) return "date-only-reference";
  return "explicit-local-date-time";
}

function baseEvidence(
  objectId: string,
  displayValue: string,
  frameId: string,
  input: EvidenceInputSnapshot,
  flags?: number,
  model = "Swiss Ephemeris Moshier analytic ephemeris",
): CalculationEvidence {
  return {
    objectId,
    displayValue,
    frameId,
    input,
    engine: {
      name: "Swiss Ephemeris",
      version: String(sw.version()),
      wrapper: `sweph@${SWEPH_WRAPPER_VERSION}`,
      ...(flags == null ? {} : { flags }),
      model,
    },
    source: {
      reference: "Swiss Ephemeris runtime calculation; see the active formula trace.",
      url: SWISS_MANUAL_URL,
    },
    steps: [],
    validation: { status: "unverified", notes: [UNVERIFIED_NOTE] },
  };
}

function addFormattingStep(evidence: CalculationEvidence, longitude: number) {
  evidence.steps.push({
    name: "Zodiac display formatting",
    formula: "signIndex = floor(normalize(longitude) / 30); degreeInSign = normalize(longitude) % 30",
    operands: { longitudeDeg: longitude },
    result: formatLongitude(longitude),
  });
}

function addHouseStep(evidence: CalculationEvidence, row: ChartRow, ascendantLongitude: number | null, worldview: Worldview) {
  evidence.steps.push({
    name: "House assignment",
    formula: worldview === "god"
      ? "1 + floor(normalize(planetLongitude) / 30)"
      : "1 + floor(normalize(planetLongitude - ascendantLongitude) / 30)",
    operands: {
      planetLongitudeDeg: row.longitude,
      ...(worldview === "god" ? {} : { ascendantLongitudeDeg: ascendantLongitude ?? 0 }),
    },
    result: row.house,
    units: "house number",
  });
}

function positionEvidence(
  layer: "natal" | "transit",
  row: ChartRow,
  input: EvidenceInputSnapshot,
  frameId: string,
  houseAscendantLongitude: number | null,
  worldview: Worldview,
  julianDayUt: number,
  northNodeLongitude?: number,
  rawReturnedLongitude?: number,
): CalculationEvidence {
  const evidence = baseEvidence(`${layer}:${row.name}`, row.display, frameId, input, BASE_FLAGS);
  evidence.resultLongitudeDeg = row.longitude;
  const planetId = BODY_IDS[row.name];
  if (planetId != null) {
    if (rawReturnedLongitude == null) {
      evidence.validation.notes?.push("Raw Swiss return was not captured; the raw-value formula trace is omitted.");
    } else {
      evidence.rawResultLongitudeDeg = rawReturnedLongitude;
      evidence.steps.push({
        name: "Raw Swiss sidereal ecliptic longitude",
        formula: "sweph.calc_ut(julianDayUT, planetId, flags).data[0]",
        operands: { julianDayUT: julianDayUt, planetId, flags: BASE_FLAGS, siderealModeId: 14 },
        result: rawReturnedLongitude,
        units: "degrees",
      }, {
        name: "Application normalization and frame handling",
        formula: "normalize(rawReturnedLongitudeDeg); no additional application-level frame transform",
        operands: { rawReturnedLongitudeDeg: rawReturnedLongitude, additionalFrameTransform: "none; requested Swiss sidereal mode 14 supplies this zodiac frame" },
        result: row.longitude,
        units: "degrees",
      });
    }
  } else if (row.name === "South Node" && northNodeLongitude != null) {
    evidence.steps.push({
      name: "South Node longitude",
      formula: "normalize(northNodeLongitude + 180)",
      operands: { northNodeLongitudeDeg: northNodeLongitude },
      result: row.longitude,
      units: "degrees",
    });
  }
  addFormattingStep(evidence, row.longitude);
  addHouseStep(evidence, row, houseAscendantLongitude, worldview);
  return evidence;
}

function topocentricMoonEvidence(
  layer: "natal" | "transit",
  row: ChartRow,
  input: EvidenceInputSnapshot,
  frameId: string,
  julianDayUt: number,
  elevationM: number,
  rawReturnedLongitude: number | null,
): CalculationEvidence | null {
  if (row.topocentricLongitude == null) return null;
  const evidence = baseEvidence(
    `${layer}:Moon:topocentric`,
    formatLongitude(row.topocentricLongitude),
    frameId,
    { ...input, observerMode: "topocentric" },
    TOPOCENTRIC_FLAGS,
    "Swiss Ephemeris Moshier analytic ephemeris; observer-specific topocentric Moon longitude",
  );
  evidence.resultLongitudeDeg = row.topocentricLongitude;
  if (rawReturnedLongitude == null) {
    evidence.validation.notes?.push("Raw topocentric Moon return was not captured; the raw-value formula trace is omitted.");
  } else {
    evidence.rawResultLongitudeDeg = rawReturnedLongitude;
    evidence.steps.push(
      {
        name: "Raw topocentric Moon longitude",
        formula: "sweph.set_topo(longitudeDeg, latitudeDeg, elevationM); sweph.calc_ut(julianDayUT, SE_MOON, flags).data[0]",
        operands: {
          julianDayUT: julianDayUt,
          planetId: C.SE_MOON,
          flags: TOPOCENTRIC_FLAGS,
          latitudeDeg: input.latitudeDeg ?? 0,
          longitudeDeg: input.longitudeDeg ?? 0,
          elevationM,
        },
        result: rawReturnedLongitude,
        units: "degrees",
      },
      {
        name: "Application normalization and frame handling",
        formula: "normalize(rawReturnedLongitudeDeg); no additional application-level frame transform",
        operands: { rawReturnedLongitudeDeg: rawReturnedLongitude, additionalFrameTransform: "none; requested Swiss sidereal mode 14 supplies this zodiac frame" },
        result: row.topocentricLongitude,
        units: "degrees",
      },
    );
  }
  addFormattingStep(evidence, row.topocentricLongitude);
  return evidence;
}

function angleEvidence(
  layer: "natal" | "transit",
  name: "Ascendant" | "Descendant" | "Midheaven",
  longitude: number,
  trace: CanonicalSiderealTrace,
  ascendantLongitude: number | null,
  input: EvidenceInputSnapshot,
  frameId: string,
): CalculationEvidence {
  const evidence = baseEvidence(
    `${layer}:${name}`,
    formatLongitude(longitude),
    frameId,
    input,
    undefined,
    "Swiss Ephemeris sidereal-time and mode-14 ayanamsha; experimental zero-tilt local-sidereal geometry",
  );
  evidence.resultLongitudeDeg = longitude;
  const formula = name === "Ascendant"
    ? "normalize(thetaCanonical + 90)"
    : name === "Descendant"
      ? "normalize(ascendantLongitude + 180)"
      : "normalize(thetaCanonical)";
  evidence.steps.push(
    {
      name: "Canonical local sidereal angle",
      formula: "normalize(greenwichApparentSiderealTimeHours * 15 + observerLongitude - mode14Ayanamsha)",
      operands: {
        greenwichApparentSiderealTimeHours: trace.greenwichApparentSiderealTimeHours,
        observerLongitudeDeg: trace.observerLongitudeDeg,
        mode14AyanamshaDeg: trace.mode14AyanamshaDeg,
      },
      result: trace.thetaCanonicalDeg,
      units: "degrees",
    },
    {
      name: `${name} longitude`,
      formula,
      operands: name === "Descendant"
        ? { ascendantLongitudeDeg: ascendantLongitude ?? 0 }
        : { thetaCanonicalDeg: trace.thetaCanonicalDeg },
      result: longitude,
      units: "degrees",
    },
  );
  addFormattingStep(evidence, longitude);
  return evidence;
}

export function buildCalculationEvidenceEnvelope(args: CalculationEvidenceBuildInput): CalculationEvidenceEnvelope {
  const natalTimeSource = timeSourceFor(args.input.date, args.input.time, args.worldview, args.input.birthTimeKnown, false);
  const transitTimeSource = timeSourceFor(args.input.transitDate, args.input.transitTime, args.worldview, args.input.birthTimeKnown, true);
  const effectiveElevationM = args.input.elevation ?? 0;
  const natalInput = snapshot(
    args.input.date,
    args.input.time,
    args.input.timezone,
    args.utc,
    args.julianDay,
    args.input.latitude,
    args.input.longitude,
    args.hasNatalLocation,
    natalTimeSource,
    effectiveElevationM,
  );
  const transitInput = snapshot(
    args.input.transitDate,
    args.input.transitTime,
    args.input.transitTimezone,
    args.transitDate,
    args.transitJulianDay,
    args.input.transitLatitude,
    args.input.transitLongitude,
    args.hasTransitLocation,
    transitTimeSource,
    effectiveElevationM,
  );
  const engine = {
    name: "Swiss Ephemeris",
    version: String(sw.version()),
    wrapper: `sweph@${SWEPH_WRAPPER_VERSION}`,
    flags: BASE_FLAGS,
    model: "Moshier analytic ephemeris; production geocentric positions use sidereal mode 14. Angles use the experimental zero-tilt local-sidereal convention. Calculation evidence schema v1.",
  };
  const frame = { id: args.referenceFrame, version: "sidereal-mode-14+zero-tilt-v1" };
  const fixedStarTableSha256 = createHash("sha256")
    .update(JSON.stringify(args.frozenStars.map(({ name, longitude }) => [name, longitude])))
    .digest("hex");
  const canonicalInputs = {
    natal: natalInput,
    transit: transitInput,
    calculationMode: {
      worldview: args.worldview,
      readingScope: args.readingScope,
      natalHouseFrame: args.worldview === "god" ? "god-fixed" : args.hasNatalLocation ? "natal-location-equal-house" : "not-available",
      transitHouseFrame: args.transitHouseFrame,
      siderealModeId: 14,
      geocentricFlags: BASE_FLAGS,
      topocentricFlags: TOPOCENTRIC_FLAGS,
      majorAspectOrbDegrees: MAJOR_ASPECT_ORB_DEGREES,
      aspectTargets: ASPECT_ANGLES,
      observerElevationPolicy: "one shared input.elevation is used for any natal and transit topocentric Moon calculation",
      fixedStarTableSha256,
      calculationAlgorithmVersion: "server-chart-calculation-v1",
    },
  };
  const reproducibilityPayload = JSON.stringify({ schemaVersion: "calculation-evidence/v1", canonicalInputs, engine, frame });
  const reproducibilityId = createHash("sha256").update(reproducibilityPayload).digest("hex");
  const items: CalculationEvidence[] = [];

  for (const body of args.movingBodies) {
    items.push(positionEvidence("natal", body, natalInput, args.referenceFrame, args.ascendant?.longitude ?? null, args.worldview, args.julianDay, undefined, args.natalRawLongitudes[body.name]));
    const topocentric = topocentricMoonEvidence("natal", body, natalInput, args.referenceFrame, args.julianDay, effectiveElevationM, args.natalTopocentricMoonRawLongitude);
    if (topocentric) items.push(topocentric);
  }
  items.push(positionEvidence("natal", args.northNode, natalInput, args.referenceFrame, args.ascendant?.longitude ?? null, args.worldview, args.julianDay, undefined, args.natalRawLongitudes[args.northNode.name]));
  items.push(positionEvidence(
    "natal", args.southNode, natalInput, args.referenceFrame, args.ascendant?.longitude ?? null, args.worldview,
    args.julianDay, args.northNode.longitude,
  ));

  if (args.natalSiderealTrace) {
    for (const [name, row] of [["Ascendant", args.ascendant], ["Descendant", args.descendant], ["Midheaven", args.midheaven]] as const) {
      if (row) items.push(angleEvidence("natal", name, row.longitude, args.natalSiderealTrace, args.ascendant?.longitude ?? null, natalInput, args.referenceFrame));
    }
  }
  if (args.transitSiderealTrace) {
    for (const [name, longitude] of [
      ["Ascendant", args.transitAscendantLongitude],
      ["Descendant", args.transitDescendantLongitude],
      ["Midheaven", args.transitMidheavenLongitude],
    ] as const) {
      if (longitude != null) items.push(angleEvidence("transit", name, longitude, args.transitSiderealTrace, args.transitAscendantLongitude, transitInput, args.referenceFrame));
    }
  }
  for (const [index, cusp] of args.houses.entries()) {
    const evidence = baseEvidence(
      `natal:house-cusp-${index + 1}`,
      formatLongitude(cusp),
      args.referenceFrame,
      natalInput,
      undefined,
      "Equal-house cusp geometry",
    );
    evidence.resultLongitudeDeg = cusp;
    evidence.steps.push({
      name: `House ${index + 1} cusp longitude`,
      formula: args.worldview === "god"
        ? "normalize(30 * houseIndexZeroBased)"
        : "normalize(ascendantLongitude + 30 * houseIndexZeroBased)",
      operands: {
        houseIndexZeroBased: index,
        ...(args.worldview === "god" ? {} : { ascendantLongitudeDeg: args.ascendant?.longitude ?? 0 }),
      },
      result: cusp,
      units: "degrees",
    });
    items.push(evidence);
  }

  for (const star of args.frozenStars) {
    const evidence = baseEvidence(
      `natal:fixed-star:${star.name}`,
      star.display,
      args.referenceFrame,
      natalInput,
      undefined,
      "Static application reference position; not a catalog-verified apparent star calculation",
    );
    evidence.resultLongitudeDeg = star.longitude;
    evidence.source = {
      catalog: "FIXED_STARS in shared/hybrid.ts",
      reference: "Static symbolic application table; historical/catalog calibration has not been verified.",
    };
    evidence.steps.push({
      name: "Static fixed-star table lookup",
      formula: "FIXED_STARS.find(([name]) => name === starName)[1]",
      operands: { starName: star.name, tableLongitudeDeg: star.longitude },
      result: star.longitude,
      units: "degrees",
    });
    evidence.validation.notes = ["The app currently exposes a static symbolic longitude, not a catalog-calculated star position."];
    items.push(evidence);
  }

  const natalByName = new Map(args.natalTargets.map((row) => [row.name, row]));
  const transitNorthNode = args.transits.find((row) => row.name === "North Node");
  for (const transit of args.transits) {
    items.push(positionEvidence(
      "transit", transit, transitInput, args.referenceFrame, args.transitHouseAscendantLongitude, args.worldview,
      args.transitJulianDay, transitNorthNode?.longitude, args.transitRawLongitudes[transit.name],
    ));
    const topocentric = topocentricMoonEvidence("transit", transit, transitInput, args.referenceFrame, args.transitJulianDay, effectiveElevationM, args.transitTopocentricMoonRawLongitude);
    if (topocentric) items.push(topocentric);
    for (const contact of transit.natalContacts) {
      const natal = natalByName.get(contact.natalName);
      const targetAngleDeg = ASPECT_ANGLES[contact.aspect];
      if (!natal || targetAngleDeg == null) continue;
      const separationDeg = angularDistance(transit.longitude, natal.longitude);
      const evidence = baseEvidence(
        `contact:${transit.name}:${contact.aspect}:${contact.natalName}`,
        `${contact.aspect} · ${contact.orb.toFixed(2)}° orb`,
        args.referenceFrame,
        transitInput,
        undefined,
        "Angular separation and major-aspect orb calculation",
      );
      evidence.steps.push(
        {
          name: "Angular separation",
          formula: "min(abs(a - b), 360 - abs(a - b)) after longitude normalization",
          operands: { transitLongitudeDeg: transit.longitude, natalLongitudeDeg: natal.longitude },
          result: separationDeg,
          units: "degrees",
        },
        {
          name: "Aspect orb",
          formula: "abs(separation - targetAngle)",
          operands: { separationDeg, targetAngleDeg },
          result: contact.orb,
          units: "degrees",
        },
      );
      evidence.source = {
        reference: "aspectBetween() in server/astronomy.ts; current major-aspect targets and shared 5° orb.",
      };
      items.push(evidence);
    }
  }

  return {
    schemaVersion: "calculation-evidence/v1",
    timestampUtc: args.utc,
    reproducibilityId,
    canonicalInputs,
    engine,
    frame,
    items,
    privacy: {
      visibility: "private-only",
      containsPreciseBirthOrLocationData: true,
      shareSafe: false,
    },
    reproducibilityNote: "The SHA-256 identifier fingerprints canonical inputs (including any automatically generated current transit instant), calculation mode, engine metadata, and frame configuration. The same complete canonical inputs and configuration are deterministic; changing an automatically generated transit instant changes the calculation and identifier. This is not a signature, independent verification, or proof of accuracy. This full envelope contains private birth/location details and must not be used in public sharing or export without redaction.",
  };
}
