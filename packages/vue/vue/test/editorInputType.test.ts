import { editorInputType as coreEditorInputType } from "@adapttable/core";
import { describe, expect, it } from "vitest";

import { editorInputType } from "../src/adapter";
import type { CellEditor } from "../src/index";

describe("adapter editor input mapping", () => {
  it("preserves the canonical core function identity", () => {
    expect(editorInputType).toBe(coreEditorInputType);
  });

  it.each([
    [null, "text"],
    ["text", "text"],
    ["number", "number"],
    ["date", "date"],
    ["datetime", "datetime-local"],
    ["time", "time"],
    ["boolean", "text"],
    [{ type: "select", options: [] }, "text"],
    [{ type: "multi-select", options: [] }, "text"],
  ] satisfies readonly (readonly [CellEditor | null, string])[])(
    "maps %j through the supported native input contract",
    (editor, expected) => {
      expect(editorInputType(editor)).toBe(expected);
    }
  );
});
