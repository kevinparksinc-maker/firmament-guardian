/** Classical Jyotish bhava groupings. Deterministic doctrine, not a planetary score. */
export type JyotishHouseGroup = {
  id: string; name: string; houses: readonly number[]; meaning: string;
  qualification: string;
};
export const JYOTISH_HOUSE_GROUPS: readonly JyotishHouseGroup[] = [
  { id:"dharma",name:"Dharma",houses:[1,5,9],meaning:"Purpose, guiding principles, wisdom, merit and right action",qualification:"Purushartha grouping; not a prediction of moral character" },
  { id:"artha",name:"Artha",houses:[2,6,10],meaning:"Material support, livelihood, resources and responsibility",qualification:"Purushartha grouping; not a wealth guarantee" },
  { id:"kama",name:"Kama",houses:[3,7,11],meaning:"Desire, initiative, partnership, gains and fulfillment",qualification:"Purushartha grouping; not a relationship outcome" },
  { id:"moksha",name:"Moksha",houses:[4,8,12],meaning:"Inner foundation, release, hidden change and liberation",qualification:"Purushartha grouping; not a measure of spiritual attainment" },
  { id:"kendra",name:"Kendra",houses:[1,4,7,10],meaning:"Angular pivots and structural foundations of life",qualification:"Strength depends on lordship, condition and other testimony" },
  { id:"trikona",name:"Trikona",houses:[1,5,9],meaning:"Trinal houses linked with dharma and favorable potential",qualification:"Trinal symbolism alone does not establish a yoga" },
  { id:"dusthana",name:"Dusthana",houses:[6,8,12],meaning:"Difficulties, vulnerability, disruption, debt, loss and obstacles",qualification:"Not uniformly harmful; read overlapping groups and planetary condition" },
  { id:"upachaya",name:"Upachaya",houses:[3,6,10,11],meaning:"Houses of growth, improvement and development through time and effort",qualification:"Improvement is a traditional potential, not a guaranteed trajectory" },
  { id:"trishadaya",name:"Trishadaya",houses:[3,6,11],meaning:"Effort, contest, desire, worldly struggle and gains",qualification:"Named grouping varies in usage and interpretive emphasis by school" },
  { id:"maraka",name:"Maraka",houses:[2,7],meaning:"Potentially life-ending significations in traditional longevity techniques",qualification:"Do not predict death, cause of death, or lifespan from house membership" },
  { id:"panaphara",name:"Panaphara",houses:[2,5,8,11],meaning:"Succedent houses succeeding the angular pivots",qualification:"A positional grouping, not a benefic or malefic judgment" },
  { id:"apoklima",name:"Apoklima",houses:[3,6,9,12],meaning:"Cadent houses departing from angular pivots",qualification:"A positional grouping, not a benefic or malefic judgment" },
] as const;
export const JYOTISH_HOUSE_GROUP_PROVENANCE = {
  tradition:"vedic" as const,
  sourceTitle:"Classical Jyotish bhava classifications (Parashari and later hora traditions)",
  epistemicCategory:"TRADITION" as const,
  notes:"Terminology and applications vary by school and recension. Applies to Jyotish house numbering in the explicitly selected house/coordinate frame; avoid silently equating sidereal Lagna with a tropical frame.",
};
export function getJyotishHouseGroups(house:number): readonly JyotishHouseGroup[] {
  if(!Number.isInteger(house)||house<1||house>12) return [];
  return JYOTISH_HOUSE_GROUPS.filter(group=>group.houses.includes(house));
}
export function describeJyotishHouse(house:number):string {
  const groups=getJyotishHouseGroups(house);
  if(!groups.length)return "Jyotish house unavailable: valid houses are 1–12.";
  return `Bhava ${house}: ${groups.map(g=>`${g.name} — ${g.meaning} (${g.qualification})`).join("; ")}. Each classification coexists; do not reduce overlapping groups to a single good/bad label.`;
}
