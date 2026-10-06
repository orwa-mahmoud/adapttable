import type { TableDensity } from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick, ref } from "vue";

import DataTable from "../src/DataTable.vue";
import { densityChooser } from "../src/density";
import { fullscreen } from "../src/fullscreen";
import { mount, node } from "./mount";

const data = [{ id: "a", name: "Ada" }];
type Row = (typeof data)[number];
const columns = [{ key: "name", header: "Name" }] as const;
const base = {
  data,
  columns,
  rowKey: (row: (typeof data)[number]) => row.id,
  urlSync: false,
  forceMobile: false,
  searchable: false,
};
const restorePlatform: (() => void)[] = [];
afterEach(() =>
  restorePlatform
    .splice(0)
    .reverse()
    .forEach((restore) => restore())
);
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
async function choose(root: ParentNode, label: string) {
  node<HTMLInputElement>(
    root,
    '[data-adapttable-part="density-toggle"] input[role="combobox"]'
  ).click();
  await tick();
  const option = [
    ...root.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent?.trim() === label);
  if (!option) throw new Error(`Missing density option ${label}`);
  option.click();
  await tick();
}
function platformProperty(
  target: object,
  key: string,
  descriptor: PropertyDescriptor
) {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { ...descriptor, configurable: true });
  restorePlatform.push(() => {
    if (original) Object.defineProperty(target, key, original);
    else Reflect.deleteProperty(target, key);
  });
}

describe("Element Plus optional view controls", () => {
  it("adds only the requested real kit density control and removes its fill reactively", async () => {
    const enabled = ref(false);
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: enabled.value ? [densityChooser()] : [],
        dir: "rtl",
        classNames: { densitySelect: "host-density" },
        labels: { density: "Density choice" },
      })
    );
    await tick();
    expect(
      root.querySelector('[data-adapttable-part="density-toggle"]')
    ).toBeNull();
    enabled.value = true;
    await tick();
    const control = node(root, '[data-adapttable-part="density-toggle"]');
    expect(control.classList.contains("el-select")).toBe(true);
    expect(control.classList.contains("host-density")).toBe(true);
    expect(control.getAttribute("dir")).toBe("rtl");
    expect(node(root, 'input[aria-label="Density choice"]')).not.toBeNull();
    enabled.value = false;
    await tick();
    expect(
      root.querySelector('[data-adapttable-part="density-toggle"]')
    ).toBeNull();
  });

  it("keeps controlled density authoritative and requests exactly one observer and model update", async () => {
    const density = ref<TableDensity>("comfortable");
    const observer = vi.fn();
    const update = vi.fn();
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        density: density.value,
        features: [densityChooser()],
        onDensityChange: observer,
        "onUpdate:density": update,
        labels: {
          densityCompact: "Compact",
          densityComfortable: "Comfortable",
        },
      })
    );
    await tick();
    await choose(root, "Compact");
    expect(observer).toHaveBeenCalledExactlyOnceWith("compact");
    expect(update).toHaveBeenCalledExactlyOnceWith("compact");
    expect(
      node(root, '[data-adapttable-part="root"]').getAttribute("data-density")
    ).toBe("comfortable");
    density.value = "compact";
    await tick();
    expect(
      node(root, '[data-adapttable-part="root"]').getAttribute("data-density")
    ).toBe("compact");
    expect(observer).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("forwards the real button activation to the binding-owned fullscreen root", async () => {
    let current: Element | null = null;
    const request = vi.fn(function (this: HTMLElement) {
      current = this;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    const exit = vi.fn(() => {
      current = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    platformProperty(document, "fullscreenEnabled", { value: true });
    platformProperty(document, "fullscreenElement", { get: () => current });
    platformProperty(document, "exitFullscreen", { value: exit });
    platformProperty(HTMLElement.prototype, "requestFullscreen", {
      value: request,
    });
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: [fullscreen()],
        classNames: { fullscreenButton: "host-fullscreen" },
        labels: {
          enterFullscreen: "Expand table",
          exitFullscreen: "Restore table",
        },
      })
    );
    await tick();
    const button = node<HTMLButtonElement>(
      root,
      'button[data-adapttable-part="fullscreen-toggle"]'
    );
    expect(button.classList.contains("el-button")).toBe(true);
    expect(button.classList.contains("host-fullscreen")).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    button.click();
    await tick();
    expect(request).toHaveBeenCalledTimes(1);
    expect(current).toBe(node(root, '[data-adapttable-part="root"]'));
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Restore table");
    button.click();
    await tick();
    expect(exit).toHaveBeenCalledTimes(1);
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("does not render fullscreen on an unsupported platform", async () => {
    platformProperty(document, "fullscreenEnabled", { value: false });
    const { root } = mount(() =>
      h(DataTable<Row>, { ...base, features: [fullscreen()] })
    );
    await tick();
    expect(
      root.querySelector('[data-adapttable-part="fullscreen-toggle"]')
    ).toBeNull();
  });
});
