import { describe, expect, it } from "vitest";

import {
  columnPathText,
  type ResolvableColumn,
  resolveColumnDefaults,
  resolveColumnHeaders,
} from "./resolveColumns";

interface Row {
  id: string;
  name: string;
  nameAr: string;
  tags: string[];
}

const ROW: Row = { id: "1", name: "Ada", nameAr: "آدا", tags: ["x"] };

interface Col extends ResolvableColumn<Row> {
  cell?: string;
}

describe("columnPathText", () => {
  it("keeps strings, stringifies scalars and drops everything else", () => {
    expect(columnPathText("a")).toBe("a");
    expect(columnPathText(3)).toBe("3");
    expect(columnPathText(false)).toBe("false");
    expect(columnPathText(10n)).toBe("10");
    expect(columnPathText(null)).toBeNull();
    expect(columnPathText(undefined)).toBeNull();
    expect(columnPathText({ a: 1 })).toBeNull();
    expect(columnPathText(["x"])).toBeNull();
  });
});

describe("resolveColumnDefaults", () => {
  it("humanizes a missing header and reads the key's path", () => {
    const [column] = resolveColumnDefaults<Row, Col>([{ key: "name" }]);
    expect(column!.header).toBe("Name");
    expect(column!.accessor!(ROW)).toBe("Ada");
  });

  it("reads the locale's path", () => {
    const [column] = resolveColumnDefaults<Row, Col>(
      [{ key: "name", i18n: { ar: "nameAr" } }],
      "ar-EG"
    );
    expect(column!.accessor!(ROW)).toBe("آدا");
  });

  it("returns a complete column as the same object", () => {
    const complete: Col = { key: "name", header: "N", accessor: (r) => r.id };
    const [column] = resolveColumnDefaults<Row, Col>([complete]);
    expect(column).toBe(complete);
  });

  it("generates no accessor for a column that renders itself", () => {
    const [column] = resolveColumnDefaults<Row, Col>(
      [{ key: "tags", header: "Tags", cell: "custom" }],
      undefined,
      (c) => Boolean(c.cell)
    );
    expect(column!.accessor).toBeUndefined();
  });

  it("gives a non-text path value no text", () => {
    const [column] = resolveColumnDefaults<Row, Col>([{ key: "tags" }]);
    expect(column!.accessor!(ROW)).toBeNull();
  });

  it("shows a column's formatValue text, as the engine and export read it", () => {
    // A collapsed group's summary column is keyed by no row field; its text
    // is its formatValue, so a data-path reader would leave every cell blank.
    const [summary, formatted] = resolveColumnDefaults<Row, Col>([
      {
        key: "__groupRender:g:0",
        formatValue: (r) => `${r.name} · ${r.tags.length}`,
      },
      { key: "name", formatValue: (r) => r.name.toUpperCase() },
    ]);
    expect(summary!.accessor!(ROW)).toBe("Ada · 1");
    expect(formatted!.accessor!(ROW)).toBe("ADA");
  });
});

describe("resolveColumnHeaders", () => {
  it("fills a missing header and keeps a set one", () => {
    const set: { key: string; header?: string } = { key: "id", header: "ID" };
    const [missing, kept] = resolveColumnHeaders<{
      key: string;
      header?: string;
    }>([{ key: "firstName" }, set]);
    expect(missing!.header).toBe("First Name");
    expect(kept).toBe(set);
  });
});
