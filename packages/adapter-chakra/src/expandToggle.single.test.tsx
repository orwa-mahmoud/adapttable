import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { nestedTable } from "./nested-table";
import { rowDetail } from "./row-detail";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [{ key: "name", header: "Name" }];

const toggles = () =>
  document.querySelectorAll<HTMLElement>("tbody button[aria-expanded]");

/**
 * `rowDetail` and `nestedTable` fill the same expand control, and a row opens
 * one panel — so composing both draws one control per row, not two.
 */
describe("one expand toggle (chakra)", () => {
  it("draws a single toggle per row when both are composed", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable<Row>
          data={ROWS}
          columns={columns}
          rowKey={(r) => r.id}
          urlSync={false}
          forceMobile={false}
          features={[
            rowDetail<Row>((row) => <div>Detail for {row.name}</div>),
            nestedTable<Row>((row) => ({
              label: `Orders for ${row.name}`,
              table: () => <div>Nested for {row.name}</div>,
            })),
          ]}
        />
      </ChakraProvider>
    );
    expect(toggles()).toHaveLength(ROWS.length);
    fireEvent.click(toggles()[0]!);
    expect(toggles()[0]).toHaveAttribute("aria-expanded", "true");
  });

  it("draws one toggle per row for either feature alone", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable<Row>
          data={ROWS}
          columns={columns}
          rowKey={(r) => r.id}
          urlSync={false}
          forceMobile={false}
          features={[rowDetail<Row>((row) => <div>Detail for {row.name}</div>)]}
        />
      </ChakraProvider>
    );
    expect(toggles()).toHaveLength(ROWS.length);
  });
});
