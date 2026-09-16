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
});
