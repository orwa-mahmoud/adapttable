import {
  type ColumnDef,
  createMemoryAdapter,
  useFrontendData,
} from "@adapttable/core";
import { render } from "@testing-library/react";
import { useMemo } from "react";
import { describe, expect, it } from "vitest";

import { shadcnClassNames } from "./classNames";
import { DataTable } from "./DataTable";
import { groupingPanel } from "./grouping-panel";

interface Row {
  id: string;
  team: string;
  status: string;
}

const columns: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "status", header: "Status", accessor: (row) => row.status },
];

function Harness() {
  const urlAdapter = useMemo(() => createMemoryAdapter(""), []);
  const source = useFrontendData({
    data: [{ id: "1", team: "Core", status: "Open" }],
    columns,
    urlAdapter,
  });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(row) => row.id}
      features={[groupingPanel<Row>(["team"], {})]}
    />
  );
}

describe("shadcn grouping panel", () => {
  it("re-exports the native panel with shadcn mappings on every new control", () => {
    render(<Harness />);

    expect(
      document.querySelector('[data-adapttable-part="grouping-panel"]')
    ).toHaveClass(...shadcnClassNames.groupingPanel.split(" "));
    expect(
      document.querySelector('[data-adapttable-part="grouping-chip-handle"]')
    ).toHaveClass(...shadcnClassNames.groupingChipHandle.split(" "));
    expect(
      document.querySelector('[data-adapttable-part="grouping-add"]')
    ).toHaveClass(...shadcnClassNames.groupingAdd.split(" "));

    expect(shadcnClassNames.columnMenuChoiceSelect).toContain(
      "focus-visible:ring-ring"
    );
  });
});
