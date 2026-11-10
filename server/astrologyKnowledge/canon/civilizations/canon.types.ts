/** Historical doctrine schema. These records are reference literature, not verified chart outputs. */
export type Tradition = 'jyotish' | 'arabic-persian' | 'hellenistic' | 'hermetic' | 'chinese' | 'babylonian-assyrian' | 'egyptian' | 'medieval-european' | 'maya';
export type Kind = 'doctrine' | 'classification' | 'judgment-method' | 'timing-technique' | 'omen-corpus' | 'calendar-system' | 'cosmology' | 'ritual-practice';
export type Computability = 'computable' | 'computable-with-convention' | 'interpretive-correspondence' | 'spiritual-philosophy' | 'historical-omen' | 'calendrical-count';
export type Provenance = 'original-historical' | 'later-codification' | 'modern-reinterpretation' | 'modern-attribution';
export type Confidence = 'high' | 'medium' | 'low';
export type ZodiacFrame = 'tropical' | 'sidereal-lahiri-family' | 'sidereal-fixed-star-referenced' | 'source-dependent' | 'lunar-stations' | 'calendrical' | 'none-observational' | 'not-applicable';
export interface Source { author:string; work:string; dateApprox:string; translation?:string; locator?:string; checked:'web-verified-2026-10-24'|'recalled-needs-check'; }
export interface CalcSpec {inputs:string[];algorithm:string;parameters?:Record<string,unknown>;frame:ZodiacFrame;houseSystem?:string;unresolved?:string[];}
export interface CanonRecord {id:string;tradition:Tradition;name:string;nativeName?:string;kind:Kind;provenance:Provenance;summary:string;applyWhen:string[];relationships?:{planets?:string[];stars?:string[];lunar?:string[];houses?:string[];degrees?:string[];timing?:string[]};modifiers?:{strengthens?:string[];weakens?:string[];cancels?:string[];contradicts?:string[]};meaning?:{spiritual?:string;philosophical?:string;practical?:string};sources:Source[];schoolDisputes?:string[];computability:Computability;calc:CalcSpec|null;confidence:Confidence;gaps?:string[];}
export const S=(author:string,work:string,dateApprox:string,translation?:string,locator?:string,checked:Source['checked']='recalled-needs-check'):Source=>({author,work,dateApprox,translation,locator,checked});
