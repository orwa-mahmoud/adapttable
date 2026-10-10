import type { RowDragEvent } from "@adapttable/vue";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { groupingPanel } from "../src/grouping-panel";
import { rowReorder } from "../src/row-reorder";

interface Row {
  id: string;
  team: string;
  when: string;
}
const rows: Row[] = [
  { id: "a", team: "Core", when: "2026-10-07T10:00" },
  { id: "b", team: "Ops", when: "2026-10-07T11:00" },
];
const base: DataTableProps<Row> = {
  data: rows,
  columns: [{ key: "team", groupable: true }],
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
};
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
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
function transfer(): RowDragEvent["dataTransfer"] &
  Pick<DataTransfer, "types"> {
  const values = new Map<string, string>();
  return {
    get types() {
      return [...values.keys()];
    },
    effectAllowed: "all",
    dropEffect: "move",
    setData: (format, value) => {
      values.set(format, value);
    },
    getData: (format) => values.get(format) ?? "",
  };
}
async function drag(
  target: HTMLElement,
  type: string,
  dataTransfer?: RowDragEvent["dataTransfer"]
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientY: 20,
  });
  if (dataTransfer)
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  target.dispatchEvent(event);
  await flush();
  return event;
}
it("forwards real row drag events through the shadcn grip and requests a move without changing host rows", async () => {
  const move = vi.fn();
  const host = mount(() =>
    h(DataTable<Row>, { ...base, features: [rowReorder<Row>(move)] })
  );
  await flush();
  const first = element<HTMLButtonElement>(
    `[data-row-id="a"] ${part("row-reorder-handle")}`,
    host
  );
  const target = element('[data-row-id="b"]', host);
  const dataTransfer = transfer();
  await drag(first, "dragstart");
  expect(move).not.toHaveBeenCalled();
  await drag(first, "dragstart", dataTransfer);
  expect(first.hasAttribute("data-dragging")).toBe(true);
  await drag(target, "dragover", dataTransfer);
  await drag(target, "drop", dataTransfer);
  await drag(first, "dragend", dataTransfer);
  expect(move).toHaveBeenCalledWith(0, 1, rows[0]);
  expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
  expect(first.hasAttribute("data-dragging")).toBe(false);
});
it("shows the grouping removal drop target only during a real chip drag and removes that grouping", async () => {
  const host = mount(() =>
    h(DataTable<Row>, { ...base, features: [groupingPanel<Row>("team")] })
  );
  await flush();
  expect(host.querySelector(part("grouping-remove-zone"))).toBeNull();
  const grip = element(part("grouping-chip-handle"), host);
  const dataTransfer = transfer();
  await drag(grip, "dragstart", dataTransfer);
  const remove = element(part("grouping-remove-zone"), host);
  expect(remove.textContent).toContain("remove");
  await drag(remove, "dragenter", dataTransfer);
  await drag(remove, "dragover", dataTransfer);
  expect(remove.hasAttribute("data-active")).toBe(true);
  await drag(remove, "drop", dataTransfer);
  await drag(grip, "dragend", dataTransfer);
  expect(host.querySelector(part("grouping-chip"))).toBeNull();
  expect(host.querySelectorAll(part("group-row"))).toHaveLength(0);
});
it("keeps mobile grouping and app-computed aggregate values readable without editable aggregation controls", async () => {
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      forceMobile: true,
      columns: [{ key: "team", groupable: true }, { key: "when" }],
      features: [
        groupingPanel<Row>("team", {
          groupAggregates: () => ({ when: "Computed by app" }),
        }),
      ],
    })
  );
  await flush();
  expect(
    element(part("grouping-panel"), host).hasAttribute("data-mobile")
  ).toBe(true);
  const aggregate = element(part("grouping-aggregation-item"), host);
  expect(aggregate.textContent).toContain("Set by the app");
  expect(aggregate.querySelector('[role="combobox"]')).toBeNull();
  expect(host.textContent).toContain("Computed by app");
});
it("accepts a column-header drag at an active grouping drop boundary", async () => {
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      columns: [
        { key: "team", groupable: true },
        { key: "when", groupable: true },
      ],
      features: [groupingPanel<Row>("team")],
    })
  );
  await flush();
  const header = element('th[data-column-key="when"]', host);
  expect(header.getAttribute("draggable")).toBe("true");
  const dataTransfer = transfer();
  await drag(header, "dragstart", dataTransfer);
  const zones = [
    ...host.querySelectorAll<HTMLElement>(part("grouping-drop-zone")),
  ];
  const target = zones.at(-1);
  if (!target) throw new Error("Missing grouping drop boundary");
  expect(target.hasAttribute("data-dragging")).toBe(true);
  await drag(target, "dragenter", dataTransfer);
  await drag(target, "dragover", dataTransfer);
  expect(target.hasAttribute("data-active")).toBe(true);
  await drag(target, "drop", dataTransfer);
  await drag(header, "dragend", dataTransfer);
  expect(host.querySelectorAll(part("grouping-chip"))).toHaveLength(2);
});
