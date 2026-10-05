import { expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import { useRowSelection } from "../src/selection/selection";

it("retires old row and header controls on row identity replacement and all actions on disposal", () => {
  const rows = shallowRef([{ id: "first" }, { id: "second" }]);
  const changes = vi.fn();
  const scope = effectScope();
  const selection = scope.run(() =>
    useRowSelection({
      rows,
      rowKey: (row) => row.id,
      acrossPages: true,
      onSelectionChange: changes,
    })
  )!;
  const oldRow = selection.rowCheckboxAttrs("first");
  const oldHeader = selection.headerCheckboxAttrs();
  rows.value = [{ id: "first" }, { id: "second" }];
  oldRow.onChange();
  oldHeader.onChange();
  expect(changes).not.toHaveBeenCalled();
  expect([...selection.selectedIds.value]).toEqual([]);
  const liveRow = selection.rowCheckboxAttrs("first");
  const liveHeader = selection.headerCheckboxAttrs();
  liveRow.onChange();
  expect(changes).toHaveBeenLastCalledWith(["first"]);
  liveHeader.onChange();
  expect(changes).toHaveBeenLastCalledWith(["first", "second"]);
  selection.selectAllMatching();
  expect(selection.allMatching.value).toBe(true);
  changes.mockClear();
  scope.stop();
  liveRow.onChange();
  liveHeader.onChange();
  selection.toggle("first");
  selection.toggleAll();
  selection.toggleGroupLeaves(["second"]);
  selection.clear();
  selection.replace([]);
  selection.selectAllMatching();
  expect(changes).not.toHaveBeenCalled();
  expect([...selection.selectedIds.value]).toEqual(["first", "second"]);
});

it("preserves equivalent row wrappers, repeated toggles and the current controlled callback", () => {
  const rows = shallowRef([{ id: "first" }]);
  const selected = shallowRef<readonly string[]>([]);
  const rejected = vi.fn();
  const accepted = vi.fn((ids: string[]) => {
    selected.value = ids;
  });
  const callback = shallowRef<(ids: string[]) => void>(rejected);
  const scope = effectScope();
  try {
    const selection = scope.run(() =>
      useRowSelection(() => ({
        rows: rows.value,
        rowKey: (row) => row.id,
        selectedIds: selected,
        onSelectionChange: callback.value,
      }))
    )!;
    const retained = selection.rowCheckboxAttrs("first");
    rows.value = [...rows.value];
    retained.onChange();
    expect(rejected).toHaveBeenCalledWith(["first"]);
    expect([...selection.selectedIds.value]).toEqual([]);
    callback.value = accepted;
    retained.onChange();
    expect([...selection.selectedIds.value]).toEqual(["first"]);
    retained.onChange();
    expect([...selection.selectedIds.value]).toEqual([]);
    expect(accepted).toHaveBeenCalledTimes(2);
  } finally {
    scope.stop();
  }
});
