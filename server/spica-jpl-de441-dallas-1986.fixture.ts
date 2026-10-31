/**
 * Captured NASA/JPL Horizons DE441 geocentric geometric vectors for the
 * Dallas regression instant. See docs/spica-coordinate-research.md for source
 * URLs, frame derivation, and the Swiss Moshier comparison methodology.
 */
export const SPICA_JPL_DE441_DALLAS_1986 = {
  source: "NASA/JPL Horizons API",
  endpoint: "https://ssd.jpl.nasa.gov/api/horizons.api",
  references: [
    "https://ssd.jpl.nasa.gov/horizons/manual.html",
    "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
  ],
  request: {
    format: "json",
    command: "body-specific Horizons IDs listed per row",
    objData: "NO",
    makeEphem: "YES",
    ephemType: "VECTORS",
    center: "500@399",
    tlist: "2446755.1708333334",
    tlistType: "JD",
    timeType: "UT",
    referencePlane: "ECLIPTIC",
    referenceSystem: "ICRF",
    vectorCorrection: "NONE",
    outputUnits: "AU-D",
    vectorTable: "1",
  },
  response: {
    ephemeris: "DE441",
    centerBody: "Earth (399)",
    centerSite: "BODY CENTER",
    outputType: "GEOMETRIC cartesian states",
    referenceFrame: "Ecliptic of J2000.0",
    fixtureTimeUtc: "1986-11-20T16:06:00.000Z",
  },
  spicaFixedTransform: {
    formula: "normalize(degrees(atan2(Y, X)) + rotationDeg)",
    rotationDeg: 336.15864219165223,
    latitudeFormula: "degrees(atan2(Z, hypot(X, Y)))",
  },
  bodies: [
    { name: "Sun", horizonsCommand: "10", swissPlanetId: 0, vectorAu: [-0.5202051224941779, -0.8399348149423712, -0.00002190251562010969], longitudeDeg: 214.387057895, latitudeDeg: -0.001270190 },
    { name: "Moon", horizonsCommand: "301", swissPlanetId: 1, vectorAu: [-0.0006391984620080282, 0.002624819403410957, 0.0002424542450346608], longitudeDeg: 79.844969860, latitudeDeg: 5.128390011 },
    { name: "Mercury", horizonsCommand: "199", swissPlanetId: 2, vectorAu: [-0.5610012767571501, -0.5331634292878825, 0.02877880731378158], longitudeDeg: 199.701231667, latitudeDeg: 2.129546653 },
    { name: "Venus", horizonsCommand: "299", swissPlanetId: 3, vectorAu: [-0.2426727713279303, -0.1743279773416439, -0.006970720708452859], longitudeDeg: 191.850840814, latitudeDeg: -1.336422201 },
    { name: "Mars", horizonsCommand: "499", swissPlanetId: 4, vectorAu: [0.8557443583946454, -0.565524976842121, -0.02813152541583428], longitudeDeg: 302.699625770, latitudeDeg: -1.570995934 },
    { name: "Jupiter", horizonsCommand: "599", swissPlanetId: 5, vectorAu: [4.423383282863394, -1.317708759837825, -0.1087624380078481], longitudeDeg: 319.570051704, latitudeDeg: -1.349907832 },
    { name: "Saturn", horizonsCommand: "699", swissPlanetId: 6, vectorAu: [-3.617166007142385, -10.3557313422392, 0.2890555400873244], longitudeDeg: 226.904782365, latitudeDeg: 1.509473142 },
    { name: "Uranus", horizonsCommand: "799", swissPlanetId: 7, vectorAu: [-3.03201436198998, -19.85098916436777, -0.03797324857740344], longitudeDeg: 237.474475312, latitudeDeg: -0.108345293 },
    { name: "Neptune", horizonsCommand: "899", swissPlanetId: 8, vectorAu: [2.373106588641803, -30.93660739589079, 0.5530171234223911], longitudeDeg: 250.545136067, latitudeDeg: 1.021100633 },
    { name: "Pluto", horizonsCommand: "999", swissPlanetId: 9, vectorAu: [-23.08573896270299, -18.23799369005177, 8.389392667550826], longitudeDeg: 194.467774938, latitudeDeg: 15.915660524 },
  ],
} as const;
