import { afterEach, expect, it, vi } from "vitest";
import {
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import type { TableBodySlot, TableRowModel } from "../src/layout/tableModels";
import { virtualize } from "../src/specialized/virtualize";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  readonly id: string;
  readonly amount: number;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

async function settle() {
  await nextTick();
  await nextTick();
}

/** A scroll box the virtualizer can measure: 200px tall, 400px wide. */
function scrollBox() {
  const root = document.createElement("div");
  const box = document.createElement("div");
  box.dataset.adapttablePart = "scroll-box";
  root.append(box);
  document.body.append(root);
  // The virtualizer sizes its range from the element's offset box.
  Object.defineProperties(box, {
    offsetHeight: { configurable: true, value: 200 },
    offsetWidth: { configurable: true, value: 400 },
  });
  vi.spyOn(box, "getBoundingClientRect").mockReturnValue({
    top: 0,
    left: 0,
    right: 400,
    bottom: 200,
    width: 400,
    height: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return { root, box };
}

const rowsOf = (slots: readonly TableBodySlot<Row>[] | undefined) =>
  (slots ?? []).flatMap((slot): TableRowModel<Row>[] =>
    slot.kind === "row" ? [slot.wiring] : []
  );

it("builds cells only for the rows a windowed body draws", async () => {
  const { root, box } = scrollBox();
  const accessor = vi.fn((row: Row) => row.amount);
  const data = Array.from({ length: 5000 }, (_, index) => ({
    id: String(index),
    amount: index,
  }));
  const scope = effectScope();
  try {
    const shell = scope.run(() =>
      useDataTableShell({
        data,
        columns: [{ key: "amount", accessor }],
        rowKey: (row: Row) => row.id,
        urlSync: false,
        defaults: { limit: data.length },
        paginationMode: "infinite",
        features: [virtualize({ maxHeight: 200 })],
      })
    )!;
    shell.setSurface({ rootElement: () => root, scrollElement: () => box });
    await settle();
    const drawn = rowsOf(shell.desktop.value.bodySlots);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.length).toBeLessThan(100);
    // Rendering reads the drawn rows' cells; nothing else asks for them.
    const values = drawn.map((row) => row.cells[0]?.context.value);
    expect(values).toEqual(drawn.map((row) => row.row.amount));
    expect(accessor.mock.calls.length).toBeLessThanOrEqual(drawn.length * 2);
    // Every row still exists in the logical body the keyboard and find use.
    expect(shell.bodyRows.value).toHaveLength(data.length);
  } finally {
    scope.stop();
  }
});

it("keeps a read row's cells current when the host accessor's state changes", async () => {
  const { root, box } = scrollBox();
  const currency = shallowRef("USD");
  const scope = effectScope();
  try {
    const shell = scope.run(() =>
      useDataTableShell({
        data: [{ id: "a", amount: 3 }],
        columns: [
          {
            key: "amount",
            accessor: (row: Row) => `${currency.value} ${String(row.amount)}`,
          },
        ],
        rowKey: (row: Row) => row.id,
        urlSync: false,
        features: [virtualize({ maxHeight: 200 })],
      })
    )!;
    shell.setSurface({ rootElement: () => root, scrollElement: () => box });
    await settle();
    const row = () => rowsOf(shell.desktop.value.bodySlots)[0];
    const first = row()?.cells[0];
    expect(first?.context.value).toBe("USD 3");
    // The same read twice is the same cell, so identity checks still hold.
    expect(row()?.cells[0]).toBe(first);
    currency.value = "EUR";
    await settle();
    expect(row()?.cells[0]?.context.value).toBe("EUR 3");
  } finally {
    scope.stop();
  }
});

it("renders a bounded first window before the table can measure", async () => {
  const accessor = vi.fn((row: Row) => row.amount);
  const data = Array.from({ length: 5000 }, (_, index) => ({
    id: String(index),
    amount: index,
  }));
  let slots: readonly TableBodySlot<Row>[] = [];
  const app = createSSRApp(
    defineComponent({
      setup() {
        const shell = useDataTableShell({
          data,
          columns: [{ key: "amount", accessor }],
          rowKey: (row: Row) => row.id,
          urlSync: false,
          defaults: { limit: data.length },
          paginationMode: "infinite",
          features: [virtualize({ maxHeight: 200, estimateRowSize: 50 })],
        });
        return () => {
          slots = shell.desktop.value.bodySlots ?? [];
          return h(
            "p",
            rowsOf(slots).map((row) => String(row.cells[0]?.context.value))
          );
        };
      },
    })
  );
  await renderToString(app);
  // 200px of 50px rows is four, plus the default overscan of five.
  expect(rowsOf(slots).map((row) => row.key)).toEqual([
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
  ]);
  const bottom = slots.find((slot) => slot.key === "pad-bottom");
  expect(bottom).toMatchObject({ kind: "virtualPad", height: (5000 - 9) * 50 });
  expect(accessor.mock.calls.length).toBeLessThanOrEqual(9 * 2);
});
