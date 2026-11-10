import { afterEach, describe, expect, it } from "vitest";
import { effectScope, shallowRef, watchEffect } from "vue";

import { useRowSelection } from "../src/selection/selection";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
}
const rows: readonly Row[] = [{ id: "a" }, { id: "b" }, { id: "c" }];
const rowKey = (row: Row) => row.id;
const scopes: (() => void)[] = [];
afterEach(() => scopes.splice(0).forEach((stop) => stop()));

/** What each reader of row `a`'s selected state saw, one entry per run. */
function readersOfA(selectedIds?: ReturnType<typeof shallowRef<string[]>>) {
  const scope = effectScope();
  scopes.push(() => scope.stop());
  return scope.run(() => {
    const selection = useRowSelection({
      rows,
      rowKey,
      ...(selectedIds ? { selectedIds } : {}),
    });
    const seen = { isSelected: [] as boolean[], checkbox: [] as boolean[] };
    watchEffect(() => seen.isSelected.push(selection.isSelected("a")), {
      flush: "sync",
    });
    watchEffect(
      () =>
        seen.checkbox.push(selection.rowCheckboxAttrs("a").checked === true),
      { flush: "sync" }
    );
    return { selection, seen };
  })!;
}

describe("row selection reads", () => {
  it("re-run a row's reader only when that row's selection changes", () => {
    const { selection, seen } = readersOfA();

    selection.toggle("b");
    selection.toggle("c");
    expect(seen).toEqual({ isSelected: [false], checkbox: [false] });

    selection.toggle("a");
    expect(seen).toEqual({
      isSelected: [false, true],
      checkbox: [false, true],
    });
  });

  it("follow controlled ids per row", () => {
    const ids = shallowRef<string[]>([]);
    const { selection, seen } = readersOfA(ids);

    ids.value = ["b"];
    ids.value = ["b", "c"];
    expect(seen).toEqual({ isSelected: [false], checkbox: [false] });

    ids.value = ["a", "b", "c"];
    expect(seen).toEqual({
      isSelected: [false, true],
      checkbox: [false, true],
    });
    expect(selection.isSelected("b")).toBe(true);
  });
});

describe("the body model under a selection change", () => {
  it("keeps every row model, and the selected row reads its new state", () => {
    const scope = effectScope();
    scopes.push(() => scope.stop());
    const shell = scope.run(() =>
      useDataTableShell<Row>(() => ({
        data: rows,
        columns: [{ key: "id" }],
        rowKey,
        selectable: true,
        urlSync: false,
        forceMobile: false,
      }))
    )!;
    const desktop = shell.desktop.value;
    const mobile = shell.mobile.value;
    const [first, second] = desktop.rows;
    expect(first?.attrs["aria-selected"]).toBe(false);

    shell.selection.value!.toggle("a");

    expect(shell.desktop.value).toBe(desktop);
    expect(shell.mobile.value).toBe(mobile);
    expect(first?.attrs["aria-selected"]).toBe(true);
    expect(first?.checkboxAttrs?.checked).toBe(true);
    expect(second?.attrs["aria-selected"]).toBe(false);
    expect(mobile.rows[0]?.attrs["data-selected"]).toBe("");
    expect(desktop.headerCheckboxAttrs?.indeterminate).toBe(true);
  });
});
