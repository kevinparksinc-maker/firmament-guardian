const marker = "absoluteOverlay";
type OverlayEntry = { id: number; url: string; dismiss: () => void; popped: boolean };

/** Same-URL entries let browser/Android Back dismiss the top overlay first. */
export function createOverlayHistory(target: Pick<Window, "history" | "location" | "addEventListener" | "removeEventListener">) {
  let sequence = 0;
  const entries: OverlayEntry[] = [];
  const onPop = () => {
    const entry = entries.at(-1);
    if (!entry || target.history.state?.[marker] === entry.id) return;
    entries.pop();
    entry.popped = true;
    entry.dismiss();
  };
  return {
    register(dismiss: () => void) {
      const entry: OverlayEntry = { id: ++sequence, url: target.location.href, dismiss, popped: false };
      if (!entries.length) target.addEventListener("popstate", onPop);
      target.history.pushState({ ...target.history.state, [marker]: entry.id }, "", entry.url);
      entries.push(entry);
      return () => {
        const index = entries.indexOf(entry);
        if (index >= 0) entries.splice(index, 1);
        // A route link may already have replaced/pushed the destination. Never
        // undo that navigation when the old overlay unmounts.
        if (!entry.popped && target.location.href === entry.url && target.history.state?.[marker] === entry.id)
          target.history.back();
        if (!entries.length) target.removeEventListener("popstate", onPop);
      };
    },
  };
}
