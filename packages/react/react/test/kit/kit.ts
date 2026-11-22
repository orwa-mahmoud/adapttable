/**
 * A React kit as the shared kit suites exercise it.
 *
 * Every React kit ships the same feature factories, drawn with its own
 * controls, and the same `<DataTable>` props. A kit hands the suites its name,
 * how its tables render (its provider), its table and its factories; the
 * suites assert the behaviour every kit shares, once.
 */
import type {
  ActiveFilterChipsSlotProps,
  AdapterFiltersFeature,
  ChecklistFilterProps,
  createAdapterAgentApprovalFeature,
  createAdapterColumnLayoutFamily,
  createAdapterEditingFamily,
  createAdapterFilteringFamily,
  createAdapterStandardFeatures,
  createAdapterTableAssistantFeature,
  createAgentApproval,
  createColumnHeaderRename,
  createExportCsvButton,
  createFullscreenButton,
  createGroupHeader,
  createPrintButton,
  createRowReorderHandle,
  createUndoRedoButtons,
  FilterDef,
  FilterTreeBuilderProps,
  FilterTypeRegistry,
  KitPrimitives,
  KitTableProps,
  PivotPanelChromeProps,
  SavedViewsPanelChromeProps,
  SelectionStatsChromeProps,
  TableAssistantProps,
  TableLabels,
  TableQueryHandler,
  TableSource,
  UseServerDataOptions,
} from "@adapttable/react/adapter";
import type * as bindingFeatures from "@adapttable/react/features";
import {
  type FeatureProps,
  type StaticTableFeature,
} from "@adapttable/react/features";
import type { RenderResult } from "@testing-library/react";
import type { ComponentType, ReactElement, ReactNode } from "react";

/** The feature factories every React kit exports, by their shipped names. */
export type KitFeatureFactories = Omit<
  Pick<typeof bindingFeatures, FactoryName>,
  "filters" | "findInTable"
> & {
  /** Filtering, drawn with the kit's own form controls. */
  readonly filters: AdapterFiltersFeature;
  /** Find-in-table, with the kit's toolbar button unless `button` is false. */
  readonly findInTable: (options?: {
    readonly button?: boolean;
  }) => StaticTableFeature;
};

/** The names of the factories every React kit exports. */
type FactoryName =
  | "batchEditing"
  | "bulkActions"
  | "cellNavigation"
  | "cellSpan"
  | "collapsibleColumnGroups"
  | "columnMenu"
  | "columnSelectionCheckbox"
  | "commandPalette"
  | "contextMenu"
  | "densityChooser"
  | "dirtyIndicators"
  | "editHistory"
  | "editing"
  | "exportCsv"
  | "extraRows"
  | "filterTypes"
  | "filters"
  | "findInTable"
  | "fitColumns"
  | "fullscreen"
  | "grouping"
  | "groupingPanel"
  | "headerFilters"
  | "multiSort"
  | "nestedTable"
  | "pinnedSummaryRows"
  | "print"
  | "resizableColumns"
  | "rowActions"
  | "rowAppearance"
  | "rowDetail"
  | "rowEditing"
  | "rowPinning"
  | "rowReorder"
  | "savedViews"
  | "selectionStats"
  | "sidePanel"
  | "statusBar"
  | "tree"
  | "undoRedoButtons"
  | "virtualize";

/**
 * What the harness builds a server source from, the way a host would with
 * `useServerData`: a test that sets `onQueryChange` or `total` is served by
 * that source, with `data` as the server's current page.
 */
export interface HarnessServerProps {
  readonly total?: number;
  readonly onQueryChange?: TableQueryHandler;
  readonly supports?: NonNullable<UseServerDataOptions<unknown>["supports"]>;
  readonly facetKeys?: readonly string[];
  readonly facets?: NonNullable<UseServerDataOptions<unknown>["facets"]>;
  readonly numberExtraKeys?: readonly string[];
  readonly arrayExtraKeys?: readonly string[];
}

/**
 * The props a kit test table takes: the shipped props plus the enabling
 * props the harness turns into the kit's own features, and the server props
 * it turns into a server source.
 */
export type HarnessProps<TRow> = KitTableProps<TRow> &
  FeatureProps<TRow> &
  HarnessServerProps & {
    /** Compose row reorder, handing each move here. */
    readonly onRowReorder?: Parameters<
      typeof bindingFeatures.rowReorder<TRow>
    >[0];
  };

/** A table component that takes {@link HarnessProps}. */
export type HarnessTable = <TRow>(
  props: Readonly<HarnessProps<TRow>>
) => ReactNode;

/** What a kit hands the shared suites. */
export interface ReactKitDefinition {
  /** The kit's name, as suite titles show it. */
  readonly name: string;
  /** Render a tree inside the kit's provider. */
  readonly render: (ui: ReactElement) => RenderResult;
  /** The kit's shipped `<DataTable>`. */
  readonly Table: <TRow>(props: Readonly<KitTableProps<TRow>>) => ReactNode;
  /** The kit's feature factories. */
  readonly features: KitFeatureFactories;
  /**
   * The kit's own components and factories a shared suite drives directly,
   * each typed as the reference kit's. A kit lists the ones it ships.
   */
  readonly components?: Partial<KitComponents>;
  /**
   * The kit's table and body around a lone body row, for suites that render
   * a row component directly; plain `<table><tbody>` when the kit needs no
   * table context.
   */
  readonly TableBodyFrame?: ComponentType<{ readonly children: ReactNode }>;
  /** The controls the kit supplies to the binding's primitives. */
  readonly primitives?: Partial<KitPrimitives>;
  /** The kit's accessibility audit (`vitest-axe`'s `axe`), for suites that assert no violations. */
  readonly axe: (
    container: Element,
    options: { readonly rules: Readonly<Record<string, { enabled: boolean }>> }
  ) => Promise<{ readonly violations: readonly unknown[] }>;
}

/**
 * The kit components and factories the shared suites can drive, by their
 * shipped names, typed as the reference kit's.
 */
export interface KitComponents {
  readonly Chips: ComponentType<
    ActiveFilterChipsSlotProps & {
      readonly classNames: Readonly<Record<string, string | undefined>>;
    }
  >;
  readonly AutoFilterForm: <TRow>(
    props: Readonly<KitAutoFilterFormProps<TRow>>
  ) => ReactNode;
  readonly ChecklistFilter: <TRow>(
    props: Readonly<ChecklistFilterProps<TRow>>
  ) => ReactNode;
  readonly ColumnHeaderRename: ReturnType<typeof createColumnHeaderRename>;
  readonly FilterTreeBuilder: <TRow>(
    props: Readonly<FilterTreeBuilderProps<TRow>>
  ) => ReactNode;
  readonly GroupHeaderCard: ReturnType<
    typeof createGroupHeader
  >["GroupHeaderCard"];
  readonly GroupHeaderRow: ReturnType<
    typeof createGroupHeader
  >["GroupHeaderRow"];
  readonly AgentApproval: ReturnType<typeof createAgentApproval>;
  readonly RowReorderHandle: ReturnType<typeof createRowReorderHandle>;
  readonly PivotPanel: ComponentType<Omit<PivotPanelChromeProps, "slots">>;
  readonly SavedViewsPanel: ComponentType<
    Omit<SavedViewsPanelChromeProps, "slots">
  >;
  readonly SelectionStatsBar: ComponentType<
    Omit<SelectionStatsChromeProps, "slots">
  >;
  readonly ExportCsvButton: ReturnType<typeof createExportCsvButton>;
  readonly FullscreenButton: ReturnType<typeof createFullscreenButton>;
  readonly PrintButton: ReturnType<typeof createPrintButton>;
  readonly UndoRedoButtons: ReturnType<typeof createUndoRedoButtons>;
  readonly agentApproval: () => ReturnType<
    typeof createAdapterAgentApprovalFeature
  >;
  readonly TableAssistant: ComponentType<TableAssistantProps>;
  readonly tableAssistant: () => ReturnType<
    typeof createAdapterTableAssistantFeature
  >;
  readonly standardFeatures: ReturnType<typeof createAdapterStandardFeatures>;
  readonly editingFamily: ReturnType<typeof createAdapterEditingFamily>;
  readonly filteringFamily: ReturnType<typeof createAdapterFilteringFamily>;
  readonly columnLayoutFamily: ReturnType<
    typeof createAdapterColumnLayoutFamily
  >;
}

/** What every kit's filter form takes. */
export interface KitAutoFilterFormProps<TRow> {
  /** The resolved definitions, in render order. */
  readonly defs: readonly FilterDef<TRow>[];
  /** The filter bag the widgets read from and write to. */
  readonly source: Pick<
    TableSource<TRow>,
    "extra" | "setExtra" | "setExtras" | "allFilteredRows" | "facets"
  >;
  /** Resolved labels. */
  readonly labels: Required<TableLabels>;
  /** Type registry; the built-ins when omitted. */
  readonly registry?: FilterTypeRegistry;
}

/** A kit ready for the shared suites: its definition plus its test table. */
export interface ReactKitUnderTest extends ReactKitDefinition {
  /** The kit's table, composing its features from the enabling props. */
  readonly DataTable: HarnessTable;
}

/**
 * One of a kit's own components or factories, for a suite that drives it.
 * A suite runs only in kits that ship it; a kit that does not list it fails
 * here, naming the kit and the component.
 *
 * @param kit - The kit under test.
 * @param name - The component's shipped name.
 * @returns The kit's component.
 */
export function kitComponent<TName extends keyof KitComponents>(
  kit: ReactKitDefinition,
  name: TName
): KitComponents[TName] {
  const component = kit.components?.[name];
  if (component === undefined) {
    throw new Error(
      `The ${kit.name} kit does not list ${name} in its test components.`
    );
  }
  return component;
}
