type LocatedProfile = {
  location: string; latitude: number; longitude: number; timezone: string;
  transitLocation?: string; transitLatitude?: number; transitLongitude?: number; transitTimezone?: string;
};
const cities = [
  { names: ["dallas, texas, usa", "dallas, tx", "dallas, texas, united states"], latitude: 32.7767, longitude: -96.797, timezone: "America/Chicago" },
  { names: ["las vegas, nevada, usa", "las vegas, nv", "las vegas, nevada, united states"], latitude: 36.1699, longitude: -115.1398, timezone: "America/Los_Angeles" },
];
/** Repair known legacy city/coordinate mismatches; retain valid local GPS coordinates. */
export function repairProfileLocations<T extends LocatedProfile>(profile: T): T {
  let next = profile;
  for (const transit of [false, true]) {
    const label = transit ? profile.transitLocation : profile.location;
    const city = cities.find(city => city.names.includes(label?.trim().toLowerCase() || ""));
    if (!city) continue;
    const lat = transit ? profile.transitLatitude : profile.latitude;
    const lon = transit ? profile.transitLongitude : profile.longitude;
    const timezone = transit ? profile.transitTimezone : profile.timezone;
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat! - city.latitude) < 1 && Math.abs(lon! - city.longitude) < 1 && timezone === city.timezone) continue;
    next = transit ? { ...next, transitLatitude: city.latitude, transitLongitude: city.longitude, transitTimezone: city.timezone }
      : { ...next, latitude: city.latitude, longitude: city.longitude, timezone: city.timezone };
  }
  return next;
}
