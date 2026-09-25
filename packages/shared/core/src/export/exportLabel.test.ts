/**
 * The export button's caption.
 *
 * A button that says "Export CSV" while downloading an `.xlsx` names a file the
 * user is not getting, and no adapter should have to correct it by hand.
 */
import { describe, expect, it } from "vitest";

import { defaultLabels } from "../labels";
import { exportButtonLabel } from "./exportLabel";

describe("exportButtonLabel", () => {
  it("keeps the CSV label for CSV", () => {
    // Every locale already translates this string; nothing renames it.
    expect(exportButtonLabel(defaultLabels, "csv")).toBe("Export CSV");
  });

  it("names the format a writer actually produces", () => {
    expect(exportButtonLabel(defaultLabels, "xlsx")).toBe("Export XLSX");
  });

  it("names a format nobody planned for", () => {
    // A custom writer calling itself "tsv" gets a caption without the library
    // having to know about it.
    expect(exportButtonLabel(defaultLabels, "tsv")).toBe("Export TSV");
  });

  it("uses the locale's own phrasing", () => {
    expect(
      exportButtonLabel(
        { exportFile: (format) => `${format.toUpperCase()} exportieren` },
        "xlsx"
      )
    ).toBe("XLSX exportieren");
  });

  it("respects a host's own CSV wording", () => {
    expect(exportButtonLabel({ exportCsv: "Download" }, "csv")).toBe(
      "Download"
    );
  });

  it("falls back with no labels at all", () => {
    expect(exportButtonLabel(undefined, "csv")).toBe("Export CSV");
    expect(exportButtonLabel(undefined, "xlsx")).toBe("Export XLSX");
  });
});
