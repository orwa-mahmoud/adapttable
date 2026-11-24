import { expect, it, vi } from "vitest";
import { effectScope } from "vue";

import { selection } from "../src/features/headlessFactories";
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
        features: [selection({ onSelectionChange: changed })],
        urlSync: false,
        forceMobile: false,
      })
    )!;
    const expected = ["first:stable", "second:stable"];
    const chosen = shell.selection.value!;
    expect(shell.desktop.value.rows.map((row) => row.key)).toEqual(expected);
    expect(chosen.state.value.visibleIds).toEqual(expected);
    chosen.headerCheckboxAttrs().onChange();
    expect(changed).toHaveBeenCalledExactlyOnceWith(expected);
    expect([...chosen.selectedIds.value]).toEqual(expected);
    expect(
      shell.desktop.value.rows.map((row) => row.checkboxAttrs?.checked)
    ).toEqual([true, true]);
    expect(chosen.headerState.value).toBe("all");
  } finally {
    scope.stop();
  }
});
