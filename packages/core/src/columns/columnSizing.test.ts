/**
 * How wide each column ends up.
 *
 * The two modes are the whole design: overflow-and-scroll for a dense table,
 * share-the-container for a small one. These check who wins when several
 * answers are available at once.
 */
import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import {
  columnFlexShares,
  columnSizeStyle,
  fittedTableStyle,
} from "./columnSizing";
import { COLUMN_GROUP_STUB_PREFIX, columnGroupStubStyle } from "./headerGroups";

interface Row {
  id: string;
}
const cols = (...defs: Partial<ColumnModel<Row>>[]): ColumnModel<Row>[] =>
  defs.map((def, i) => ({ key: `c${i}`, header: `C${i}`, ...def }));

describe("columnFlexShares", () => {
  it("gives nothing away when the table overflows as usual", () => {
    expect(columnFlexShares({ columns: cols({}, {}) })).toEqual({});
  });

  it("splits the container equally when it fits", () => {
    const shares = columnFlexShares({
      columns: cols({}, {}, {}),
      fitColumns: true,
    });
    // Thirds, to the precision a browser cares about.
    expect(shares.c0).toBeCloseTo(33.333, 3);
    expect(shares.c1).toBeCloseTo(33.333, 3);
    expect(shares.c2).toBeCloseTo(33.333, 3);
  });

  it("weights each column by its flex", () => {
    const shares = columnFlexShares({
      columns: cols({ flex: 2 }, { flex: 1 }),
      fitColumns: true,
    });
    expect(shares.c0).toBeCloseTo(66.667, 3);
    expect(shares.c1).toBeCloseTo(33.333, 3);
  });

  it("honours flex even without the fitting mode", () => {
    // A column that asked for a share gets one; the rest keep their size.
    expect(columnFlexShares({ columns: cols({ flex: 1 }, {}) })).toEqual({
      c0: 100,
    });
  });

  it("leaves a column with a width out of the split", () => {
    // Its width is an answer already; stretching it would overrule the author.
    const shares = columnFlexShares({
      columns: cols({ width: 200 }, {}),
      fitColumns: true,
    });
    expect(shares).toEqual({ c1: 100 });
  });

  it("leaves a column the user dragged out of the split", () => {
    const shares = columnFlexShares({
      columns: cols({}, {}),
      fitColumns: true,
      widths: { c0: 320 },
    });
    expect(shares).toEqual({ c1: 100 });
  });
});

describe("columnSizeStyle", () => {
  it("locks a collapsed arrow stub so leftover table space cannot stretch it", () => {
    expect(
      columnSizeStyle(
        cols({ key: `${COLUMN_GROUP_STUB_PREFIX}Delivery:0` })[0]!
      )
    ).toEqual(columnGroupStubStyle());
  });

  it("carries the bounds a column declares", () => {
    expect(columnSizeStyle(cols({ minWidth: 80, maxWidth: 400 })[0]!)).toEqual({
      width: undefined,
      minWidth: 80,
      maxWidth: 400,
    });
  });

  it("prefers the user's dragged width over everything", () => {
    const column = cols({ width: 200 })[0]!;
    expect(columnSizeStyle(column, { c0: 50 }, 321)?.width).toBe(321);
  });

  it("then the column's own width, then its share", () => {
    expect(columnSizeStyle(cols({ width: 200 })[0]!, { c0: 50 })?.width).toBe(
      200
    );
    expect(columnSizeStyle(cols({})[0]!, { c0: 50 })?.width).toBe("50%");
  });
});

describe("fittedTableStyle", () => {
  it("fixes the layout so percentages mean something", () => {
    // Without a fixed layout the browser sizes columns from content and the
    // percentages are a suggestion it may ignore.
    expect(fittedTableStyle(true)).toEqual({
      tableLayout: "fixed",
      width: "100%",
    });
  });

  it("says nothing when the table overflows as usual", () => {
    expect(fittedTableStyle(false)).toBeUndefined();
    expect(fittedTableStyle()).toBeUndefined();
  });
});
