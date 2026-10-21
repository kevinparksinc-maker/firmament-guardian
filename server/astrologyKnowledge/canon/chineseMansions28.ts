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
  ["心","Xin","Heart","σ Scorpii"],["尾","Wei","Tail","μ¹ Scorpii"],
  ["箕","Ji","Winnowing Basket","γ Sagittarii"],
  ["斗","Dou","Southern Dipper","μ Sagittarii"],["牛","Niu","Ox","β Capricorni"],
  ["女","Nu","Girl","ε Aquarii"],["虛","Xu","Emptiness","β Aquarii"],
  ["危","Wei","Rooftop","α Aquarii"],["室","Shi","Encampment","α Pegasi"],
  ["壁","Bi","Wall","γ Pegasi"],
  ["奎","Kui","Legs","η Andromedae"],["婁","Lou","Bond","β Arietis"],
  ["胃","Wei","Stomach","35 Arietis"],["昴","Mao","Hairy Head","17 Tauri"],
  ["畢","Bi","Net","ε Tauri"],["觜","Zi","Turtle Beak","λ Orionis"],
  ["參","Shen","Three Stars","ζ Orionis"],
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


/** Verified reference edition: Stellarium Chinese skyculture, J2000 table.
 * https://github.com/Stellarium/stellarium/blob/master/skycultures/chinese/description.md
 * This is a fixed-J2000 research coordinate frame, not historical epoch-of-date.
 */
const STELLARIUM_REFERENCE: readonly (readonly [string,string])[] = [
  ["α Vir","13h25m11.6s"],
  ["κ Vir","14h12m53.8s"],
  ["α2 Lib","14h50m52.8s"],
  ["π Sco","15h58m51.1s"],
  ["σ Sco","16h21m11.3s"],
  ["μ1 Sco","16h51m52.2s"],
  ["γ Sgr","18h05m48.5s"],
  ["μ Sgr","18h45m39.4s"],
  ["β Cap","20h21m0.7s"],
  ["ε Aqr","20h47m40.6s"],
  ["β Aqr","21h31m33.5s"],
  ["α Aqr","22h05m47.0s"],
  ["α Peg","23h04m45.7s"],
  ["γ Peg","00h13m14.2s"],
  ["η And","00h57m12.3s"],
  ["β Ari","01h54m38.4s"],
  ["35 Ari","02h43m27.1s"],
  ["17 Tau","03h44m52.5s"],
  ["ε Tau","04h28m37.0s"],
  ["λ Ori","5h35m8.3s"],
  ["ζ Ori","05h40m45.5s"],
  ["μ Gem","6h22m57.6s"],
  ["θ Cnc","8h31m35.7s"],
  ["δ Hya","8h37m39.4s"],
  ["α Hya","09h27m35.2s"],
  ["υ1 Hya","09h51m28.7s"],
  ["α Crt","10h59m45.9s"],
  ["γ Crv","12h15m48.4s"],
];
const hmsToDegrees = (value: string): number => {
  const parsed = /^(\d{1,2})h(\d{1,2})m([\d.]+)s$/.exec(value);
  if (!parsed) throw new Error("Invalid J2000 right ascension: " + value);
  return (Number(parsed[1]) + Number(parsed[2])/60 + Number(parsed[3])/3600)*15;
};
export const STELLARIUM_J2000_CHINESE_CATALOG: MansionCatalog = {
  frame: "ICRS_J2000",
  source: "Stellarium Chinese Sky Culture: determinative-star J2000 RA table",
  anchors: STELLARIUM_REFERENCE.map(([star,ra],i)=>({
    star: CHINESE_MANSIONS[i]!.determinativeStar,
    rightAscensionDegrees: hmsToDegrees(ra),
  })),
};
export const DEFAULT_CHINESE_MANSIONS = compileChineseMansionCatalog(STELLARIUM_J2000_CHINESE_CATALOG);
