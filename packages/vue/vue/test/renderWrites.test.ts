/**
 * A render reads the table's stores and writes none of them: every write
 * comes from an event or a watcher. Each table store is wrapped so a write
 * records the stack it was made on; one made while Vue renders a component or
 * evaluates a computed carries Vue's frame for it.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import type * as TableStoreModule from "../../../shared/core/src/state/tableStore";
import { rowPinning } from "../src/features/rowPinning";
import {
  DesktopTableChrome,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import { useDataTableShell } from "../src/useDataTableShell";

const writes: string[] = [];

vi.mock("../../../shared/core/src/state/tableStore", async (load) => {
  const actual = await load<typeof TableStoreModule>();
  return {
    ...actual,
    createTableStore: () => {
      const store = actual.createTableStore();
      const record = () => writes.push(new Error("store write").stack ?? "");
      return {
        ...store,
        dispatch: (action: Parameters<typeof store.dispatch>[0]) => {
          record();
          store.dispatch(action);
        },
        batch: (run: Parameters<typeof store.batch>[0]) => {
          record();
          store.batch(run);
        },
      };
    },
  };
});

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const columns = [{ key: "name", sortable: true }];
const rowKey = (row: Row) => row.id;
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((run) => run()));

/** Writes made while Vue rendered a component or evaluated a computed. */
const inRender = () =>
  writes.filter(
    (stack) =>
      stack.includes("renderComponentRoot") || stack.includes("refreshComputed")
  );

describe("a Vue table render", () => {
  it("writes none of the table's stores", async () => {
    const selectedIds = shallowRef<string[]>([]);
    const slots: TableChromeSlots<Row> = {
      SortButton: ({ attrs, content }) => h("button", attrs, [content]),
      SelectionCheckbox: (control) =>
        h("input", { ...control.attrs, checked: control.checked }),
      RowActions: ({ controls: actions }) =>
        h(
          "span",
          actions.map((action) => h("button", { key: action.key }))
        ),
    };
    let shell: ReturnType<typeof useDataTableShell<Row>> | undefined;
    const adapter = createMemoryAdapter("");
    const app = createApp(
      defineComponent({
        setup() {
          shell = useDataTableShell<Row>(() => ({
            data: rows,
            columns,
            rowKey,
            urlAdapter: adapter,
            selectable: true,
            selectedIds: selectedIds.value,
            features: [rowPinning()],
          }));
          return () =>
            DesktopTableChrome({ model: shell!.desktop.value, slots });
        },
      })
    );
    const root = document.createElement("div");
    app.mount(root);
    cleanup.push(() => app.unmount());

    selectedIds.value = ["a"];
    await nextTick();
    shell!.table.toggleSort("name");
    await nextTick();
    shell!.source.value.setSearch("be");
    await nextTick();
    shell!.table.layout.value.setWidth("name", 180);
    await nextTick();

    expect(writes.length).toBeGreaterThan(0);
    expect(inRender()).toEqual([]);
  });
});
