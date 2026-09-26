import {
  type ConformanceDriver,
  type ConformanceRow,
  type ConformanceScenario,
  tableConformanceTests,
} from "@adapttable/core/conformance";
import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderMui } from "./test-utils";

function columnsFor(
  scenario: ConformanceScenario
): ColumnDef<ConformanceRow>[] {
  return scenario.columns.map((column) => ({
    key: column.key,
    header: column.header,
    sortable: column.sortable,
    accessor: (row: ConformanceRow) => row[column.key],
  }));
}

const driver: ConformanceDriver = {
  name: "mui",
  mount: (scenario) =>
    renderMui(
      <DataTable
        data={[...scenario.rows]}
        columns={columnsFor(scenario)}
        rowKey={(row) => row.id}
        urlSync={false}
        tableLabel={scenario.tableLabel}
        dir={scenario.dir}
        forceMobile={scenario.mobile}
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
