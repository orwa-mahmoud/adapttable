import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, effectScope, h } from "vue";

import { useInstanceId } from "./componentId";

describe("useInstanceId", () => {
  it("uses the component id inside setup", () => {
    let id = "";
    const app = createApp(
      defineComponent({
        setup() {
          id = useInstanceId(() => "fallback");
          return () => h("span");
        },
      })
    );
    const host = document.createElement("div");
    app.mount(host);
    expect(id.startsWith("v-")).toBe(true);
    expect(id).not.toBe("fallback");
    app.unmount();
  });

  it("uses the fallback outside a component", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      return undefined;
    });
    const scope = effectScope();
    const id = scope.run(() => useInstanceId(() => "scope-1"));
    expect(id).toBe("scope-1");
    scope.stop();
    warn.mockRestore();
  });
});
