/**
 * The print layout: HTML the browser can paginate.
 *
 * Two things are being checked. The document must carry what the reader
 * can see — column widths, group structure, direction — and it must not
 * become a vehicle for markup that was meant to be a cell. A header of
 * `<b>Name</b>` that lands unescaped is an XSS bug, not a formatting one.
 */
import type { ColumnModel } from "../columnModel";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as env from "../utils/env";
import { buildExportTable } from "./exportWriter";
import {
  buildPrintDocument,
  buildPrintTableHtml,
  exportCellText,
  openPrintLayout,
  printStyles,
  printTable,
  resolvePrintDirection,
} from "./printLayout";

interface Row {
  name: string;
  age: number;
  zip: string;
  active: boolean;
}

const ROWS: Row[] = [
  { name: "Ada", age: 36, zip: "01730", active: true },
  { name: "Grace <&>", age: 45, zip: "02139", active: false },
];

const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", exportValue: (row) => row.name },
  { key: "age", header: "Age", exportValue: (row) => row.age },
  { key: "zip", header: "Zip", exportValue: (row) => row.zip },
  { key: "active", header: "Active", exportValue: (row) => row.active },
];

const tableOf = (rows: Row[] = ROWS, columns: ColumnModel<Row>[] = COLUMNS) =>
  buildExportTable(rows, columns);

afterEach(() => {
  document.documentElement.removeAttribute("dir");
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("exportCellText", () => {
  it("keeps primitives and blanks anything else", () => {
    expect(exportCellText("Ada")).toBe("Ada");
    expect(exportCellText(36)).toBe("36");
    expect(exportCellText(true)).toBe("true");
    expect(exportCellText(false)).toBe("false");
    expect(exportCellText(Number.NaN)).toBe("");
    expect(exportCellText(Number.POSITIVE_INFINITY)).toBe("");
    expect(exportCellText({ x: 1 })).toBe("");
    expect(exportCellText(null)).toBe("");
  });

  it("writes a date-only value as an ISO day", () => {
    expect(exportCellText(new Date("2026-08-15T00:00:00.000Z"))).toBe(
      "2026-08-15"
    );
  });

  it("writes a date-and-time without the T separator", () => {
    expect(exportCellText(new Date("2026-08-15T13:45:00.000Z"))).toBe(
      "2026-08-15 13:45"
    );
  });

  it("treats a local midnight as a day even when UTC is not", () => {
    const local = new Date(2026, 7, 15, 0, 0, 0, 0);
    expect(exportCellText(local)).toBe(local.toISOString().slice(0, 10));
  });

  it("drops an invalid date rather than writing Invalid Date", () => {
    expect(exportCellText(new Date(Number.NaN))).toBe("");
  });

  it("turns control characters and newlines into spaces", () => {
    expect(exportCellText("a\u0001b\tc\nd\re")).toBe("ab c d e");
  });
});

describe("resolvePrintDirection", () => {
  it("honours an explicit direction", () => {
    expect(resolvePrintDirection("rtl")).toBe("rtl");
    expect(resolvePrintDirection("ltr")).toBe("ltr");
  });

  it("inherits the document dir in a browser", () => {
    document.documentElement.setAttribute("dir", "rtl");
    expect(resolvePrintDirection()).toBe("rtl");
    document.documentElement.setAttribute("dir", "ltr");
    expect(resolvePrintDirection()).toBe("ltr");
  });

  it("falls back to ltr outside a window", () => {
    vi.spyOn(env, "isBrowser").mockReturnValue(false);
    expect(resolvePrintDirection()).toBe("ltr");
  });
});

describe("printStyles", () => {
  it("asks for A4 landscape by default and repeats the header", () => {
    const css = printStyles();
    expect(css).toContain("size:A4 landscape");
    expect(css).toContain("table-header-group");
    expect(css).toContain("break-inside:avoid");
    expect(css).toContain('tr[data-role="group"]');
    expect(css).toContain('tr[data-role="aggregate"]');
  });

  it("names each paper size the host asked for", () => {
    expect(printStyles({ pageSize: "a4" })).toContain("size:A4 portrait");
    expect(printStyles({ pageSize: "letter" })).toContain(
      "size:letter portrait"
    );
    expect(printStyles({ pageSize: "letter-landscape" })).toContain(
      "size:letter landscape"
    );
    expect(printStyles({ pageSize: "a4-landscape" })).toContain(
      "size:A4 landscape"
    );
  });

  it("adds a top-level group page break only when asked", () => {
    expect(printStyles()).not.toContain("adapttable-print-break-group");
    expect(printStyles({ pageBreak: "group" })).toContain(
      "adapttable-print-break-group"
    );
    expect(printStyles({ pageBreak: "group" })).toContain("break-before:page");
  });
});

describe("buildPrintTableHtml", () => {
  it("writes headers as column-scoped th and the resolved cells", () => {
    const html = buildPrintTableHtml(tableOf());
    expect(html).toContain('<th scope="col">Name</th>');
    expect(html).toContain(">Ada</td>");
    expect(html).toContain(">36</td>");
    expect(html).toContain(">01730</td>");
    expect(html).toContain(">true</td>");
  });

  it("escapes markup in cells rather than embedding it", () => {
    const html = buildPrintTableHtml(tableOf());
    expect(html).toContain("Grace &lt;&amp;&gt;");
    expect(html).not.toContain("Grace <&>");
  });

  it("honours stated column widths as weights", () => {
    const html = buildPrintTableHtml(
      buildExportTable(ROWS, [
        {
          key: "name",
          header: "Name",
          exportValue: (row) => row.name,
          width: 160,
        },
        { key: "age", header: "Age", exportValue: (row) => row.age, width: 80 },
      ])
    );
    expect(html).toContain('data-ch="20"');
    expect(html).toContain('data-ch="10"');
    expect(html).toContain("width:");
  });

  it("still emits a colgroup when no column stated a width", () => {
    const html = buildPrintTableHtml(tableOf());
    expect(html).toContain("<colgroup>");
    expect(html).toContain('<col style="width:');
    expect(html).not.toContain("data-ch=");
  });

  it("marks group and aggregate rows and indents leaves", () => {
    const html = buildPrintTableHtml(
      buildExportTable(ROWS, COLUMNS, {
        view: [
          { role: "group", label: "Core", level: 0, labelKey: "name" },
          { role: "data", row: ROWS[0]!, level: 1 },
          {
            role: "aggregate",
            label: "Core total",
            level: 0,
            labelKey: "name",
            values: { age: 36 },
          },
        ],
      })
    );
    expect(html).toContain('data-role="group"');
    expect(html).toContain('data-role="aggregate"');
    expect(html).toContain('data-level="1"');
    expect(html).toContain('scope="row"');
    expect(html).toContain("Core");
    expect(html).toContain("Core total");
    expect(html).toContain("padding-inline-start:22pt");
    expect(html).toContain('tbody class="print-group" data-level="0"');
  });

  it("starts a new tbody for each group", () => {
    const html = buildPrintTableHtml(
      buildExportTable(ROWS, COLUMNS, {
        view: [
          { role: "group", label: "A", level: 0, labelKey: "name" },
          { role: "data", row: ROWS[0]!, level: 1 },
          { role: "group", label: "B", level: 0, labelKey: "name" },
          { role: "data", row: ROWS[1]!, level: 1 },
        ],
      })
    );
    expect(html.match(/<tbody /g)).toHaveLength(2);
  });

  it("keeps a tree of data rows in one body and indents by level", () => {
    const html = buildPrintTableHtml(
      buildExportTable(ROWS, COLUMNS, {
        view: [
          { role: "data", row: ROWS[0]!, level: 0 },
          { role: "data", row: ROWS[1]!, level: 2 },
        ],
      })
    );
    expect(html.match(/<tbody /g)).toHaveLength(1);
    expect(html).toContain("padding-inline-start:38pt");
  });

  it("puts a caption on the table when a title is given", () => {
    const html = buildPrintTableHtml(tableOf(), { title: "People <x>" });
    expect(html).toContain("<caption>People &lt;x&gt;</caption>");
  });

  it("prefers an explicit caption over the title", () => {
    const html = buildPrintTableHtml(tableOf(), {
      title: "File",
      caption: "On the page",
    });
    expect(html).toContain("<caption>On the page</caption>");
    expect(html).not.toContain("<caption>File</caption>");
  });

  it("marks the table for group page breaks when asked", () => {
    const html = buildPrintTableHtml(tableOf(), { pageBreak: "group" });
    expect(html).toContain("adapttable-print-break-group");
  });

  it("writes an empty table as a table, not as nothing", () => {
    const html = buildPrintTableHtml(buildExportTable([], []));
    expect(html).toContain("<table");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody></tbody>");
    expect(html).not.toContain("<colgroup>");
  });

  it("falls back to a column key when the header is not text", () => {
    const html = buildPrintTableHtml(
      buildExportTable(ROWS, [
        { key: "name", header: 1 as never, exportValue: (row) => row.name },
      ])
    );
    expect(html).toContain(">name</th>");
  });
});

describe("buildPrintDocument", () => {
  it("is a complete document with the stylesheet and the table", () => {
    const html = buildPrintDocument(tableOf(), { title: "People" });
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("<title>People</title>");
    expect(html).toContain('charset="utf-8"');
    expect(html).toContain("table-header-group");
    expect(html).toContain(">Ada</td>");
  });

  it("sets lang and dir when the host provides them", () => {
    const html = buildPrintDocument(tableOf(), {
      lang: "ar",
      direction: "rtl",
      title: "الأشخاص",
    });
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("الأشخاص");
  });

  it("escapes a title that looks like markup", () => {
    const html = buildPrintDocument(tableOf(), { title: "A <B> & C" });
    expect(html).toContain("<title>A &lt;B&gt; &amp; C</title>");
  });

  it("inherits the document direction when none is given", () => {
    document.documentElement.setAttribute("dir", "rtl");
    expect(buildPrintDocument(tableOf())).toContain('dir="rtl"');
  });

  it("defaults the title rather than writing an empty one", () => {
    expect(buildPrintDocument(tableOf())).toContain("<title>Table</title>");
  });
});

describe("openPrintLayout", () => {
  it("is a no-op without a browser", () => {
    vi.spyOn(env, "isBrowser").mockReturnValue(false);
    const append = vi.spyOn(document.body, "appendChild");
    openPrintLayout(tableOf(), { title: "People" });
    expect(append).not.toHaveBeenCalled();
  });

  it("loads the document into a hidden iframe and prints it", () => {
    const print = vi.fn();
    const focus = vi.fn();
    const listeners = new Map<string, () => void>();
    const frameWindow = {
      print,
      focus,
      addEventListener: (type: string, fn: () => void) => {
        listeners.set(type, fn);
      },
    };
    const real = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, opts) => {
      const el = real(tag, opts);
      if (tag === "iframe") {
        Object.defineProperty(el, "contentWindow", {
          configurable: true,
          value: frameWindow,
        });
      }
      return el;
    });
    openPrintLayout(tableOf(), { title: "People" });
    const iframe = document.body.querySelector("iframe");
    expect(iframe?.getAttribute("title")).toBe("People");
    expect(iframe?.getAttribute("aria-hidden")).toBe("true");
    expect(iframe?.srcdoc).toContain("Ada");
    iframe?.dispatchEvent(new Event("load"));
    expect(focus).toHaveBeenCalled();
    expect(print).toHaveBeenCalled();
    listeners.get("afterprint")?.();
    expect(document.body.querySelector("iframe")).toBeNull();
  });

  it("removes the iframe when the frame has no window", () => {
    const real = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, opts) => {
      const el = real(tag, opts);
      if (tag === "iframe") {
        Object.defineProperty(el, "contentWindow", {
          configurable: true,
          value: null,
        });
      }
      return el;
    });
    openPrintLayout(tableOf());
    const iframe = document.body.querySelector("iframe");
    iframe?.dispatchEvent(new Event("load"));
    expect(document.body.querySelector("iframe")).toBeNull();
  });
});

describe("printTable", () => {
  it("is a no-op without a browser", () => {
    vi.spyOn(env, "isBrowser").mockReturnValue(false);
    const append = vi.spyOn(document.body, "appendChild");
    printTable({ rows: ROWS, columns: COLUMNS, title: "People" });
    expect(append).not.toHaveBeenCalled();
  });

  it("prints a grouped view the host assembled by hand", () => {
    const print = vi.fn();
    const frameWindow = {
      print,
      focus: vi.fn(),
      addEventListener: vi.fn(),
    };
    const real = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, opts) => {
      const el = real(tag, opts);
      if (tag === "iframe") {
        Object.defineProperty(el, "contentWindow", {
          configurable: true,
          value: frameWindow,
        });
      }
      return el;
    });
    printTable({
      rows: ROWS,
      columns: COLUMNS,
      title: "People",
      view: [
        { role: "group", label: "Core", level: 0, labelKey: "name" },
        { role: "data", row: ROWS[0]!, level: 1 },
      ],
      summary: { age: 36 },
    });
    const iframe = document.body.querySelector("iframe");
    expect(iframe?.srcdoc).toContain("Core");
    expect(iframe?.srcdoc).toContain("36");
    iframe?.dispatchEvent(new Event("load"));
    expect(print).toHaveBeenCalled();
  });
});

describe("a print document given a font", () => {
  it("carries the face with it and puts it first in the stack", () => {
    const css = printStyles({ font: new Uint8Array([1, 2, 3, 4]) });

    expect(css).toContain("@font-face{font-family:AdaptTablePrint");
    expect(css).toContain('format("truetype")');
    expect(css).toContain("data:font/ttf;base64,AQIDBA==");
    expect(css).toContain("font:11pt/1.35 AdaptTablePrint,system-ui");
  });

  it("accepts an ArrayBuffer, and encodes a font too big for one call", () => {
    // 0x8000 is the chunk size, so this crosses it twice.
    const big = new Uint8Array(0x14000).fill(0x41);
    const css = printStyles({ font: big.buffer });

    expect(css).toContain("data:font/ttf;base64,");
    // Base64 is four characters per three bytes, plus padding.
    expect(css).toContain("QUFB".repeat(20));
  });

  it("changes nothing about the stylesheet when no font is given", () => {
    expect(printStyles()).not.toContain("@font-face");
    expect(printStyles()).toContain("font:11pt/1.35 system-ui");
  });
});
