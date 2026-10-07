import { aggregate, type ColumnDef } from "@adapttable/vue";
import { h, shallowRef } from "vue";

import { DataTable } from "../src";
import { naiveSelect } from "../src/controls/select";
import { groupingPanel } from "../src/grouping-panel";
import { rowReorder } from "../src/row-reorder";
import { click, find, mount, part, tick, write } from "./editing-helpers";
import { choose } from "./filter-helpers";

interface Row {
  id: string;
  team: string;
  amount: number;
}
const rows: Row[] = [
  { id: "a", team: "Core", amount: 2 },
  { id: "b", team: "Core", amount: 3 },
  { id: "c", team: "Design", amount: 4 },
];
const columns: ColumnDef<Row>[] = [
  { key: "team", header: "Team" },
  {
    key: "amount",
    header: "Amount",
    aggregatable: { operations: ["sum", "avg", "count"] },
  },
];
const base = {
  data: rows,
  columns,
  rowKey: (row: Row) => row.id,
  urlSync: false,
};
async function key(target: EventTarget, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      code: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await tick();
}
async function option(root: ParentNode, label: string) {
  return await vi.waitFor(() => {
    const found = [
      ...root.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((item) => item.textContent?.trim() === label);
    if (!found) throw new Error(`Missing native option ${label}`);
    return found;
  });
}

it("filters the genuine selector's prepared operation labels and preserves rejected values", async () => {
  const changed = vi.fn();
  const { host } = mount(() =>
    naiveSelect({
      attrs: { "aria-label": "Aggregation" },
      // A real native filtering test independent of jsdom virtual viewport measurement.
      virtualScroll: false,
      value: "sum",
      options: [
        { value: "sum", label: "Sum" },
        { value: "avg", label: "Average" },
        { value: "count", label: "Count" },
      ],
      onChange: changed,
    })
  );
  await tick();
  const input = find<HTMLInputElement>(host, 'input[role="combobox"]');
  input.click();
  await tick();
  await write(input, "Average");
  (await option(host, "Average")).click();
  await tick();
  expect(changed).toHaveBeenCalledWith("avg");
  expect(host.textContent).toContain("Sum");
});

it.each([false, true])(
  "uses native grouping and aggregation requests in desktop/cards (mobile=%s)",
  async (forceMobile) => {
    const { host } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile,
        features: [
          groupingPanel<Row>("team", {
            groupAggregates: aggregate<Row>({ amount: "sum" }),
          }),
        ],
      })
    );
    await tick();
    expect(
      find(host, part("grouping-panel")).classList.contains("n-card")
    ).toBe(true);
    const operation = find(host, part("grouping-aggregation-operation"));
    expect(operation.classList.contains("n-select")).toBe(true);
    // The existing helper supplies jsdom geometry to Naive's genuine viewport.
    await choose(operation, "Average");
    expect(
      find(host, part("grouping-aggregations-restore")).classList.contains(
        "n-button"
      )
    ).toBe(true);
    await click(host, "grouping-aggregation-remove");
    expect(
      host.querySelector(part("grouping-aggregation-operation"))
    ).toBeNull();
    await click(host, "grouping-aggregations-restore");
    expect(
      find(host, part("grouping-aggregation-operation")).textContent
    ).toContain("Sum");
    const checkbox = find<HTMLElement>(
      host,
      part("grouping-aggregation-option")
    );
    expect(checkbox.classList.contains("n-checkbox")).toBe(true);
    checkbox.click();
    await tick();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    checkbox.click();
    await tick();
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    await click(host, "grouping-chip-remove");
    expect(host.querySelector(part("grouping-chip-handle"))).toBeNull();
  }
);

it("renders read-only aggregates and chip drag targets through native surfaces", async () => {
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      columns: columns.map((column) => ({ ...column, aggregatable: false })),
      features: [
        groupingPanel<Row>("team", {
          groupAggregates: () => ({ amount: "Computed" }),
        }),
      ],
    })
  );
  await tick();
  const item = find(host, part("grouping-aggregation-item"));
  expect(item.hasAttribute("data-read-only")).toBe(true);
  expect(item.querySelector("input,button")).toBeNull();
  const chip = find(host, part("grouping-chip-handle"));
  chip.dispatchEvent(new Event("dragstart", { bubbles: true }));
  await tick();
  expect(
    find(host, part("grouping-remove-zone")).classList.contains("n-tag")
  ).toBe(true);
  chip.dispatchEvent(new Event("dragend", { bubbles: true }));
  await tick();
  expect(host.querySelector(part("grouping-remove-zone"))).toBeNull();
});

it("keeps mobile bounds disabled, uses keyboard row identity, and forwards genuine drag events", async () => {
  const moved = vi.fn();
  const mobile = shallowRef(true);
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      forceMobile: mobile.value,
      features: [rowReorder<Row>(moved)],
    })
  );
  await tick();
  const up = find<HTMLButtonElement>(host, part("row-reorder-up"));
  expect(up.disabled).toBe(true);
  expect(up.classList.contains("n-button")).toBe(true);
  await click(host, "row-reorder-down");
  expect(moved).toHaveBeenCalledWith(0, 1, rows[0]);
  mobile.value = false;
  await tick();
  const grip = find<HTMLElement>(host, part("row-reorder-handle"));
  grip.focus();
  await key(grip, " ");
  await key(grip, "ArrowDown");
  await key(grip, " ");
  expect(moved).toHaveBeenCalledTimes(2);
  grip.dispatchEvent(new Event("dragstart", { bubbles: true }));
  await tick();
  expect(grip.getAttribute("aria-pressed")).toBe("false");
  const drag = new Event("dragstart", { bubbles: true, cancelable: true });
  const dataTransfer = {
    setData: vi.fn(),
    getData: vi.fn(() => "0"),
    effectAllowed: "",
    dropEffect: "",
  };
  Object.defineProperties(drag, {
    dataTransfer: { value: dataTransfer },
    clientY: { value: 0 },
  });
  grip.dispatchEvent(drag);
  await tick();
  expect(grip.getAttribute("aria-pressed")).toBe("true");
  expect(dataTransfer.setData).toHaveBeenCalled();
  grip.dispatchEvent(new Event("dragend", { bubbles: true }));
  await tick();
  expect(grip.getAttribute("aria-pressed")).toBe("false");
  expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
});

it("uses shared grouped-row confirmation and restores the native destination input", async () => {
  const moved = vi.fn();
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      features: [
        groupingPanel<Row>("team"),
        rowReorder<Row>(() => undefined, {
          movePolicy: "confirm",
          onGroupMove: moved,
        }),
      ],
    })
  );
  await tick();
  const menu = find(host, `[data-row-id="a"] ${part("row-move-menu")}`);
  const input = find<HTMLInputElement>(menu, 'input[role="combobox"]');
  const open = async () => {
    input.click();
    await tick();
    const target = await vi.waitFor(() => {
      const found = [
        ...menu.querySelectorAll<HTMLElement>('[role="option"]'),
      ].find(
        (item) =>
          item.getAttribute("aria-disabled") !== "true" &&
          item.textContent?.includes("Design")
      );
      if (!found) throw new Error("Missing enabled Design destination");
      return found;
    });
    target.click();
    await tick();
    return find(menu, '[role="alertdialog"]');
  };
  const action = (dialog: Element, label: string) => {
    const button = [
      ...dialog.querySelectorAll<HTMLButtonElement>("button"),
    ].find((item) => item.textContent?.trim() === label);
    if (!button) throw new Error(`Missing ${label}`);
    return button;
  };
  const pending = await open();
  expect(document.activeElement).toBe(action(pending, "Cancel"));
  action(pending, "Cancel").click();
  await tick();
  expect(moved).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(input);
  action(await open(), "Move").click();
  await tick();
  expect(moved).toHaveBeenCalledOnce();
  expect(moved.mock.calls[0]?.[0]).toBe(rows[0]);
  expect(rows[0]?.team).toBe("Core");
  expect(document.activeElement).toBe(input);
});
