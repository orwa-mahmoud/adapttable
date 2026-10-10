import type { TableSource } from "@adapttable/core";
import { slotRender } from "@adapttable/core/binding";
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import { extendFeature } from "../src/features/tableFeature";
import { groupingModelKey } from "../src/hierarchy/models";
import {
  groupingPanel,
  groupingPanelControlKey,
} from "../src/specialized/groupingPanel";
import {
  rowReorder,
  rowReorderControlKey,
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

function setup() {
  const moved = vi.fn();
  const data = shallowRef<readonly Row[]>(rows);
  const supplied = shallowRef<TableSource<Row>>();
  const features = [
    extendFeature(groupingPanel<Row>(["team"]), [
      slotRender(groupingPanelControlKey<Row>(), () => null),
    ]),
    extendFeature(
      rowReorder<Row>(() => undefined, {
        movePolicy: "confirm",
        onGroupMove: moved,
      }),
      [slotRender(rowReorderControlKey<Row>(), () => null)]
    ),
  ];
  const scope = effectScope();
  scopes.push(scope);
  const shell = scope.run(() =>
    useDataTableShell<Row>(() => ({
      data: data.value,
      source: supplied.value,
      columns: [{ key: "team", groupable: true }],
      rowKey: (row) => row.id,
      features,
      urlSync: false,
    }))
  )!;
  const model = () => shell.rowReorder.value!;
  const select = () => {
    const target = model()
      .controller.moveMenu(data.value[0]!)!
      .targets.find((item) => !item.disabledReason)!;
    model().controller.selectMoveTarget(target);
    expect(model().snapshot.pendingMove).not.toBeNull();
    return model();
  };
  return { shell, data, supplied, moved, model, select };
}

describe("reorder hierarchy projection ownership", () => {
  it("keeps a pending decision live across an equivalent hierarchy publication", () => {
    const state = setup();
    const pending = state.select();
    const previousRows = state.shell.rowInventory.value.visibleRows;
    const grouping = state.shell.grouping.value!;

    state.shell.state.set(groupingModelKey<Row>(), {
      ...grouping,
      entries: [...grouping.entries],
    });

    expect(state.shell.rowInventory.value.visibleRows).not.toBe(previousRows);
    expect(state.shell.rowInventory.value.visibleRows).toEqual(previousRows);
    expect(state.model().snapshot.pendingMove).toBe(
      pending.snapshot.pendingMove
    );
    pending.controller.confirmMove();
    expect(state.moved).toHaveBeenCalledOnce();
    expect(state.model().snapshot.pendingMove).toBeNull();
  });

  it("retires pending handles across raw A to B to A replacement with identical rows", () => {
    const state = setup();
    const pending = state.select();

    state.data.value = [...rows];
    state.data.value = rows;

    expect(state.model().snapshot.pendingMove).toBeNull();
    const current = state.select();
    pending.controller.confirmMove();
    pending.controller.cancelMove();
    expect(state.moved).not.toHaveBeenCalled();
    expect(state.model().snapshot.pendingMove).toBe(
      current.snapshot.pendingMove
    );
    current.controller.confirmMove();
    expect(state.moved).toHaveBeenCalledOnce();
  });

  it("retires pending handles across supplied source A to B to A with identical rows", () => {
    const state = setup();
    const source = { ...state.shell.source.value, tableEngine: undefined };
    state.supplied.value = source;
    const pending = state.select();

    state.supplied.value = { ...source };
    state.supplied.value = source;

    expect(state.model().snapshot.pendingMove).toBeNull();
    const current = state.select();
    pending.controller.confirmMove();
    pending.controller.cancelMove();
    expect(state.moved).not.toHaveBeenCalled();
    expect(state.model().snapshot.pendingMove).toBe(
      current.snapshot.pendingMove
    );
    current.controller.confirmMove();
    expect(state.moved).toHaveBeenCalledOnce();
  });

  it("retires a decision when sorting changes while grouped visible order stays the same", () => {
    const state = setup();
    const pending = state.select();
    const visibleRows = state.shell.rowInventory.value.visibleRows;

    state.shell.source.value.setSort("team", "asc");

    expect(state.shell.rowInventory.value.visibleRows).toEqual(visibleRows);
    expect(state.model().snapshot.pendingMove).toBeNull();
    pending.controller.confirmMove();
    expect(state.moved).not.toHaveBeenCalled();
  });

  it("retires a decision when filter values change", () => {
    const state = setup();
    const pending = state.select();
    const visibleRows = state.shell.rowInventory.value.visibleRows;

    state.shell.source.value.setExtra("team", ["Core"]);

    expect(state.shell.rowInventory.value.visibleRows).toEqual(visibleRows);
    expect(state.model().snapshot.pendingMove).toBeNull();
    pending.controller.confirmMove();
    expect(state.moved).not.toHaveBeenCalled();
  });
});
