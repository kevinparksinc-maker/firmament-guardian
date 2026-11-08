import { useEffect, useRef } from "react";
import { createOverlayHistory } from "./overlayHistory";

let manager: ReturnType<typeof createOverlayHistory> | undefined;

export function useOverlayBack(open: boolean, dismiss: () => void) {
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  useEffect(() => {
    if (!open) return;
    manager ??= createOverlayHistory(window);
    return manager.register(() => dismissRef.current());
  }, [open]);
}
