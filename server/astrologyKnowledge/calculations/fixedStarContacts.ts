import { normalizeLongitude } from "../../../shared/hybrid";
import { FIXED_STAR_CANON_RECORDS } from "../canon/fixedStarsAndLots";

/** Angular separations are mathematical engine evidence, not Canon knowledge. */
export function findFixedStarContactsForLongitude(
  longitude: number
): Array<{ star: FixedStarCanonRecord; orbDeg: number }> {
  const L = normalizeLongitude(longitude);
  const contacts: Array<{ star: FixedStarCanonRecord; orbDeg: number }> = [];
  for (const star of FIXED_STAR_CANON_RECORDS) {
    const raw = Math.abs(L - normalizeLongitude(star.firmamentLockedLongitude));
    const dist = Number(Math.min(raw, 360 - raw).toFixed(2));
    const maxOrb = star.isRoyalStar ? 5.0 : 2.0;
    if (dist <= maxOrb) {
      contacts.push({ star, orbDeg: dist });
    }
  }
  return contacts.sort((a, b) => a.orbDeg - b.orbDeg);
}
