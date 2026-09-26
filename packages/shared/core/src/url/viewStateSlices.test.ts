import { describe, expect, it } from "vitest";

import { EMPTY_COLUMN_LAYOUT } from "../columns/columnLayoutModel";
import { EMPTY_ROW_PIN_STATE } from "../rows/rowPinModel";
import {
  columnLayoutSlice,
  densitySlice,
  groupCollapseSlice,
  rowPinningSlice,
  URL_SLICE_WRITE_DEBOUNCE_MS,
} from "./viewStateSlices";

const written = (write: (params: URLSearchParams) => void): string => {
  const params = new URLSearchParams();
  write(params);
  return params.toString();
};

describe("columnLayoutSlice", () => {
  const defaultColumnLayout = { hidden: ["email"] };

  it("reads the URL layout, else the default over an empty layout", () => {
    const fromUrl = columnLayoutSlice.read(
      new URLSearchParams("colHide=age"),
      "",
      {}
    );
    expect(fromUrl.hidden).toEqual(["age"]);
    const fallback = columnLayoutSlice.read(new URLSearchParams(), "", {
      defaultColumnLayout,
    });
    expect(fallback).toEqual({ ...EMPTY_COLUMN_LAYOUT, hidden: ["email"] });
    expect(
      columnLayoutSlice.read(new URLSearchParams(), "", { defaultColumnLayout })
    ).toBe(fallback);
  });

  it("clears the params for the default, and marks an explicitly emptied layout", () => {
    const config = { defaultColumnLayout };
    const fallback = { ...EMPTY_COLUMN_LAYOUT, hidden: ["email"] };
    expect(
      written((p) => columnLayoutSlice.write(p, fallback, "", config))
    ).toBe("");
    expect(
      written((p) =>
        columnLayoutSlice.write(p, EMPTY_COLUMN_LAYOUT, "", config)
      )
    ).toBe("colHide=");
    expect(
      written((p) =>
        columnLayoutSlice.write(
          p,
          { ...EMPTY_COLUMN_LAYOUT, hidden: ["age"] },
          "t.",
          config
        )
      )
    ).toBe("t.colHide=age");
    expect(columnLayoutSlice.writeDebounceMs).toBe(URL_SLICE_WRITE_DEBOUNCE_MS);
  });
});

describe("densitySlice", () => {
  it("reads a valid density, else the default, else comfortable", () => {
    expect(
      densitySlice.read(new URLSearchParams("density=compact"), "", {})
    ).toBe("compact");
    expect(densitySlice.read(new URLSearchParams("density=huge"), "", {})).toBe(
      "comfortable"
    );
    expect(
      densitySlice.read(new URLSearchParams(), "", {
        defaultDensity: "compact",
      })
    ).toBe("compact");
  });

  it("writes no parameter for the default density", () => {
    expect(written((p) => densitySlice.write(p, "comfortable", "", {}))).toBe(
      ""
    );
    expect(written((p) => densitySlice.write(p, "compact", "t.", {}))).toBe(
      "t.density=compact"
    );
    expect(
      written((p) =>
        densitySlice.write(p, "comfortable", "", { defaultDensity: "compact" })
      )
    ).toBe("density=comfortable");
  });
});

describe("groupCollapseSlice", () => {
  it("reads the URL set, else a copy of the default", () => {
    expect(
      groupCollapseSlice.read(new URLSearchParams("groupClosed=a"), "", {})
    ).toEqual(["a"]);
    const defaults = ["x"];
    const read = groupCollapseSlice.read(new URLSearchParams(), "", {
      defaultCollapsedGroupIds: defaults,
    });
    expect(read).toEqual(["x"]);
    expect(read).not.toBe(defaults);
    expect(groupCollapseSlice.read(new URLSearchParams(), "", {})).toEqual([]);
  });

  it("stamps an emptied set only when a default would re-apply", () => {
    expect(
      written((p) =>
        groupCollapseSlice.write(p, [], "", { defaultCollapsedGroupIds: ["x"] })
      )
    ).toBe("groupClosed=");
    expect(written((p) => groupCollapseSlice.write(p, [], "", {}))).toBe("");
    expect(written((p) => groupCollapseSlice.write(p, ["a"], "", {}))).not.toBe(
      ""
    );
  });
});

describe("rowPinningSlice", () => {
  it("reads the pin lists, else nothing pinned", () => {
    expect(rowPinningSlice.read(new URLSearchParams(), "", {})).toBe(
      EMPTY_ROW_PIN_STATE
    );
    const pins = { top: ["1"], bottom: ["9"] };
    const params = new URLSearchParams();
    rowPinningSlice.write(params, pins, "", {});
    expect(rowPinningSlice.read(params, "", {})).toEqual(pins);
  });
});
