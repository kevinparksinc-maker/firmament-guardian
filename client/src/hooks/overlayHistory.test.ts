import { describe, expect, it, vi } from "vitest";
import { createOverlayHistory } from "./overlayHistory";

function fixture() {
  const events = new EventTarget();
  const pages: Array<{ url: string; state: Record<string, unknown> | null }> = [{ url: "https://example.test/chart", state: { preserved: true } }];
  let index = 0;
  const history = {
    get state() { return pages[index].state; },
    pushState(state: Record<string, unknown>, _: string, url: string) { pages.splice(++index); pages.push({ state, url }); },
    replaceState(state: Record<string, unknown> | null, _: string, url: string) { pages[index] = { state, url }; },
    back: vi.fn(() => { if (index > 0) { index--; events.dispatchEvent(new Event("popstate")); } }),
  };
  const target = {
    history,
    location: { get href() { return pages[index].url; } },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  return { manager: createOverlayHistory(target as unknown as Window), history, target };
}

describe("overlay Back history", () => {
  it("closes the top overlay without leaving the chart or erasing existing state", () => {
    const { manager, history, target } = fixture();
    const close = vi.fn();
    const release = manager.register(close);
    expect(history.state?.preserved).toBe(true);
    history.back();
    expect(close).toHaveBeenCalledTimes(1);
    expect(target.location.href).toBe("https://example.test/chart");
    release();
    expect(history.back).toHaveBeenCalledTimes(1);
  });
  it("handles nested overlays one at a time", () => {
    const { manager, history } = fixture();
    const first = vi.fn(), second = vi.fn();
    const releaseFirst = manager.register(first), releaseSecond = manager.register(second);
    history.back();
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
    releaseSecond();
    history.back();
    expect(first).toHaveBeenCalledOnce();
    releaseFirst();
  });
  it("removes the extra history entry when closed with the close button", () => {
    const { manager, history } = fixture();
    const close = vi.fn();
    manager.register(close)();
    expect(history.back).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    expect(history.state).toEqual({ preserved: true });
  });
  it("keeps navigation selected inside a drawer and returns to the original page on Back", () => {
    const { manager, history, target } = fixture();
    const release = manager.register(vi.fn());
    history.replaceState(null, "", "https://example.test/horary");
    release();
    expect(history.back).not.toHaveBeenCalled();
    expect(target.location.href).toBe("https://example.test/horary");
    history.back();
    expect(target.location.href).toBe("https://example.test/chart");
  });
  it("does not issue Back if React cleans up the drawer before the router commits its URL", () => {
    const { manager, history, target } = fixture();
    const release = manager.register(vi.fn());
    manager.prepareNavigation();
    release();
    expect(history.back).not.toHaveBeenCalled();
    history.replaceState(null, "", "https://example.test/horary");
    expect(target.location.href).toBe("https://example.test/horary");
    history.back();
    expect(target.location.href).toBe("https://example.test/chart");
  });
});
