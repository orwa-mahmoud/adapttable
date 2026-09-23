import { describe, expect, it } from "vitest";

import { localizedColumnPath } from "../columns/resolveColumns";
import { cellValue, resolveColumnPath } from "./cellValue";

const column = { key: "name", i18n: { ar: "nameAr", "pt-BR": "namePt" } };

describe("one locale resolution for engine and columns", () => {
  it.each([
    "ar",
    "ar-EG",
    "ar_EG",
    "AR-eg",
    " ar ",
    "pt-br",
    "PT_BR",
    "fr",
    "",
  ])("resolves %j to the same data path as the columns", (locale) => {
    expect(resolveColumnPath(column, locale)).toBe(
      localizedColumnPath(column, locale)
    );
  });

  it("reads the Arabic field for an underscore or upper-case tag", () => {
    const row = { name: "Ada", nameAr: "آدا" };
    expect(cellValue(row, column, "ar_EG")).toBe("آدا");
    expect(cellValue(row, column, "AR-eg")).toBe("آدا");
    expect(cellValue(row, column, "fr")).toBe("Ada");
  });
});
