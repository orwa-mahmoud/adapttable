import type { TableDensity } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
function element<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing density target: ${selector}`);
  return node;
}
function fixture(mobile: boolean, dir: "ltr" | "rtl", accept: boolean) {
  const density = shallowRef<TableDensity>("comfortable");
  const enabled = shallowRef(true);
  const acceptRequests = shallowRef(accept);
  const changed = vi.fn((value: TableDensity) => {
    if (acceptRequests.value) density.value = value;
  });
  const root = document.createElement("div");
  document.body.append(root);
  const labels = resolveLabels({
    density: "Spacing",
    densityComfortable: "Roomy",
    densityCompact: "Dense",
  });
  const app = createApp({
    render: () =>
      h(DataTable<{ id: string; name: string }>, {
        data: [{ id: "ada", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: mobile,
        density: density.value,
        onDensityChange: changed,
        dir,
        labels,
        features: enabled.value ? [densityChooser()] : [],
      }),
  }).use(ui);
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  const group = () => element(root, '[data-adapttable-part="density-toggle"]');
  const radios = () =>
    Array.from(
      group().querySelectorAll<HTMLButtonElement>('button[role="radio"]')
    );
  return { root, group, radios, density, changed, enabled, acceptRequests };
}

it.each([false, true])(
  "keeps two visible native options and controlled selection (mobile=%s)",
  async (mobile) => {
    const f = fixture(mobile, "ltr", true);
    await settle();
    const group = f.group();
    const [comfortable, compact] = f.radios();
    expect(group.getAttribute("role")).toBe("radiogroup");
    expect(group.getAttribute("aria-label")).toBe("Spacing");
    expect(group.getAttribute("aria-orientation")).toBe("horizontal");
    expect(f.radios()).toHaveLength(2);
    expect(group.textContent).toContain("Roomy");
    expect(group.textContent).toContain("Dense");
    expect(group.querySelector('[role="combobox"]')).toBeNull();
    expect(group.querySelector('[role="tab"]')).toBeNull();
    expect(group.querySelectorAll('[data-slot="item"]')).toHaveLength(2);
    for (const option of group.querySelectorAll('[data-slot="item"]')) {
      expect(option.tagName).toBe("LABEL");
      expect(option.classList.contains("min-h-11")).toBe(true);
      expect(option.textContent?.trim()).not.toBe("");
    }
    expect(comfortable?.getAttribute("aria-checked")).toBe("true");
    compact!.focus();
    compact!.click();
    await settle();
    expect(f.changed).toHaveBeenCalledExactlyOnceWith("compact");
    expect(compact?.getAttribute("aria-checked")).toBe("true");
    expect(comfortable?.getAttribute("aria-checked")).toBe("false");
    expect(f.group()).toBe(group);
    expect(f.radios()[1]).toBe(compact);
    expect(document.activeElement).toBe(compact);
    expect(
      element(f.root, '[data-adapttable-part="root"]').dataset.density
    ).toBe("compact");
    if (!mobile)
      expect(
        element(f.root, '[data-adapttable-part="rows-per-page"]').getAttribute(
          "role"
        )
      ).toBe("combobox");
    f.enabled.value = false;
    await settle();
    expect(
      f.root.querySelector('[data-adapttable-part="density-toggle"]')
    ).toBeNull();
  }
);

it("preserves the selected value and focused native node when the host rejects a change", async () => {
  const f = fixture(false, "ltr", false);
  await settle();
  const [comfortable, compact] = f.radios();
  compact!.focus();
  compact!.click();
  await settle();
  expect(f.changed).toHaveBeenCalledExactlyOnceWith("compact");
  expect(comfortable?.getAttribute("aria-checked")).toBe("true");
  expect(compact?.getAttribute("aria-checked")).toBe("false");
  expect(document.activeElement).toBe(compact);
  expect(f.radios()[1]).toBe(compact);
  expect(f.density.value).toBe("comfortable");
  f.acceptRequests.value = true;
  compact!.click();
  await settle();
  expect(f.changed).toHaveBeenCalledTimes(2);
  expect(compact?.getAttribute("aria-checked")).toBe("true");
});

it.each(["ltr", "rtl"] as const)(
  "uses native arrow-key selection and focus in %s",
  async (dir) => {
    const f = fixture(false, dir, true);
    await settle();
    const [comfortable, compact] = f.radios();
    comfortable!.focus();
    comfortable!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: dir === "rtl" ? "ArrowLeft" : "ArrowRight",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(document.activeElement).toBe(compact);
    expect(f.changed).toHaveBeenCalledExactlyOnceWith("compact");
    expect(compact?.getAttribute("aria-checked")).toBe("true");
    compact!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: dir === "rtl" ? "ArrowRight" : "ArrowLeft",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(document.activeElement).toBe(comfortable);
    expect(f.changed).toHaveBeenLastCalledWith("comfortable");
    expect(f.changed).toHaveBeenCalledTimes(2);
  }
);
