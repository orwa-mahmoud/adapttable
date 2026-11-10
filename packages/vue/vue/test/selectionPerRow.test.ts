import { afterEach, describe, expect, it } from "vitest";
import { effectScope, shallowRef, watchEffect } from "vue";

import { useRowSelection } from "../src/selection/selection";

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
