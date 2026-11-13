/**
 * The framework-neutral table conformance suite, mounted through a React kit.
 *
 * The scenario's switches become the kit's own features, so every React kit
 * runs the same assertions against its own controls.
 */
import {
  type ConformanceDriver,
  type ConformanceRow,
  type ConformanceScenario,
  type ConformanceTest,
  tableConformanceTests,
} from "@adapttable/core/conformance";
import type { ColumnDef } from "@adapttable/react";
import type { TableFeature } from "@adapttable/react/features";
import { fireEvent, waitFor } from "@testing-library/react";
import { expect } from "vitest";

import type { ReactKitUnderTest } from "./kit";

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

/** The features a scenario asks for, drawn with the kit's factories. */
function featuresFor(
  kit: ReactKitUnderTest,
  scenario: ConformanceScenario
): TableFeature<ConformanceRow>[] {
  const { cellNavigation, editing, grouping, rowReorder, virtualize } =
    kit.features;
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

/**
 * Renders the kit's table for a conformance scenario.
 *
 * @param kit - The kit under test.
 * @returns The driver the neutral suite mounts through.
 */
export function reactConformanceDriver(
  kit: ReactKitUnderTest
): ConformanceDriver {
  const { DataTable } = kit;
  return {
    name: kit.name,
    mount: (scenario) => {
      const element = () => (
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
          onRowClick={scenario.onRowClick}
          isCellFlashing={
            scenario.isCellFlashing === undefined
              ? undefined
              : (rowId: string, columnKey: string) =>
                  scenario.isCellFlashing?.(rowId, columnKey) === true
          }
          searchPlaceholder={scenario.searchPlaceholder}
          onQueryChange={scenario.onQueryChange}
          total={scenario.total}
          mode={scenario.mode === "frontend" ? "frontend" : undefined}
          features={featuresFor(kit, scenario)}
          {...(scenario.virtualize
            ? { paginationMode: "infinite" as const, maxHeight: 200 }
            : {})}
          bulkActions={
            scenario.selectable
              ? [{ key: "archive", label: "Archive", onClick: () => undefined }]
              : undefined
          }
        />
      );
      const view = kit.render(element());
      return {
        container: view.container,
        unmount: () => view.unmount(),
        refresh: () => view.rerender(element()),
      };
    },
  };
}

/**
 * The neutral table conformance tests, mounted through a React kit.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function reactTableConformanceTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  return tableConformanceTests(reactConformanceDriver(kit), {
    expect,
    fireEvent,
    waitFor,
  });
}
