import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";

import { type ColumnDef, DataTable, type DataTableProps } from "../src";
import { groupingPanel } from "../src/grouping-panel";
import { rowReorder } from "../src/row-reorder";

const rows = [
  { id: "a", team: "Core", amount: 4 },
  { id: "b", team: "Ops", amount: 8 },
  { id: "c", team: "Core", amount: 6 },
];
type Row = (typeof rows)[number];
const columns: readonly ColumnDef<Row>[] = [
  { key: "team", header: "Team", groupable: true },
  { key: "amount", header: "Amount", aggregatable: true },
];
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) {
    stop();
  }
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
}
function mount(extra: Partial<DataTableProps<Row>>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: rows,
        columns,
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        ...extra,
      }),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
async function choose(trigger: HTMLElement, label: string) {
  if (!(trigger instanceof HTMLSelectElement))
    throw new Error("Expected NativeSelect target");
  const option = [...trigger.options].find(
    (item) => item.textContent === label
  );
  if (!option) throw new Error(`Missing option ${label}`);
  trigger.value = option.value;
  trigger.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
}
it("groups through shadcn NativeSelect and Checkbox controls, and removes an aggregate without changing host rows", async () => {
  const host = mount({
    features: [groupingPanel<Row>()],
    classNames: {
      groupingChipHandle: "consumer-grip",
      groupingAggregationAdd: "consumer-aggregates",
    },
  });
  await flush();
  await choose(element(part("grouping-add")), "Team");
  expect(host.querySelectorAll(part("group-row"))).toHaveLength(2);
  const chip = element(part("grouping-chip-handle"));
  expect(chip.tagName).toBe("BUTTON");
  expect(chip.classList.contains("consumer-grip")).toBe(true);
  const checkbox = element<HTMLButtonElement>(
    `${part("grouping-aggregation-add")} [role="checkbox"]`
  );
  expect(checkbox.tagName).toBe("BUTTON");
  checkbox.click();
  await flush();
  expect(
    document.querySelector(part("grouping-aggregation-operation"))
  ).not.toBeNull();
  element<HTMLButtonElement>(part("grouping-aggregation-remove")).click();
  await flush();
  expect(
    document.querySelector(part("grouping-aggregation-operation"))
  ).toBeNull();
  element<HTMLButtonElement>(part("grouping-chip-remove")).click();
  await flush();
  expect(host.querySelector(part("grouping-chip"))).toBeNull();
  expect(rows.map((row) => row.amount)).toEqual([4, 8, 6]);
});
it("preserves logical RTL grouping keyboard controls and native reorder request semantics on desktop/mobile", async () => {
  mount({ dir: "rtl", features: [groupingPanel<Row>(["team", "amount"])] });
  await flush();
  await key(element(part("grouping-chip-handle")), "ArrowLeft");
  expect(element(part("grouping-chip")).textContent).toContain("Amount");
  stops.pop()?.();
  document.body.replaceChildren();
  const moved = vi.fn();
  mount({
    features: [rowReorder<Row>(moved)],
    classNames: { rowReorderHandle: "consumer-reorder" },
  });
  await flush();
  const grip = element<HTMLButtonElement>(part("row-reorder-handle"));
  expect(grip.classList.contains("consumer-reorder")).toBe(true);
  grip.focus();
  await key(grip, " ");
  expect(grip.getAttribute("aria-pressed")).toBe("true");
  await key(grip, "ArrowDown");
  await key(grip, " ");
  expect(moved).toHaveBeenCalledWith(0, 1, rows[0]);
  expect(rows[0]?.id).toBe("a");
  stops.pop()?.();
  document.body.replaceChildren();
  moved.mockClear();
  mount({ forceMobile: true, features: [rowReorder<Row>(moved)] });
  await flush();
  const up = element<HTMLButtonElement>(part("row-reorder-up"));
  expect(up.disabled).toBe(true);
  element<HTMLButtonElement>(part("row-reorder-down")).click();
  await flush();
  expect(moved).toHaveBeenCalledWith(0, 1, rows[0]);
});
it("opens a genuine destination menu and AlertDialog, cancels or confirms only the binding-owned move", async () => {
  const moved = vi.fn();
  mount({
    dir: "rtl",
    features: [
      groupingPanel<Row>("team"),
      rowReorder<Row>(() => undefined, {
        movePolicy: "confirm",
        onGroupMove: moved,
      }),
    ],
  });
  await flush();
  const trigger = element<HTMLButtonElement>(
    `[data-row-id="a"] ${part("row-move-menu-trigger")}`
  );
  const request = async () => {
    trigger.focus();
    trigger.click();
    await flush();
    const item = [
      ...document.querySelectorAll<HTMLElement>(part("row-move-menu-item")),
    ].find((node) => node.getAttribute("aria-disabled") !== "true");
    if (!item) throw new Error("Missing destination");
    item.focus();
    await key(item, "Enter");
  };
  await request();
  const dialog = element(part("row-move-confirmation"));
  expect(dialog.getAttribute("role")).toBe("alertdialog");
  expect(dialog.getAttribute("dir")).toBe("rtl");
  expect(document.activeElement).toBe(element(part("row-move-cancel")));
  element<HTMLButtonElement>(part("row-move-cancel")).click();
  await flush();
  expect(moved).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(trigger);
  await request();
  element<HTMLButtonElement>(part("row-move-confirm")).click();
  await flush();
  expect(moved).toHaveBeenCalledTimes(1);
  expect(document.querySelector(part("row-move-confirmation"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(rows[0]?.team).toBe("Core");
});
