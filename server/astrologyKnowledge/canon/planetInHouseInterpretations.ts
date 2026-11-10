/** The 144 planet-in-house records are maintained in one authoritative library. */
export {
  PLANET_IN_HOUSE,
  getPlanetInHouse,
  getHouseMeanings,
  getPlanetInHouseKnowledge,
} from "../calculations/planetInHouseInterpretations";
export type {
  PlanetInHouseEpistemicStatus,
  PlanetInHouseKnowledgeRecord,
} from "../calculations/planetInHouseInterpretations";
