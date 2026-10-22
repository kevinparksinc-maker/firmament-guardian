/** Historical-source research inventory, NOT chart longitude data.
 * No J2000 values, epoch drift, or guessed "discovery date" longitudes are
 * permitted into the permanent Firmament chart engine.
 *
 * A star's historical entry into astrology must be established from an
 * identifiable ancient text/catalog, with that tradition's zodiac origin,
 * epoch and astronomical convention validated. These are not interchangeable.
 *
 * Sources to investigate: Ptolemy's Almagest; Anonymous of 379;
 * medieval Arabic star names/catalogs; Babylonian MUL.APIN.
 */
export const FIXED_STAR_HISTORICAL_RESEARCH_QUEUE = [
 "Hamal","Algol","Aldebaran","Rigel","Polaris","Sirius","Regulus","Spica",
 "Antares","Fomalhaut","Alcyone","Bellatrix","Betelgeuse","Castor","Pollux",
 "Procyon","Arcturus","Vega","Altair","Achernar","Capella","Canopus",
 "Denebola","Vindemiatrix","Alphecca","Zubenelgenubi","Deneb Algedi",
 "Rasalhague","Deneb","Scheat",
] as const;
export type HistoricalStarResearchName = typeof FIXED_STAR_HISTORICAL_RESEARCH_QUEUE[number];
