import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  note: string;
}
const ROWS: Row[] = [{ id: "1", name: "Ada", note: "note" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, minWidth: 120 },
  { key: "note", header: "Note", accessor: (r) => r.note, flex: 2 },
];

/**
 * Flex columns and size-to-container for the chakra adapter.
 *
 * The mechanism is CSS the browser already knows — a fixed table layout with
 * percentage widths — so what each kit has to get right is applying it to its
 * own table element and its own cells.
 */
describe("column sizing (chakra)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          {...extra}
        />
      </ChakraProvider>
    );
  const head = (key: string) =>
    document.querySelector<HTMLElement>(`thead [data-column-key="${key}"]`)!;

  it("carries the bounds a column declares", () => {
    table();
    expect(head("name").style.minWidth).toBe("120px");
  });

  it("gives a flex column its share even without the fitting mode", () => {
    // It asked for a share; the other column keeps its own size.
    table();
    expect(head("note").style.width).toBe("100%");
  });

  it("shares the container between the columns when asked to fit", () => {
    table({ fitColumns: true });
    // Two parts to one: the flex column takes two thirds.
    expect(head("note").style.width).toBe("66.66666666666666%");
    expect(head("name").style.width).toBe("33.33333333333333%");
  });

  it("fixes the table layout so those percentages mean something", () => {
    const { container } = table({ fitColumns: true });
    const el = container.querySelector<HTMLElement>("table")!;
    expect(el.style.tableLayout).toBe("fixed");
    expect(el.style.width).toBe("100%");
  });

  it("leaves the table alone without the prop", () => {
    const { container } = table();
    expect(
      container.querySelector<HTMLElement>("table")!.style.tableLayout
    ).toBe("");
  });
});
