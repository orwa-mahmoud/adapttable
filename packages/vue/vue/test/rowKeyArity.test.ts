import { expect, it, vi } from "vitest";
import { effectScope } from "vue";

import type { RowSelectionOptions } from "../src/selection/selection";
import { useDataTableShell } from "../src/useDataTableShell";

it("uses the unary row-key contract for selection and rendered row identity", () => {
  interface Row {
    id: string;
  }
  // An optional second argument is a valid implementation of the unary API.
  const rowKey: RowSelectionOptions<Row>["rowKey"] = (row, suffix = "stable") =>
    `${row.id}:${suffix}`;
  const rows: readonly Row[] = [{ id: "first" }, { id: "second" }];
  const changed = vi.fn();
  const scope = effectScope();
  try {
    const shell = scope.run(() =>
      useDataTableShell({
        data: rows,
        columns: [{ key: "id" }],
        rowKey,
        selectable: true,
        urlSync: false,
        forceMobile: false,
        onSelectionChange: changed,
      })
    )!;
    const expected = ["first:stable", "second:stable"];
    const selection = shell.selection.value!;
    expect(shell.desktop.value.rows.map((row) => row.key)).toEqual(expected);
    expect(selection.state.value.visibleIds).toEqual(expected);
    selection.headerCheckboxAttrs().onChange();
    expect(changed).toHaveBeenCalledExactlyOnceWith(expected);
    expect([...selection.selectedIds.value]).toEqual(expected);
    expect(
      shell.desktop.value.rows.map((row) => row.checkboxAttrs?.checked)
    ).toEqual([true, true]);
    expect(selection.headerState.value).toBe("all");
  } finally {
    scope.stop();
  }
});
