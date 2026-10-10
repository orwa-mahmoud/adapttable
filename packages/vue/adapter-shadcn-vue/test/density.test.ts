import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref } from "vue";

import { shadcnDensityControl } from "../src/controls";

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

describe("visible shadcn density choices", () => {
  it.each(["ltr", "rtl"] as const)(
    "keeps both native radio choices labelled and controlled (%s)",
    async (dir) => {
      const value = ref<"comfortable" | "compact">("comfortable");
      const change = vi.fn();
      const root = document.createElement("div");
      document.body.append(root);
      const app = createApp({
        render: () =>
          h("div", [
            shadcnDensityControl({
              attrs: {
                "aria-label": "Density",
                "data-adapttable-part": "density-toggle",
                class: "density-hook",
                dir,
              },
              value: value.value,
              options: [
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ],
              onChange: change,
            }),
          ]),
      });
      app.mount(root);
      cleanups.push(() => {
        app.unmount();
        root.remove();
      });
      const group = root.querySelector('[role="radiogroup"]');
      expect(group?.getAttribute("aria-label")).toBe("Density");
      expect(group?.getAttribute("dir")).toBe(dir);
      expect(group?.classList.contains("density-hook")).toBe(true);
      expect(group?.getAttribute("data-adapttable-part")).toBe(
        "density-toggle"
      );
      const radios = Array.from(
        root.querySelectorAll<HTMLButtonElement>('button[role="radio"]')
      );
      expect(radios.map((radio) => radio.textContent)).toEqual([
        "Comfortable",
        "Compact",
      ]);
      expect(radios.map((radio) => radio.dataset.slot)).toEqual([
        "button",
        "button",
      ]);
      const comfortable = radios[0];
      const compact = radios[1];
      if (!comfortable || !compact) throw new Error("Missing density choices");
      expect(comfortable.getAttribute("aria-checked")).toBe("true");
      expect(compact.getAttribute("aria-checked")).toBe("false");
      compact.focus();
      compact.click();
      await nextTick();
      expect(change).toHaveBeenCalledExactlyOnceWith("compact");
      expect(comfortable.getAttribute("aria-checked")).toBe("true");
      expect(compact.getAttribute("aria-checked")).toBe("false");
      value.value = "compact";
      await nextTick();
      expect(compact.getAttribute("aria-checked")).toBe("true");
      expect(compact.getAttribute("data-state")).toBe("checked");
      expect(document.activeElement).toBe(compact);
      compact.click();
      await nextTick();
      expect(change).toHaveBeenCalledOnce();
      expect(compact.getAttribute("aria-checked")).toBe("true");
      comfortable.click();
      await nextTick();
      expect(change).toHaveBeenLastCalledWith("comfortable");
      value.value = "comfortable";
      await nextTick();
      expect(comfortable.getAttribute("aria-checked")).toBe("true");
      expect(compact.getAttribute("aria-checked")).toBe("false");
      expect(root.querySelector("select")).toBeNull();
      change.mockClear();
      comfortable.focus();
      // Settle Reka's deferred pointer-focus handling before the next key event.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      comfortable.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: dir === "rtl" ? "ArrowLeft" : "ArrowRight",
          bubbles: true,
        })
      );
      await vi.waitFor(() => {
        expect(document.activeElement).toBe(compact);
        expect(change).toHaveBeenCalledExactlyOnceWith("compact");
      });
      compact.dispatchEvent(
        new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true })
      );
    }
  );
});
