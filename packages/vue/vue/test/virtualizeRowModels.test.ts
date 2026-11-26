/**
 * A windowed body builds row models for the rows it draws. Every row of the
 * data still has a key (focus, Find, selection and scroll-to read the full
 * inventory), but row attributes, styles and cells are built per drawn row,
 * and only for the surface the reader is on.
 */
import { afterEach, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";

import { rowAppearance } from "../src/features/headlessFactories";
import type { TableBodySlot, TableRowModel } from "../src/layout/tableModels";
import { virtualize } from "../src/specialized/virtualize";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  readonly id: string;
  readonly [key: string]: string | number;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

async function settle() {
  await nextTick();
  await nextTick();
}

function scrollBox() {
  const root = document.createElement("div");
  const box = document.createElement("div");
  box.dataset.adapttablePart = "scroll-box";
  root.append(box);
  document.body.append(root);
  Object.defineProperties(box, {
    offsetHeight: { configurable: true, value: 400 },
    offsetWidth: { configurable: true, value: 800 },
  });
  vi.spyOn(box, "getBoundingClientRect").mockReturnValue({
    top: 0,
    left: 0,
    right: 800,
    bottom: 400,
    width: 800,
    height: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return { root, box };
}

const drawnRows = (slots: readonly TableBodySlot<Row>[] | undefined) =>
  (slots ?? []).flatMap((slot): TableRowModel<Row>[] =>
    slot.kind === "row" ? [slot.wiring] : []
  );

it("builds row models only for the drawn rows of the active surface", async () => {
  const { root, box } = scrollBox();
  const columns = Array.from({ length: 20 }, (_, index) => ({
    key: `c${index}`,
  }));
  const data: Row[] = Array.from({ length: 10_000 }, (_, index) => {
    const row: Record<string, string | number> = { id: String(index) };
    for (let column = 0; column < 20; column++)
      row[`c${column}`] = index + column;
    return row as Row;
  });
  const rowStyle = vi.fn(() => ({}));
  const rowKey = vi.fn((row: Row) => row.id);
  const scope = effectScope();
  try {
    const shell = scope.run(() =>
      useDataTableShell({
        data,
        columns,
        rowKey,
        urlSync: false,
        defaults: { limit: data.length },
        paginationMode: "infinite",
        features: [
          rowAppearance<Row>({ rowStyle }),
          virtualize({ maxHeight: 400, estimateRowSize: 40 }),
        ],
      })
    )!;
    shell.setSurface({ rootElement: () => root, scrollElement: () => box });
    await settle();
    const drawn = drawnRows(shell.desktop.value.bodySlots);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.length).toBeLessThan(60);
    // Drawing reads each drawn row's attributes.
    expect(drawn.map((row) => row.attrs)).toHaveLength(drawn.length);
    // A row style per drawn row, on the desktop surface only.
    expect(rowStyle.mock.calls.length).toBeLessThanOrEqual(drawn.length * 2);
    // Keys for the inventory stay linear in the data: a few per row.
    expect(rowKey.mock.calls.length).toBeLessThanOrEqual(data.length * 4);
  } finally {
    scope.stop();
  }
});
