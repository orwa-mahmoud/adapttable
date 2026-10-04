import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";

import { useScopeActivity } from "../store";
import { useSourceMode } from "./sourceLifecycle";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("source lifecycle", () => {
  it("replaces viewport listeners before attaching the new breakpoint", () => {
    const events: string[] = [];
    const listeners = new Map<string, () => void>();
    const matches = new Map<string, boolean>();
    const matchMedia = vi.fn((query: string): MediaQueryList => ({
      media: query,
      get matches() {
        return matches.get(query) ?? false;
      },
      onchange: null,
      addEventListener: (
        _type: string,
        listener: EventListenerOrEventListenerObject
      ) => {
        if (typeof listener !== "function")
          throw new Error("expected listener");
        events.push(`start ${query}`);
        listeners.set(query, () =>
          listener.call(
            {} as MediaQueryList,
            new Event("change") as MediaQueryListEvent
          )
        );
      },
      removeEventListener: () => {
        events.push(`stop ${query}`);
        listeners.delete(query);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    }));
    vi.stubGlobal("matchMedia", matchMedia);
    const scope = effectScope();
    const breakpoint = shallowRef(600);
    const forced = shallowRef<boolean>();
    const mode = scope.run(() =>
      useSourceMode({ mobileBreakpoint: breakpoint, forceMobile: forced })
    );
    expect(mode?.value).toBe("paged");
    matches.set("(max-width: 600px)", true);
    listeners.get("(max-width: 600px)")?.();
    expect(mode?.value).toBe("infinite");
    forced.value = false;
    expect(mode?.value).toBe("paged");
    forced.value = undefined;
    breakpoint.value = 900;
    expect(events).toEqual([
      "start (max-width: 600px)",
      "stop (max-width: 600px)",
      "start (max-width: 600px)",
      "stop (max-width: 600px)",
      "start (max-width: 900px)",
    ]);
    scope.stop();
    expect(listeners.size).toBe(0);
    vi.unstubAllGlobals();
  });

  it("never reactivates a scope disposed before its component mounted", async () => {
    let read = () => true;
    const App = defineComponent({
      setup() {
        const scope = effectScope();
        const active = scope.run(useScopeActivity);
        read = () => active?.value ?? true;
        scope.stop();
        return () => h("p", "mounted");
      },
    });
    const app = createApp(App);
    app.mount(document.createElement("div"));
    await nextTick();
    expect(read()).toBe(false);
    app.unmount();
  });
});
