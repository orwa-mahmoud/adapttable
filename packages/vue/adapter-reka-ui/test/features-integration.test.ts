import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { filters } from "../src/filters";
import { grouping } from "../src/grouping";

interface Row {
  id: string;
  name: string;
  team: string;
}
const data: Row[] = [
  { id: "a", name: "Ada", team: "Engineering" },
  { id: "b", name: "Bea", team: "Design" },
];
const defaults: DataTableProps<Row> = {
  data,
  columns: [{ key: "name", sortable: true }, { key: "team" }],
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
  searchDebounceMs: 0,
};
const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((run) => run());
  document.body.replaceChildren();
});
function mount(props: Partial<DataTableProps<Row>>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () => h(DataTable<Row>, { ...defaults, ...props }),
  });
  app.mount(host);
  cleanup.push(() => app.unmount());
  return host;
}
function target<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 10));
  await nextTick();
}

describe("Reka feature fills", () => {
  it("renders group rows using the shared lazy group slot and real selection controls", async () => {
    const host = mount({ features: [grouping("team")], selectable: true });
    await flush();
    expect(host.textContent).toContain("Engineering");
    const toggle = target<HTMLButtonElement>(host, part("group-toggle"));
    expect(toggle.classList.contains("at-reka-button")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const select = target<HTMLElement>(host, part("group-select"));
    expect(select.getAttribute("role")).toBe("checkbox");
    toggle.click();
    await flush();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("renders a non-modal Reka filter portal and restores the real trigger on Escape", async () => {
    const host = mount({
      features: [filters<Row>([{ key: "name", type: "text", label: "Name" }])],
    });
    const trigger = target<HTMLButtonElement>(host, part("filters-button"));
    trigger.focus();
    trigger.click();
    await flush();
    const popover = target<HTMLElement>(document, part("filters-popover"));
    expect(host.contains(popover)).toBe(false);
    expect(popover.getAttribute("role")).toBe("dialog");
    expect(document.querySelector(part("filters-backdrop"))).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    target<HTMLElement>(popover, "input").dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await flush();
    expect(document.querySelector(part("filters-popover"))).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("uses a real Dialog overlay for the drawer and closes with its Done control", async () => {
    const host = mount({
      features: [
        filters<Row>([{ key: "name", type: "text", label: "Name" }], {
          mode: "drawer",
        }),
      ],
    });
    const trigger = target<HTMLButtonElement>(host, part("filters-button"));
    trigger.click();
    await flush();
    expect(document.querySelector(part("filters-backdrop"))).not.toBeNull();
    const panel = target<HTMLElement>(document, part("filters-panel"));
    expect(panel.getAttribute("role")).toBe("dialog");
    target<HTMLButtonElement>(panel, part("filters-done")).click();
    await flush();
    expect(document.querySelector(part("filters-panel"))).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
