/**
 * A column with no header still needs a caption, and the key is what the
 * developer already typed — so `unitPrice` reads as "Unit Price" rather than
 * as a variable name, without anyone writing the header twice.
 */
import { describe, expect, it } from "vitest";

import { columnHeaderLabel } from "./columnHeader";

describe("columnHeaderLabel", () => {
  it("uses an explicit text header as it stands", () => {
    expect(columnHeaderLabel({ key: "unitPrice", header: "Price" })).toBe(
      "Price"
    );
  });

  it("humanizes the key when the header is absent or rendered", () => {
    expect(columnHeaderLabel({ key: "unitPrice" })).toBe("Unit Price");
    expect(
      columnHeaderLabel({ key: "unit_price", header: { rendered: true } })
    ).toBe("Unit Price");
  });
});
