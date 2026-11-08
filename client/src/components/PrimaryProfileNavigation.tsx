import { Link, useLocation } from "wouter";
import { BookOpen, Diamond, House, MessageCircleQuestion, Zap } from "lucide-react";
import { PRIMARY_NAV_ITEMS, primaryDestinationForPath } from "@/config/profileNavigation";

const icons = { House, Diamond, Zap, BookOpen, MessageCircleQuestion };

export function PrimaryProfileNavigation() {
  const [path] = useLocation();
  const active = primaryDestinationForPath(path);
  return (
    <nav aria-label="Mobile bottom navigation dock" className="fg-thumb-dock">
      {PRIMARY_NAV_ITEMS.map(item => {
        const Icon = icons[item.icon];
        return (
          <Link key={item.href} href={item.href} aria-current={active === item.href ? "page" : undefined} className="fg-thumb-destination">
            <span className="fg-thumb-icon"><Icon size={22} strokeWidth={active === item.href ? 2.2 : 1.7} aria-hidden="true" /></span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
