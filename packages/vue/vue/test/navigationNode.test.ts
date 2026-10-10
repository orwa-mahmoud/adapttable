// @vitest-environment node
import { expect, it } from "vitest";
import { effectScope, nextTick } from "vue";

import { useGridFocus } from "../src/navigation/useGridFocus";

it("updates an effect-scope navigation model without DOM globals", async () => {
  expect(typeof Element).toBe("undefined");
  const scope = effectScope();
  try {
    const grid = scope.run(() =>
      useGridFocus({
        enabled: true,
        rows: [{ id: "r" }],
        columns: [{ key: "id" }],
        rowCount: 1,
      })
    )!;
    grid.value.focusCell({ row: 0, col: 0 });
    await nextTick();
    expect(grid.value.active).toEqual({ row: 0, col: 0 });
  } finally {
    scope.stop();
  }
});
