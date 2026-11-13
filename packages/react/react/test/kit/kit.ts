/**
 * A React kit as the shared kit suites exercise it.
 *
 * Every React kit ships the same feature factories, drawn with its own
 * controls, and the same `<DataTable>` props. A kit hands the suites its name,
 * how its tables render (its provider), its table and its factories; the
 * suites assert the behaviour every kit shares, once.
 */
import type {
  AdapterFiltersFeature,
  KitTableProps,
} from "@adapttable/react/adapter";
import type * as bindingFeatures from "@adapttable/react/features";
import {
  type FeatureProps,
  type StaticTableFeature,
} from "@adapttable/react/features";
import type { RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

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
  | "headerFilters"
  | "multiSort"
  | "nestedTable"
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
 * The props a kit test table takes: the shipped props plus the enabling
 * props the harness turns into the kit's own features.
 */
export type HarnessProps<TRow> = KitTableProps<TRow> &
  FeatureProps<TRow> & {
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
}

/** A kit ready for the shared suites: its definition plus its test table. */
export interface ReactKitUnderTest extends ReactKitDefinition {
  /** The kit's table, composing its features from the enabling props. */
  readonly DataTable: HarnessTable;
}
