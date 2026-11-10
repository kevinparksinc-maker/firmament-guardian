/** One canonical route map for the primary navigation destinations. */
export const PROFILE_TABS = [
  { href: "/", label: "Home", section: "home", icon: "House" },
  { href: "/chart", label: "Chart", section: "chart", icon: "Orbit" },
  { href: "/energy", label: "Energy", section: "energy", icon: "Zap" },
  { href: "/reading", label: "Readings", section: "reading", icon: "BookOpen" },
  { href: "/explore", label: "Explore", section: "explore", icon: "LayoutGrid" },
] as const;

export type ProfileSection = (typeof PROFILE_TABS)[number]["section"] | "guide" | "profile";

export function isProfileRoute(path: string): boolean {
  return PROFILE_TABS.some(tab => tab.href === path) || path === "/guide" || path === "/profile";
}


/** Shared desktop and thumb navigation. Explore stays in the header directory. */
export const PRIMARY_NAV_ITEMS = [
  { href: "/", label: "Home", icon: "House" },
  { href: "/chart", label: "Chart", icon: "Diamond" },
  { href: "/energy", label: "Energy", icon: "Zap" },
  { href: "/horary", label: "Horary", icon: "MessageCircleQuestion" },
  { href: "/reading", label: "Readings", icon: "BookOpen" },
] as const;

export function primaryDestinationForPath(path: string): string | undefined {
  if (path === "/") return "/";
  if (path === "/chart") return "/chart";
  if (path.startsWith("/energy") || path === "/forecast" || path === "/transit-sky") return "/energy";
  if (path === "/horary" || path === "/zodiac-readings") return "/horary";
  if (path.startsWith("/reading") || path === "/life-story" || path === "/guide") return "/reading";
  return undefined;
}
