/**
 * Chinese 28 lunar mansions (二十八宿) — shared 12 Gates / Simulation Lab canon.
 *
 * This is a right-ascension system anchored to the determinative stars,
 * NOT 28 equal divisions of an ecliptic or tropical zodiac.
 * J2000 coordinates must be sourced from a verified star catalogue.
 * Do not silently substitute an equal-arc approximation for missing stars.
 */
export type ChineseMansion = {
  index: number;
  hanzi: string;
  pinyin: string;
  english: string;
  quadrant: "AZURE_DRAGON" | "BLACK_TORTOISE" | "WHITE_TIGER" | "VERMILION_BIRD";
  determinativeStar: string;
};

const entries = [
  ["角","Jiao","Horn","α Virginis"],["亢","Kang","Neck","κ Virginis"],
  ["氐","Di","Root","α² Librae"],["房","Fang","Room","π Scorpii"],
  ["心","Xin","Heart","α Scorpii"],["尾","Wei","Tail","μ Scorpii"],
  ["箕","Ji","Winnowing Basket","γ Sagittarii"],
  ["斗","Dou","Southern Dipper","φ Sagittarii"],["牛","Niu","Ox","β Capricorni"],
  ["女","Nu","Girl","ε Aquarii"],["虛","Xu","Emptiness","β Aquarii"],
  ["危","Wei","Rooftop","α Aquarii"],["室","Shi","Encampment","α Pegasi"],
  ["壁","Bi","Wall","γ Pegasi"],
  ["奎","Kui","Legs","η Andromedae"],["婁","Lou","Bond","β Arietis"],
  ["胃","Wei","Stomach","35 Arietis"],["昴","Mao","Hairy Head","17 Tauri"],
  ["畢","Bi","Net","ε Tauri"],["觜","Zi","Turtle Beak","φ¹ Orionis"],
  ["參","Shen","Three Stars","δ Orionis"],
  ["井","Jing","Well","μ Geminorum"],["鬼","Gui","Ghost","θ Cancri"],
  ["柳","Liu","Willow","δ Hydrae"],["星","Xing","Star","α Hydrae"],
  ["張","Zhang","Extended Net","υ¹ Hydrae"],["翼","Yi","Wings","α Crateris"],
  ["軫","Zhen","Chariot","γ Corvi"],
] as const;
const quadrant = (i: number): ChineseMansion["quadrant"] =>
  i < 7 ? "AZURE_DRAGON" : i < 14 ? "BLACK_TORTOISE"
    : i < 21 ? "WHITE_TIGER" : "VERMILION_BIRD";

export const CHINESE_MANSIONS: readonly ChineseMansion[] = Object.freeze(
  entries.map(([hanzi,pinyin,english,determinativeStar], i) =>
    Object.freeze({index:i+1,hanzi,pinyin,english,determinativeStar,quadrant:quadrant(i)}))
);

/** Catalogue entries and object positions MUST use the same reference epoch/frame. */
export type StarAnchor = {
  star: string;
  rightAscensionDegrees: number;
};
export type MansionCatalog = {
  frame: "ICRS_J2000";
  source: string;
  anchors: readonly StarAnchor[];
};

export type MansionReading = {
  mansion: ChineseMansion;
  rightAscensionDegrees: number;
  startRightAscensionDegrees: number;
  endRightAscensionDegrees: number;
  widthDegrees: number;
  degreesIntoMansion: number;
};
const mod = (x: number) => ((x % 360) + 360) % 360;

/** Reject incomplete, mixed-frame, duplicated or unorderable reference data. */
export function compileChineseMansionCatalog(catalog: MansionCatalog) {
  if (catalog.frame !== "ICRS_J2000" || !catalog.source.trim())
    throw new Error("Chinese mansions require a cited ICRS/J2000 stellar catalogue");
  const byStar = new Map<string, number>();
  for (const entry of catalog.anchors) {
    if (!Number.isFinite(entry.rightAscensionDegrees) || byStar.has(entry.star))
      throw new Error("Invalid or duplicate determinative star: " + entry.star);
    byStar.set(entry.star, mod(entry.rightAscensionDegrees));
  }
  if (byStar.size !== 28) throw new Error("All 28 determinative stars are required");
  const starts = CHINESE_MANSIONS.map(mansion => {
    const ra = byStar.get(mansion.determinativeStar);
    if (ra === undefined) throw new Error("Missing star: " + mansion.determinativeStar);
    return ra;
  });
  const widths = starts.map((ra,i) => mod(starts[(i+1)%28]! - ra));
  if (widths.some(width => width <= 0) || Math.abs(widths.reduce((a,b)=>a+b,0)-360)>1e-6)
    throw new Error("Determinative star order is invalid or incompatible with RA boundaries");
  return {
    source: catalog.source,
    frame: catalog.frame,
    boundaries: CHINESE_MANSIONS.map((mansion,i) => ({
      mansion, startRightAscensionDegrees: starts[i]!, widthDegrees: widths[i]!,
      endRightAscensionDegrees: starts[(i+1)%28]!,
    })),
  };
}
export type CompiledChineseMansions = ReturnType<typeof compileChineseMansionCatalog>;
export function chineseMansionAtRa(rightAscensionDegrees: number, compiled: CompiledChineseMansions): MansionReading {
  if (!Number.isFinite(rightAscensionDegrees)) throw new Error("Invalid body right ascension");
  const ra = mod(rightAscensionDegrees);
  const boundary = compiled.boundaries.find(b => mod(ra-b.startRightAscensionDegrees) < b.widthDegrees);
  if (!boundary) throw new Error("No mansion matched; invalid star reference catalog");
  return {
    mansion: boundary.mansion, rightAscensionDegrees: ra,
    startRightAscensionDegrees: boundary.startRightAscensionDegrees,
    endRightAscensionDegrees: boundary.endRightAscensionDegrees,
    widthDegrees: boundary.widthDegrees,
    degreesIntoMansion: mod(ra-boundary.startRightAscensionDegrees),
  };
}
export type ChineseMansionBody = { planet: string; j2000RaDegrees: number; house: number };
/** Each body receives an assignment; caller may supply 12 cusps as additional bodies. */
export function buildChineseMansionEvidence(
  bodies: readonly ChineseMansionBody[], compiled: CompiledChineseMansions
) {
  return {
    method: "CHINESE_28_XIU_STELLAR_RA_V1",
    frame: compiled.frame, catalogSource: compiled.source,
    assignments: bodies.map(body => ({
      planet: body.planet, house: body.house,
      ...chineseMansionAtRa(body.j2000RaDegrees, compiled),
    })),
  };
}
