import { expect, it } from "vitest";
import { effectScope } from "vue";

import { useDataTableShell } from "../src/useDataTableShell";

it("publishes selection scope and clears it when explicit ids replace the selection", () => {
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      data: [{ id: "a" }, { id: "b" }],
      columns: [{ key: "id" }],
      rowKey: (row) => row.id,
      selectable: true,
      urlSync: false,
    })
  );
  if (!shell) throw new Error("Table scope did not initialize");
  try {
    const selection = shell.selection.value;
    if (!selection) throw new Error("Selection did not initialize");
    expect(shell.runtime.view()?.selection).toMatchObject({
      allMatching: false,
      acrossPages: true,
    });
    selection.selectAllMatching();
    expect(shell.runtime.view()?.selection?.allMatching).toBe(true);
    shell.runtime.view()?.selection?.replace(["b"]);
    expect(shell.runtime.view()?.selection).toMatchObject({
      selectedIds: new Set(["b"]),
      allMatching: false,
      acrossPages: true,
    });
  } finally {
    scope.stop();
  }
  expect(shell.runtime.view()).toBeUndefined();
});
