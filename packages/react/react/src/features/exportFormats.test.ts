import { describe, expect, it } from "vitest";

import { exportPdf } from "./export-pdf";
import { exportXlsx } from "./export-xlsx";

function patch<T>(factory: { apply?: (input: object) => T }): T {
  const result = factory.apply?.({});
  if (result === undefined) throw new Error("factory produced no patch");
  return result;
}

describe("export formats", () => {
  it("exports the view as PDF or XLSX through the export feature", () => {
    expect(patch(exportPdf())).toMatchObject({
      exportCsv: { writer: { extension: "pdf" } },
    });
    expect(patch(exportXlsx())).toMatchObject({
      exportCsv: { writer: { extension: "xlsx" } },
    });
    expect(patch(exportPdf({ filename: "people" }))).toMatchObject({
      exportCsv: { filename: "people", writer: { extension: "pdf" } },
    });
  });

  it("adds nothing when turned off", () => {
    expect(patch(exportPdf(false))).toEqual({ exportCsv: false });
    expect(patch(exportXlsx(false))).toEqual({ exportCsv: false });
  });
});
