/**
 * The framework-neutral table conformance suite, mounted through an Angular
 * kit.
 *
 * The scenario's switches become the kit's inputs and its own features, so
 * every Angular kit runs the same assertions against its own controls.
 */
import {
  type AdaptTableFeature,
  type CellEditHandler,
  type ColumnDef,
  injectServerData,
  type RowReorderHandler,
} from "@adapttable/angular";
import {
  type ConformanceDriver,
  type ConformanceHarness,
  type ConformanceRow,
  type ConformanceScenario,
  type ConformanceTest,
  tableConformanceTests,
} from "@adapttable/core/conformance";
import type { Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";

/** What an Angular kit hands the conformance suite. */
export interface AngularConformanceKit {
  /** The kit's name, as suite titles show it. */
  readonly name: string;
  /** The kit's `AdaptDataTable` component. */
  readonly Table: Type<unknown>;
  /** The kit's cell editing feature. */
  readonly editing: <TRow>(
    onCellEdit: CellEditHandler<TRow>
  ) => AdaptTableFeature;
  /** The kit's row reorder feature. */
  readonly rowReorder: <TRow>(
    onRowReorder: RowReorderHandler<TRow>
  ) => AdaptTableFeature;
  /** The kit's grouping feature. */
  readonly grouping: (columnKey: string) => AdaptTableFeature;
  /** The kit's virtualization feature. */
  readonly virtualize: () => AdaptTableFeature;
  /** The kit's row-selection feature. */
  readonly selection: () => AdaptTableFeature;
  /** The kit's keyboard-grid feature. */
  readonly cellNavigation: () => AdaptTableFeature;
}

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
function featuresFor(
  kit: AngularConformanceKit,
  scenario: ConformanceScenario
): AdaptTableFeature[] {
  const { editing, grouping, rowReorder, virtualize } = kit;
  const { onCellEdit, onRowReorder, groupBy } = scenario;
  return [
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
    ...(scenario.selectable ? [kit.selection()] : []),
    ...(scenario.navigable ? [kit.cellNavigation()] : []),
  ];
}

/**
 * Renders the kit's table for a conformance scenario.
 *
 * @param kit - The kit under test.
 * @returns The driver the neutral suite mounts through.
 */
export function angularConformanceDriver(
  kit: AngularConformanceKit
): ConformanceDriver {
  return {
    name: kit.name,
    mount: (scenario) => {
      const fixture = TestBed.createComponent(kit.Table);
      const set = (name: string, value: unknown): void => {
        fixture.componentRef.setInput(name, value);
      };
      const { onQueryChange } = scenario;
      // A server scenario is served by a server source, as a host builds one.
      const source = onQueryChange
        ? TestBed.runInInjectionContext(() =>
            injectServerData<ConformanceRow>({
              rows: scenario.rows,
              total: scenario.total ?? scenario.rows.length,
              urlSync: false,
              forceMobile: scenario.mobile ?? false,
              defaults:
                scenario.pageSize === undefined
                  ? undefined
                  : { limit: scenario.pageSize },
              onQueryChange: (query, info) => {
                onQueryChange(query, info);
              },
            })
          )
        : undefined;
      if (source) set("source", source);
      else set("data", scenario.rows);
      set("columns", columnsFor(scenario));
      set("rowKey", (row: ConformanceRow) => row.id);
      set("tableLabel", scenario.tableLabel);
      set("dir", scenario.dir ?? "ltr");
      set("forceMobile", scenario.mobile ?? false);
      set("labels", scenario.labels);
      set("urlSync", false);
      set("features", featuresFor(kit, scenario));
      if (scenario.virtualize) {
        set("paginationMode", "infinite");
        set("maxHeight", 200);
      }
      if (scenario.pageSize !== undefined) {
        set("defaults", { limit: scenario.pageSize });
      }
      const applyScenario = (): void => {
        set("onRowClick", scenario.onRowClick);
        set(
          "isCellFlashing",
          scenario.isCellFlashing === undefined
            ? undefined
            : (rowId: string, columnKey: string) =>
                scenario.isCellFlashing?.(rowId, columnKey) === true
        );
        set("searchPlaceholder", scenario.searchPlaceholder);
        set("onViewChange", scenario.onViewChange);
        fixture.detectChanges();
      };
      applyScenario();
      fixture.autoDetectChanges();
      const container = fixture.nativeElement as HTMLElement;
      document.body.append(container);
      return {
        container,
        refresh: () => applyScenario(),
        unmount: () => {
          fixture.destroy();
          container.remove();
        },
      };
    },
  };
}

/**
 * The neutral table conformance tests, mounted through an Angular kit.
 *
 * @param kit - The kit under test.
 * @param harness - The runner's `expect` and DOM Testing Library functions.
 * @returns The tests, for the kit's runner to register.
 */
export function angularTableConformanceTests(
  kit: AngularConformanceKit,
  harness: ConformanceHarness
): readonly ConformanceTest[] {
  return tableConformanceTests(angularConformanceDriver(kit), harness);
}
