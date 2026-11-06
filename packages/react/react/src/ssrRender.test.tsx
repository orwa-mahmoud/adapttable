// @vitest-environment node
/**
 * What the engine does on a server, where there is no DOM.
 *
 * Streaming SSR renders the tree before the browser exists. Anything that
 * reaches for `window`, `document`, `matchMedia` or `localStorage` during that
 * pass throws, and the failure surfaces in the host application rather than
 * here — so these render the real hooks through `renderToString` and assert
 * they come back with markup instead of an exception.
 *
 * The docblock above matters: without it these run under jsdom, where
 * `window` exists and the test proves nothing.
 */
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useFrontendData } from "./source/useFrontendData";
import { useServerData } from "./source/useServerData";
import { createMemoryAdapter } from "./url/adapter";
import { useDataTable } from "./useDataTable/useDataTable";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];

const COLUMNS = [{ key: "name", accessor: (row: Row) => row.name }];

describe("server rendering", () => {
  it("really is running without a DOM", () => {
    // Guards the docblock above: if the environment ever reverts to jsdom,
    // every assertion below becomes decorative and this is what says so.
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("renders the frontend tier with no DOM present", () => {
    function Harness() {
      const source = useFrontendData({ data: ROWS, columns: COLUMNS });
      return <output>{source.rows.map((row) => row.name).join(",")}</output>;
    }
    expect(renderToString(<Harness />)).toContain("Ada,Grace");
  });

  it("resolves auto pagination from forceMobile on the server", () => {
    function Harness() {
      const source = useFrontendData({
        data: ROWS,
        columns: COLUMNS,
        urlAdapter: createMemoryAdapter(""),
        paginationMode: "auto",
        forceMobile: true,
      });
      return <output>{source.paginationMode}</output>;
    }
    expect(renderToString(<Harness />)).toContain("infinite");
  });

  it("renders the server tier with no DOM present", () => {
    function Harness() {
      const source = useServerData<Row>({
        rows: ROWS,
        total: 2,
        // The SSR seams: an in-memory URL backend, and an explicit layout
        // instead of a media query the server cannot answer.
        urlAdapter: createMemoryAdapter(""),
        forceMobile: false,
      });
      return <output>{source.total}</output>;
    }
    expect(renderToString(<Harness />)).toContain("2");
  });

  it("renders the table shell with no DOM present", () => {
    function Harness() {
      const source = useFrontendData({ data: ROWS, columns: COLUMNS });
      const table = useDataTable<Row>({
        source,
        columns: COLUMNS,
        rowKey: (row) => row.id,
        forceMobile: false,
      });
      return <output>{table.columns.length}</output>;
    }
    expect(renderToString(<Harness />)).toContain("1");
  });

  it("renders the same markup on a second pass, so hydration has one answer", () => {
    function Harness() {
      const source = useFrontendData({ data: ROWS, columns: COLUMNS });
      return <output>{source.rows.length}</output>;
    }
    expect(renderToString(<Harness />)).toBe(renderToString(<Harness />));
  });

  it("keeps two request locales and their row ids apart", () => {
    interface Named extends Row {
      nameEn: string;
      nameAr: string;
    }
    const rows: Named[] = [
      { id: "en-first", name: "Ada", nameEn: "Ada", nameAr: "زيد" },
      { id: "ar-first", name: "Zed", nameEn: "Zed", nameAr: "آدا" },
    ];
    const columns = [
      {
        key: "nameEn",
        accessor: (row: Named) => row.nameEn,
        i18n: { ar: "nameAr" },
      },
    ];
    function Harness({ locale }: { locale: string }) {
      const source = useFrontendData({
        data: rows,
        columns,
        locale,
        getRowId: (row) => row.id,
        urlAdapter: createMemoryAdapter(""),
        defaults: { sortBy: "nameEn", sortDir: "asc" },
        forceMobile: false,
      });
      return <output>{source.rows.map((row) => row.id).join(",")}</output>;
    }
    const english = () => renderToString(<Harness locale="en" />);
    const arabic = () => renderToString(<Harness locale="ar" />);
    const enFirst = english();
    const arFirst = arabic();
    expect(english()).toBe(enFirst);
    expect(arabic()).toBe(arFirst);
    expect(enFirst).toContain("en-first,ar-first");
    expect(arFirst).toContain("ar-first,en-first");
    expect(enFirst).not.toContain("ar-first,en-first");
  });
});
