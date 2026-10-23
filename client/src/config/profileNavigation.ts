/** One canonical route map for the post-profile mobile experience. */
export const PROFILE_TABS = [
  { href: "/", label: "Home", section: "home" },
  { href: "/chart", label: "Chart", section: "chart" },
  { href: "/reading", label: "Reading", section: "reading" },
  { href: "/guide", label: "Guide", section: "guide" },
] as const;

export type ProfileSection = (typeof PROFILE_TABS)[number]["section"];

export function isProfileRoute(path: string): boolean {
  return PROFILE_TABS.some(tab => tab.href === path);
}
