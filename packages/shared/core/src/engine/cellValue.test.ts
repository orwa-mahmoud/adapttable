import { describe, expect, it } from "vitest";

import type { ColumnMetadata } from "../contracts/columns";
import {
  cellSortReader,
  cellSortValue,
  cellValue,
  cellValueReader,
} from "./cellValue";

interface Row {
  id: string;
  title: { en: string; ar: string };
  tags: string[];
  budget: number;
}

const row: Row = {
  id: "1",
  title: { en: "Report", ar: "تقرير" },
  tags: ["a"],
  budget: 12,
};

const columns: readonly ColumnMetadata<Row>[] = [
  { key: "budget" },
  { key: "title.en", i18n: { ar: "title.ar", "ar-EG": "title.ar" } },
  { key: "tags" },
  { key: "budget", formatValue: (r) => "USD " + String(r.budget) },
  { key: "budget", exportValue: (r) => r.budget * 2 },
  { key: "budget", sortValue: (r) => -r.budget },
];

describe("prepared cell readers", () => {
  it.each(["en", "ar", "ar-EG", "ar_SA", "fr", undefined])(
    "read what cellValue and cellSortValue read, for locale %s",
    (locale) => {
      for (const column of columns) {
        expect(cellValueReader(column, locale)(row)).toEqual(
          cellValue(row, column, locale)
        );
        expect(cellSortReader(column, locale)(row)).toEqual(
          cellSortValue(row, column, locale)
        );
      }
    }
  );

  it("keeps a localized path for every row it reads", () => {
    const read = cellValueReader(columns[1]!, "ar-EG");
    const other: Row = { ...row, title: { en: "Plan", ar: "خطة" } };
    expect([read(row), read(other)]).toEqual(["تقرير", "خطة"]);
  });
});
