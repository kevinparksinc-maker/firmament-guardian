import { useEffect, useState } from "react";

export type GuideTab = "blueprint" | "synastry" | "weather" | "podcast" | "social";

function readGuideTab(): GuideTab {
  const tab = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("tab");
  return tab === "synastry" || tab === "weather" || tab === "podcast" || tab === "social" ? tab : "blueprint";
}

export function useGuideTab() {
  const [mainTab, setMainTab] = useState<GuideTab>(readGuideTab);
  useEffect(() => {
    const onSelect = (event: Event) => {
      const tab = (event as CustomEvent<{ tab: GuideTab }>).detail?.tab;
      if (["blueprint","synastry","weather","podcast","social"].includes(tab)) setMainTab(tab);
    };
    window.addEventListener("fg:select-tab", onSelect);
    return () => window.removeEventListener("fg:select-tab", onSelect);
  }, []);
  return [mainTab, setMainTab] as const;
}
