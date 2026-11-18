import {
  defaultFilterRegistry,
  defaultLabels,
} from "@adapttable/react/adapter";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FilterFields } from "./components/AutoFilterForm";
import { DataTable } from "./data-table.test-utils";
import { filtersWith, rangeFilterWidget, textFilterWidget } from "./filters";

interface Row {
  id: string;
  name: string;
  age: number;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", age: 36 },
  { id: "2", name: "Alan", age: 41 },
];
const COLS = [
  { key: "name", header: "Name", accessor: (r: Row) => r.name },
  { key: "age", header: "Age", accessor: (r: Row) => r.age },
];
const source = {
  extra: {},
  setExtra: vi.fn(),
  setExtras: vi.fn(),
  allFilteredRows: ROWS,
};

describe("filtersWith (base-ui)", () => {
  it("draws each field with the widget composed for its kind", async () => {
    const filters = filtersWith([textFilterWidget, rangeFilterWidget]);
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[
          filters<Row>([
            { key: "name", label: "Name", type: "text" },
            { key: "age", label: "Age", type: "numberRange" },
          ]),
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-adapttable-part="filter-field"]')
      ).toHaveLength(2);
    });
  });

  it("names the filter and the widget it lacks", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      render(
        <FilterFields
          defs={[{ key: "status", label: "Status", type: "select" }]}
          source={source}
          labels={defaultLabels}
          registry={defaultFilterRegistry}
          widgets={[textFilterWidget]}
        />
      )
    ).toThrow('filter "status" of type "select" draws the "select" widget');
    vi.mocked(console.error).mockRestore();
  });
});
