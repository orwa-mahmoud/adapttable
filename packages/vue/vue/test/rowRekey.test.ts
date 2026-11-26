/**
 * A rekey moves everything a Vue table keeps by row id: the selection, the
 * pinned rows, the open details and an open editor follow the row to its new
 * id in the change that rekeyed it.
 */
import { applyRowPatches, rekeyRow, updateRow } from "@adapttable/core";
import { slotRender } from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { dirtyIndicators, editableCellSlotKey, editing } from "../src/editing";
import { selection } from "../src/features/headlessFactories";
import { rowDetail } from "../src/features/rowDetail";
import { rowPinning } from "../src/features/rowPinning";
import { extendFeature, type TableFeature } from "../src/features/tableFeature";
import { rowDetailModelKey } from "../src/hierarchy/models";
import { rowPinningModelKey } from "../src/layout/modelChannels";
import {
  useDataTableShell,
  type UseDataTableShellResult,
} from "../src/useDataTableShell";

interface Row {
  readonly id: string;
  readonly name: string;
}

const rowKey = (row: Row): string => row.id;
const ROWS: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const columns = [{ key: "name", header: "Name", editable: true }] as const;

function mount(
  extra: {
    readonly selectedIds?: readonly string[];
    readonly onSelectionChange?: (ids: string[]) => void;
  } = {},
  features: readonly TableFeature<Row>[] = []
) {
  const data = shallowRef<readonly Row[]>(ROWS);
  let shell: UseDataTableShellResult<Row> | undefined;
  const element = document.createElement("div");
  document.body.append(element);
  const app = createApp(
    defineComponent({
      setup() {
        shell = useDataTableShell<Row>(() => ({
          data: data.value,
          columns,
          rowKey,
          urlSync: false,
          features: [selection(extra), ...features],
        }));
        return () => h("div");
      },
    })
  );
  app.mount(element);
  if (!shell) throw new Error("shell not created");
  return {
    shell,
    show: async (rows: readonly Row[]) => {
      data.value = rows;
      await nextTick();
    },
    unmount: () => {
      app.unmount();
      element.remove();
    },
  };
}

describe("a rekeyed row in a Vue table", () => {
  it("keeps its selection, pin and open detail under its new id", async () => {
    const table = mount({}, [rowPinning(), rowDetail<Row>(() => null)]);
    const { shell } = table;
    shell.selection.value?.toggle("a");
    shell.state.get(rowPinningModelKey<Row>()).value?.pin("a", "top");
    shell.state.get(rowDetailModelKey<Row>()).value?.expansion.toggle("a");
    await nextTick();
    await table.show(
      applyRowPatches(
        ROWS,
        [
          rekeyRow<Row>("a", { id: "a2" }),
          updateRow<Row>("a2", { name: "Al" }),
        ],
        rowKey
      )
    );
    expect(shell.selection.value?.isSelected("a2")).toBe(true);
    expect(shell.selection.value?.isSelected("a")).toBe(false);
    const pins = shell.state.get(rowPinningModelKey<Row>()).value;
    expect(pins?.sideOf("a2")).toBe("top");
    expect(pins?.sideOf("a")).toBeUndefined();
    expect(
      shell.state
        .get(rowDetailModelKey<Row>())
        .value?.expansion.isExpanded("a2")
    ).toBe(true);
    table.unmount();
  });

  it("asks a host that holds the selection to move it", async () => {
    const onSelectionChange = vi.fn();
    const table = mount({ selectedIds: ["b"], onSelectionChange });
    await table.show(
      applyRowPatches(ROWS, [rekeyRow<Row>("b", { id: "b2" })], rowKey)
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith(["b2"]);
    table.unmount();
  });

  it("keeps an open cell editor, its draft and its dirty mark", async () => {
    const table = mount({}, [
      extendFeature(
        editing<Row>(() => undefined, { onDirtyChange: () => undefined }),
        [slotRender(editableCellSlotKey<Row>(), () => h("span"))]
      ),
      dirtyIndicators(),
    ]);
    const edit = () => table.shell.editing.value;
    edit()?.state.begin("a", "name", "Ada", ROWS[0]);
    edit()?.state.setDraft("Typed");
    edit()?.dirty?.mark("a", "name");
    await nextTick();
    expect(edit()?.dirty?.isDirty("a", "name")).toBe(true);
    await table.show(
      applyRowPatches(ROWS, [rekeyRow<Row>("a", { id: "a2" })], rowKey)
    );
    expect(edit()?.state.active).toEqual({ rowId: "a2", columnKey: "name" });
    expect(edit()?.state.draft).toBe("Typed");
    expect(edit()?.dirty?.isDirty("a2", "name")).toBe(true);
    table.unmount();
  });

  it("leaves the state alone for new data that is not a patch of the old", async () => {
    const table = mount();
    table.shell.selection.value?.toggle("a");
    await table.show([{ id: "a2", name: "Ada" }, ROWS[1]!]);
    expect(table.shell.selection.value?.isSelected("a2")).toBe(false);
    table.unmount();
  });
});
