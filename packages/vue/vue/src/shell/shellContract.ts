import {
  type BulkAction,
  type CellEdit,
  type CellRange,
  type ConfirmHandler,
  type FilterDef,
  type FilterTypeSpec,
  type RowAction,
  type TableDensity,
  type TableQueryListener,
  type TableSource,
} from "@adapttable/core";
import {
  type FeatureListEntry,
  type FilterEngine,
  type RuntimeChromeInput,
  type TableAssistantProps,
  type TableRuntime,
  type TableRuntimeView,
} from "@adapttable/core/binding";
import { type MaybeRefOrGetter, type VNodeChild } from "vue";

import type { SummaryRowFn } from "../aggregate/aggregate";
import { type FooterContext } from "../columnDef";
import type { TableEditingOptions } from "../editing/editingModels";
import {
  type ComposedFeature,
  type FeatureMountContext,
} from "../features/tableFeature";
import {
  type RowActionControlsProjector,
  type TableBodyProjector,
} from "../layout/modelChannels";
import { type UseFrontendDataOptions } from "../source/useFrontendData";
import { type MaybeRefOrGetterOptional } from "../store";
import { type UseDataTableOptions } from "../useDataTable";

export interface DataTableSurface {
  scrollElement(): HTMLElement | null;
  rootElement?(): HTMLElement | null;
}
export interface DataTableHandle<TRow> {
  readonly runtime: TableRuntime<TRow>;
  readonly getView: () => TableRuntimeView<TRow> | undefined;
  focus(): void;
}
export interface UseDataTableShellOptions<TRow>
  extends
    Omit<UseDataTableOptions<TRow>, "source" | "selection">,
    Omit<
      UseFrontendDataOptions<TRow>,
      "data" | keyof UseDataTableOptions<TRow>
    > {
  readonly source?: MaybeRefOrGetterOptional<TableSource<TRow>>;
  /** Bound the rendered scroll body; CSS lengths are measured after mount. */
  readonly maxHeight?: number | string;
  /**
   * Frontend tier: every row; the table filters, sorts and pages them. A
   * server table passes a server `source` (`useServerData`) instead.
   */
  readonly data?: MaybeRefOrGetter<readonly TRow[]>;
  /**
   * Frontend tier: told of each committed change to page, page size,
   * search, sort and filters, never of the mount.
   */
  readonly onViewChange?: TableQueryListener;
  readonly features?: MaybeRefOrGetterOptional<
    readonly FeatureListEntry<ComposedFeature<NoInfer<TRow>>>[]
  >;
  readonly assistant?: MaybeRefOrGetterOptional<
    TableAssistantProps<VNodeChild>
  >;
  /** Maps the current source row scope to rendered footer values. */
  readonly summaryRow?: SummaryRowFn<TRow>;
  /** Table-wide fallback for columns without a footer renderer. */
  readonly footer?: (context: FooterContext<TRow>) => VNodeChild;
  readonly confirm?: ConfirmHandler;
  readonly density?: MaybeRefOrGetterOptional<TableDensity>;
  /**
   * Animate rows and cards as they mount. Off by default. Skipped when the
   * reader prefers reduced motion.
   */
  readonly animate?: MaybeRefOrGetterOptional<boolean>;
  readonly defaultDensity?: TableDensity;
  readonly onDensityChange?: (next: TableDensity) => void;
  readonly selectable?: MaybeRefOrGetter<boolean>;
  readonly selectedIds?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly defaultSelectedIds?: readonly string[];
  readonly onSelectionChange?: (ids: string[]) => void;
  readonly onCellPaste?: (edits: CellEdit<TRow>[]) => unknown;
  readonly onCellFill?: (edits: CellEdit<TRow>[]) => unknown;
  readonly onCellCut?: (range: CellRange) => void;
  readonly runtimeChannels?: MaybeRefOrGetter<
    Pick<
      RuntimeChromeInput<TRow>,
      | "filterDefs"
      | "filterRegistry"
      | "grouping"
      | "tree"
      | "editing"
      | "rowPinning"
    >
  >;
}
export interface ResolvedTableOptions<TRow>
  extends
    UseDataTableShellOptions<TRow>,
    Partial<
      Omit<
        TableEditingOptions<TRow>,
        "rows" | "columns" | "rowKey" | "featureHost"
      >
    > {
  readonly editingModel?: (
    context: FeatureMountContext<TRow>
  ) => void | (() => void);
  readonly bodyModel?: TableBodyProjector<TRow>;
  readonly filterEngine?: FilterEngine;
  readonly filters?: readonly FilterDef<TRow>[];
  readonly filterTypes?: readonly FilterTypeSpec[];
  readonly rowActionControls?: RowActionControlsProjector<TRow>;
  readonly undoRedoButtons?: boolean;
  readonly columnSelectionCheckbox?: boolean;
  readonly enableColumnMenu?: boolean;
  readonly statusBar?: boolean;
  readonly onCellRangeChange?: (range: CellRange | null) => void;
  readonly onCellCut?: (range: CellRange) => void;
  readonly onCellPaste?: (edits: CellEdit<TRow>[]) => unknown;
  readonly onCellFill?: (edits: CellEdit<TRow>[]) => unknown;
  readonly rowActions?: readonly RowAction<TRow>[];
  readonly bulkActions?: readonly BulkAction[];
  readonly [key: string]: unknown;
}
