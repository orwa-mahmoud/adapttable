import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { PivotPanel, type PivotPanelProps } from "../src/pivot";
import { standardFeatures } from "../src/preset";
import { SavedViewsPanel } from "../src/saved-views";
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await nextTick();
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
async function choose(target: HTMLElement, label: string) {
  if (!(target instanceof HTMLSelectElement))
    throw new Error("Expected NativeSelect");
  const option = [...target.options].find((item) => item.textContent === label);
  if (!option) throw new Error(`Missing ${label}`);
  target.value = option.value;
  target.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
}
it("moves, aggregates, and removes pivot fields through actual controls", async () => {
  const config = shallowRef<PivotPanelProps["config"]>({
    rows: ["name", "amount"],
    columns: [],
    measures: [{ key: "amount", agg: "sum" }],
  });
  const change = vi.fn((next: PivotPanelProps["config"]) => {
    config.value = next;
  });
  const host = mount(() =>
    h(PivotPanel, {
      config: config.value,
      fields: [
        { key: "name", label: "Name" },
        { key: "amount", label: "Amount" },
      ],
      onChange: change,
    })
  );
  await flush();
  const move = [
    ...host.querySelectorAll<HTMLButtonElement>('[data-zone="rows"] button'),
  ].find(
    (node) =>
      node.getAttribute("aria-label")?.startsWith("Move down") && !node.disabled
  );
  if (!move) throw new Error("Missing move down");
  move.click();
  await flush();
  expect(config.value.rows).toEqual(["amount", "name"]);
  await choose(element('[data-zone="measures"] select', host), "Average");
  expect(config.value.measures[0]?.agg).toBe("avg");
  const remove = [
    ...host.querySelectorAll<HTMLButtonElement>('[data-zone="rows"] button'),
  ].find((node) => node.getAttribute("aria-label")?.startsWith("Remove"));
  if (!remove) throw new Error("Missing remove");
  remove.click();
  await flush();
  expect(config.value.rows).toEqual(["name"]);
});
it("renders an empty saved-views panel without consumer classes", async () => {
  const host = mount(() =>
    h(SavedViewsPanel, {
      views: [],
      onApply: vi.fn(),
      onRemove: vi.fn(),
      onRename: vi.fn(),
      onMove: vi.fn(),
      onSetDefault: vi.fn(),
    })
  );
  await flush();
  expect(host.textContent?.trim()).not.toBe("");
  expect(host.querySelector(part("saved-view-row"))).toBeNull();
});

it("composes the optional standard preset without installing unrequested features", () => {
  const defaults = standardFeatures();
  expect(defaults.map((feature) => feature.id)).toContain("column-menu");
  expect(defaults.map((feature) => feature.id)).not.toContain("grouping");
  const extras = standardFeatures<{ id: string }>({
    grouping: "id",
    bulkActions: [],
    filters: [],
    savedViews: { storageKey: "preset-test" },
    findButton: true,
  });
  expect(extras.length).toBeGreaterThan(defaults.length);
});

it("adds pivot fields through controlled NativeSelects and ignores the placeholder", async () => {
  const config = shallowRef<PivotPanelProps["config"]>({
    rows: [],
    columns: [],
    measures: [],
  });
  const accept = shallowRef(false);
  const changed = vi.fn((next: PivotPanelProps["config"]) => {
    if (accept.value) config.value = next;
  });
  const host = mount(() =>
    h(PivotPanel, {
      fields: [
        { key: "name", label: "Name" },
        { key: "amount", label: "Amount" },
      ],
      config: config.value,
      onChange: changed,
    })
  );
  await flush();
  const rows = element<HTMLSelectElement>('[data-zone="rows"] select', host);
  rows.value = "";
  rows.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
  expect(changed).not.toHaveBeenCalled();
  await choose(rows, "Name");
  expect(changed).toHaveBeenCalledOnce();
  expect(config.value.rows).toEqual([]);
  expect(rows.value).toBe("");
  accept.value = true;
  await choose(rows, "Name");
  await choose(element('[data-zone="columns"] select', host), "Amount");
  await choose(element('[data-zone="measures"] select', host), "Amount");
  expect(config.value.rows).toEqual(["name"]);
  expect(config.value.columns).toEqual(["amount"]);
  expect(config.value.measures).toEqual([{ key: "amount", agg: "sum" }]);
  expect(
    host.querySelectorAll('[data-slot="native-select"]').length
  ).toBeGreaterThan(2);
});
