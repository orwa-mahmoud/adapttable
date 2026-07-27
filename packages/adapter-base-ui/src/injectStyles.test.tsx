/**
 * Distribution guarantee: the chrome CSS actually ARRIVES for consumers —
 * rendering the table injects the stylesheet exactly once, without any
 * separate CSS import (the doc-claimed behavior).
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "1", name: "Ada" }];
const columns: ColumnDef<Row>[] = [{ key: "name" }];

function Harness() {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: createMemoryAdapter(""),
    columns,
  });
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}

describe("base-ui chrome styles", () => {
  it("rendering the table injects the stylesheet once", () => {
    render(<Harness />);
    const styles = document.head.querySelectorAll(
      "style[data-adapttable-base-ui]"
    );
    expect(styles).toHaveLength(1);
    expect(styles[0]!.textContent).toContain(".adapttable-base-ui");

    // A second table never duplicates the sheet.
    render(<Harness />);
    expect(
      document.head.querySelectorAll("style[data-adapttable-base-ui]")
    ).toHaveLength(1);
  });
});
