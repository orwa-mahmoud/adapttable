import { slotRender } from "@adapttable/core/binding";
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import { rowPinning } from "../src/features/rowPinning";
import { extendFeature, type TableFeature } from "../src/features/tableFeature";
import {
  groupingPanel,
  groupingPanelControlKey,
} from "../src/specialized/groupingPanel";
import {
  type RowDragEvent,
  rowReorder,
  RowReorderChrome,
  rowReorderControlKey,
  type RowReorderControlSlots,
  type RowReorderOptions,
} from "../src/specialized/rowReorder";
import { useDataTableShell } from "../src/useDataTableShell";
const rows = [
  { id: "a", team: "Core" },
  { id: "b", team: "Ops" },
  { id: "c", team: "Core" },
];
type Row = (typeof rows)[number];
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));
function setup(
  extra: readonly TableFeature<Row>[] = [],
  policy: RowReorderOptions<Row> = {},
  data: () => readonly Row[] = () => rows
) {
  const menus: Parameters<RowReorderControlSlots["Menu"]>[0][] = [];
  const handles: Parameters<RowReorderControlSlots["Handle"]>[0][] = [];
  const buttons: Parameters<RowReorderControlSlots["Button"]>[0][] = [];
  const moved = vi.fn();
  const reordered = vi.fn();
  const feature = extendFeature(
    rowReorder<Row>(reordered, {
      movePolicy: "confirm",
      onGroupMove: moved,
      ...policy,
    }),
    [
      slotRender(rowReorderControlKey<Row>(), (props) =>
        RowReorderChrome({
          ...props,
          slots: {
            Handle: (props) => {
              handles.push(props);
              return null;
            },
            Button: (props) => {
              buttons.push(props);
              return null;
            },
            Menu: (props) => {
              menus.push(props);
              return null;
            },
          },
        })
      ),
    ]
  );
  const scope = effectScope();
  scopes.push(scope);
  const shell = scope.run(() =>
    useDataTableShell<Row>(() => ({
      data: data(),
      columns: [{ key: "team", groupable: true }],
      rowKey: (row) => row.id,
      urlSync: false,
      features: [...extra, feature],
    }))
  )!;
  const draw = (id = "a", mobile = false) => {
    const slot = shell.desktop.value.bodySlots?.find(
      (slot) => slot.kind === "row" && slot.wiring.key === id
    );
    if (slot?.kind !== "row") throw new Error("Missing row");
    slot.wiring.reorder?.(mobile);
    return slot.wiring;
  };
  return { scope, shell, draw, menus, handles, buttons, moved, reordered };
}
const grouped = () =>
  extendFeature(groupingPanel<Row>(["team"]), [
    slotRender(groupingPanelControlKey<Row>(), () => null),
  ]);
function event(): RowDragEvent {
  let payload = "";
  return {
    dataTransfer: {
      setData: (_type, data) => {
        payload = data;
      },
      getData: () => payload,
      effectAllowed: "none",
      dropEffect: "none",
    },
    clientY: 0,
    currentTarget: null,
    preventDefault: vi.fn(),
  };
}
describe("specialized ownership regressions", () => {
  it("retires retained pending group confirmation and auto destinations on teardown", () => {
    for (const movePolicy of ["confirm", "auto"] as const) {
      const state = setup([grouped()], { movePolicy });
      state.draw();
      const selected = state.menus
        .at(-1)!
        .items.find((item) => !item.disabled)!;
      if (movePolicy === "confirm") selected.onSelect();
      state.draw();
      const confirm = state.menus.at(-1)!.confirmation?.onConfirm;
      state.scope.stop();
      confirm?.();
      selected.onSelect();
      expect(state.moved).not.toHaveBeenCalled();
    }
  });
  it("maps pinned visual adjacency to host order without moving a different row", () => {
    const state = setup([
      rowPinning({ pinnedRowIds: { top: ["c"], bottom: [] } }),
    ]);
    expect(
      state.shell.rowInventory.value.visibleRows.map((row) => row.id)
    ).toEqual(["c", "a", "b"]);
    state.draw("c", true);
    state.buttons.at(-1)!.onClick();
    expect(state.reordered).toHaveBeenCalledWith(2, 1, rows[2]);
  });
  it("cancels a pointer gesture when source order changes", async () => {
    const data = shallowRef<readonly Row[]>(rows);
    const state = setup([], {}, () => data.value);
    state.draw();
    const drag = event();
    state.handles.at(-1)!.dragProps.onDragStart(drag);
    data.value = [rows[1]!, rows[0]!, rows[2]!];
    await nextTick();
    const attrs = state.shell.rowReorder.value!.rowAttrs("c", 2, rows[2]!, 0);
    (attrs.onDrop as (event: RowDragEvent) => void)(drag);
    expect(state.reordered).not.toHaveBeenCalled();
    expect(state.shell.rowReorder.value!.snapshot.lifted).toBeNull();
  });
  it("retires retained mobile controls even when a source goes A to B to A", () => {
    const data = shallowRef<readonly Row[]>(rows);
    const state = setup([], {}, () => data.value);
    state.draw("a", true);
    const move = state.buttons.at(-1)!.onClick;
    data.value = [...rows];
    data.value = rows;
    move();
    expect(state.reordered).not.toHaveBeenCalled();
    state.draw("a", true);
    state.buttons.at(-1)!.onClick();
    expect(state.reordered).toHaveBeenCalledWith(0, 1, rows[0]);
  });
  it("uses raw data indices when filtering changes the visual window", () => {
    const state = setup();
    state.shell.source.value.setSearch("Core");
    state.draw("a", true);
    state.buttons.at(-1)!.onClick();
    expect(state.reordered).toHaveBeenCalledWith(0, 2, rows[0]);
  });
});
