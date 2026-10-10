import { expect, it } from "vitest";

import { EMPTY_COLUMN_LAYOUT } from "../columns/columnLayoutModel";
import { columnLayoutSlice } from "./viewStateSlices";

it("records explicit empty optional layout fields when defaults are nonempty", () => {
  const config = {
    defaultColumnLayout: {
      hidden: ["email"],
      collapsedGroups: ["Contact"],
      names: { name: "Owner" },
    },
  };
  const params = new URLSearchParams("other.colHide=team");
  columnLayoutSlice.write(
    params,
    { ...EMPTY_COLUMN_LAYOUT, names: {}, collapsedGroups: [] },
    "one.",
    config
  );
  expect(params.get("one.colHide")).toBe("");
  expect(params.get("other.colHide")).toBe("team");
  expect(columnLayoutSlice.read(params, "one.", config)).toEqual(
    EMPTY_COLUMN_LAYOUT
  );
  columnLayoutSlice.write(
    params,
    { ...EMPTY_COLUMN_LAYOUT, ...config.defaultColumnLayout },
    "one.",
    config
  );
  expect(params.has("one.colHide")).toBe(false);
  expect(params.has("one.colGroupCollapse")).toBe(false);
});
