import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import { humanizeKey } from "@adapttable/core";
import { getPath } from "@adapttable/core";
import { localizedColumnPath } from "@adapttable/core";
import { resolveColumns } from "../columns/resolveColumns";

interface Row {
  id: string;
  firstName: string;
  department: { name: string; head: { email: string } };
  active: boolean;
  score: number;
}

const ROW: Row = {
  id: "1",
  firstName: "Ada",
  department: { name: "Core", head: { email: "h@x.io" } },
  active: true,
  score: 9.5,
};

describe("resolveColumns", () => {
  it("auto-derives headers and dot-path accessors for bare keys", () => {
    const [first, dept] = resolveColumns<Row>([
      { key: "firstName" },
      { key: "department.name" },
    ]);
    expect(first!.header).toBe("First Name");
    expect(first!.accessor!(ROW)).toBe("Ada");
    expect(dept!.header).toBe("Name");
    expect(dept!.accessor!(ROW)).toBe("Core");
  });

  it("explicit header and accessor always win — humanize is only a fallback", () => {
    const [col] = resolveColumns<Row>([
      {
        key: "firstName",
        header: "الاسم الأول",
        accessor: (r) => r.firstName.toUpperCase(),
      },
    ]);
    expect(col!.header).toBe("الاسم الأول");
    expect(col!.accessor!(ROW)).toBe("ADA");
  });

  it("a column with a Cell component gets no auto accessor", () => {
    const Cell = () => null;
    const [col] = resolveColumns<Row>([{ key: "firstName", Cell }]);
    expect(col!.header).toBe("First Name");
    expect(col!.accessor).toBeUndefined();
  });

  it("renders primitives (incl. booleans/numbers) and blanks objects", () => {
    const [active, score, dept] = resolveColumns<Row>([
      { key: "active" },
      { key: "score" },
      { key: "department" },
    ]);
    expect(active!.accessor!(ROW)).toBe("true");
    expect(score!.accessor!(ROW)).toBe("9.5");
    expect(dept!.accessor!(ROW)).toBeNull();
  });

  it("complete columns pass through by identity (idempotent)", () => {
    const complete: ColumnDef<Row> = {
      key: "firstName",
      header: "First",
      accessor: (r) => r.firstName,
    };
    const [resolved] = resolveColumns<Row>([complete]);
    expect(resolved).toBe(complete);
  });
});

describe("getPath", () => {
  it("walks nested paths and returns undefined for missing segments", () => {
    expect(getPath(ROW, "department.head.email")).toBe("h@x.io");
    expect(getPath(ROW, "department.missing.deep")).toBeUndefined();
    expect(getPath(null, "a")).toBeUndefined();
    expect(getPath("scalar", "a")).toBeUndefined();
  });
});

describe("humanizeKey", () => {
  it("title-cases camelCase, snake_case, kebab-case and dot paths", () => {
    expect(humanizeKey("hiredAt")).toBe("Hired At");
    expect(humanizeKey("first_name")).toBe("First Name");
    expect(humanizeKey("first-name")).toBe("First Name");
    expect(humanizeKey("department.name")).toBe("Name");
    expect(humanizeKey("id")).toBe("Id");
    expect(humanizeKey("ipV4Address")).toBe("Ip V4 Address");
  });
});

describe("i18n column paths", () => {
  interface LocalizedRow {
    nameEn: string;
    nameAr: string;
    dept: { en: string; ar: string };
  }
  const ROW: LocalizedRow = {
    nameEn: "Engineering",
    nameAr: "الهندسة",
    dept: { en: "Core", ar: "الأساسية" },
  };

  it("resolves exact tag, then primary subtag, then falls back to key", () => {
    const col = { key: "nameEn", i18n: { ar: "nameAr", "fr-CA": "nameFr" } };
    expect(localizedColumnPath(col, "ar")).toBe("nameAr");
    expect(localizedColumnPath(col, "ar-EG")).toBe("nameAr");
    expect(localizedColumnPath(col, "fr-CA")).toBe("nameFr");
    expect(localizedColumnPath(col, "de")).toBe("nameEn");
    expect(localizedColumnPath(col, undefined)).toBe("nameEn");
    expect(localizedColumnPath({ key: "plain" }, "ar")).toBe("plain");
  });

  it("the generated accessor reads the locale's path — flat fields", () => {
    const [col] = resolveColumns<LocalizedRow>(
      [{ key: "nameEn", i18n: { ar: "nameAr" } }],
      "ar"
    );
    expect(col!.accessor!(ROW)).toBe("الهندسة");
  });

  it("nested per-locale objects work the same way (paths are paths)", () => {
    const [col] = resolveColumns<LocalizedRow>(
      [{ key: "dept.en", i18n: { ar: "dept.ar" } }],
      "ar"
    );
    expect(col!.accessor!(ROW)).toBe("الأساسية");
    const [en] = resolveColumns<LocalizedRow>(
      [{ key: "dept.en", i18n: { ar: "dept.ar" } }],
      "en"
    );
    expect(en!.accessor!(ROW)).toBe("Core");
  });

  it("an explicit accessor always wins over the i18n mapping", () => {
    const [col] = resolveColumns<LocalizedRow>(
      [
        {
          key: "nameEn",
          i18n: { ar: "nameAr" },
          accessor: (r) => r.nameEn.toUpperCase(),
        },
      ],
      "ar"
    );
    expect(col!.accessor!(ROW)).toBe("ENGINEERING");
  });
});
