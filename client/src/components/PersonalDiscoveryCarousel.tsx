import type { ChartResult } from "../../../server/astronomy";
import { InfiniteDiscoveryEngine } from "./InfiniteDiscoveryEngine";

interface PersonalDiscoveryCarouselProps {
  chart: ChartResult;
  compact?: boolean;
  onSelectDrawer?: (drawerOrderOrId: number | string) => void;
}

/**
 * PersonalDiscoveryCarousel is powered by the comprehensive InfiniteDiscoveryEngine.
 * Eliminates all placeholder text and provides multi-tradition, evidence-backed
 * WHAT, WHY, HOW, CONSEQUENCE, and MEANING insights for every placement.
 */
export function PersonalDiscoveryCarousel({
  chart,
  compact = false,
  onSelectDrawer,
}: PersonalDiscoveryCarouselProps) {
  return (
    <InfiniteDiscoveryEngine
      chart={chart}
      compact={compact}
      onSelectDrawer={onSelectDrawer}
    />
  );
}