import {
  type ConformanceDriver,
  type ConformanceRow,
  type ConformanceScenario,
  tableConformanceTests,
} from "@adapttable/core/conformance";
import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cellNavigation } from "./cell-navigation";
import { DataTable } from "./data-table.test-utils";
import { editing } from "./editing";
import { grouping } from "./grouping";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";
import { renderBaseUi } from "./test-utils";
import { virtualize } from "./virtualize";

function columnsFor(
  scenario: ConformanceScenario
): ColumnDef<ConformanceRow>[] {
  return scenario.columns.map((column) => ({
    key: column.key,
    header: column.header,
    sortable: column.sortable,
    editable: scenario.onCellEdit !== undefined,
    accessor: (row: ConformanceRow) => row[column.key],
  }));
}

/** The features a scenario asks for, drawn with this kit. */
function featuresFor(scenario: ConformanceScenario) {
  const { onCellEdit, onRowReorder, groupBy } = scenario;
  return [
    ...(scenario.navigable ? [cellNavigation()] : []),
    ...(onCellEdit
      ? [
          editing<ConformanceRow>((row, key, value) => {
            onCellEdit(row.id, key, value);
          }),
        ]
      : []),
    ...(onRowReorder
      ? [
          rowReorder<ConformanceRow>((from, to, row) => {
            onRowReorder(from, to, row.id);
          }),
        ]
      : []),
    ...(groupBy ? [grouping(groupBy)] : []),
    ...(scenario.virtualize ? [virtualize()] : []),
  ];
}

const driver: ConformanceDriver = {
  name: "base-ui",
  mount: (scenario) =>
    renderBaseUi(
      <DataTable
        data={[...scenario.rows]}
        columns={columnsFor(scenario)}
        rowKey={(row) => row.id}
        urlSync={false}
        tableLabel={scenario.tableLabel}
        dir={scenario.dir}
        forceMobile={scenario.mobile}
        defaults={
          scenario.pageSize === undefined
            ? undefined
            : { limit: scenario.pageSize }
        }
        labels={scenario.labels}
        features={featuresFor(scenario)}
        {...(scenario.virtualize
          ? { paginationMode: "infinite" as const, maxHeight: 200 }
          : {})}
        bulkActions={
          scenario.selectable
            ? [{ key: "archive", label: "Archive", onClick: () => undefined }]
            : undefined
        }
      />
    ),
};

describe(`table conformance — ${driver.name}`, () => {
  for (const test of tableConformanceTests(driver, {
    expect,
    fireEvent,
    waitFor,
  })) {
    it(test.name, test.run);
  }
});
