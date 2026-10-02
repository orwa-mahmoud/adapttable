/**
 * Row selection as signals: which rows are selected, the tri-state of the
 * select-all box, and the attributes of both checkboxes.
 *
 * Uncontrolled by default. Pass `selectedIds` to control it: the table then
 * shows exactly those ids and reports every change through
 * `onSelectionChange`, leaving the host to decide.
 */
import {
  applyGroupLeafSelection,
  createAllMatchingScope,
  headerSelectionOf,
  resolveLabels,
  type TableLabels,
  toggleId,
  toggleIds,
} from "@adapttable/core";
import type {
  HeaderSelectionState,
  SelectionState,
} from "@adapttable/core/binding";
import { computed, type Signal, signal } from "@angular/core";

import type { Attrs } from "../attrs";
import { type MaybeSignalOptional, readMaybe } from "../store";

/**
 * Options for {@link injectRowSelection}.
 *
 * @public
 */
export interface RowSelectionOptions<TRow> {
  /** The rows on screen — what select-all selects. */
  readonly rows: Signal<readonly TRow[]>;
  /** A row's stable id. */
  readonly rowKey: (row: TRow) => string;
  /** The selected ids, to control the selection. Omit to let it keep its own. */
  readonly selectedIds?: MaybeSignalOptional<readonly string[]>;
  /** Every change, as the full list of selected ids. */
  readonly onSelectionChange?: (ids: string[]) => void;
  /** Labels for the checkboxes' accessible names, over the English defaults. */
  readonly labels?: MaybeSignalOptional<TableLabels>;
  /**
   * Whether the source can answer for rows beyond the ones on screen, so
   * "select all N matching" can be offered. Defaults to `true`.
   */
  readonly acrossPages?: boolean;
}

/**
 * The selection a table renders from.
 *
 * @public
 */
export interface RowSelection {
  /** The selected ids. */
  readonly selectedIds: Signal<ReadonlySet<string>>;
  /** How many ids are selected. */
  readonly selectedCount: Signal<number>;
  /** Whether every, some or none of the rows on screen are selected. */
  readonly headerState: Signal<HeaderSelectionState>;
  /** Whether one id is selected. */
  readonly isSelected: (id: string) => boolean;
  /** Flip one id. */
  readonly toggle: (id: string) => void;
  /** Select every row on screen, or clear them when all are selected. */
  readonly toggleAll: () => void;
  /** Clear the selection. */
  readonly clear: () => void;
  /** Replace the selection with these ids, or clear it when omitted. */
  readonly replace: (ids: readonly string[] | undefined) => void;
  /** Flip a group's leaves as one: select the missing, or clear them all. */
  readonly toggleGroupLeaves: (ids: readonly string[]) => void;
  /** Whether the reader chose every matching row, across every page. */
  readonly allMatching: Signal<boolean>;
  /** Extend the selection to every matching row. */
  readonly selectAllMatching: () => void;
  /**
   * The selection in the shape every binding hands a kit's controls — what
   * the bulk-actions bar reads.
   */
  readonly state: Signal<SelectionState>;
  /** A row's checkbox: its name, its state and its toggle. */
  readonly rowCheckboxAttrs: (id: string) => Attrs;
  /** The select-all checkbox: its name, its tri-state and its toggle. */
  readonly headerCheckboxAttrs: () => Attrs;
}

/**
 * Row selection for a table. Hand the result to `injectDataTable`'s
 * `selection` so each row states whether it is selected.
 *
 * @param options - See {@link RowSelectionOptions}.
 * @returns The selection; see {@link RowSelection}.
 *
 * @public
 */
export function injectRowSelection<TRow>(
  options: RowSelectionOptions<TRow>
): RowSelection {
  const own = signal<ReadonlySet<string>>(new Set());
  const controlled = computed(() => {
    const ids = options.selectedIds && readMaybe(options.selectedIds);
    return ids === undefined ? undefined : new Set(ids);
  });
  const selectedIds = computed(() => controlled() ?? own());
  const visibleIds = computed(() => options.rows().map(options.rowKey));
  const headerState = computed(() =>
    headerSelectionOf(visibleIds(), selectedIds())
  );
  const labels = computed(() =>
    resolveLabels(options.labels && readMaybe(options.labels))
  );

  const scope = createAllMatchingScope();
  const allMatching = signal(scope.getSnapshot());
  scope.subscribe(() => {
    allMatching.set(scope.getSnapshot());
  });
  const acrossPages = options.acrossPages ?? true;

  const commit = (next: ReadonlySet<string>): void => {
    // Any explicit change narrows the scope back to concrete ids.
    scope.narrow();
    if (controlled() === undefined) own.set(next);
    options.onSelectionChange?.([...next]);
  };
  const isSelected = (id: string): boolean => selectedIds().has(id);
  const toggle = (id: string): void => {
    commit(toggleId(selectedIds(), id));
  };
  const toggleAll = (): void => {
    commit(toggleIds(selectedIds(), visibleIds()));
  };
  const clear = (): void => {
    commit(new Set());
  };
  const replace = (ids: readonly string[] | undefined): void => {
    commit(new Set(ids));
  };
  const toggleGroupLeaves = (ids: readonly string[]): void => {
    commit(applyGroupLeafSelection(ids, selectedIds()));
  };
  const selectAllMatching = (): void => {
    scope.select(acrossPages);
  };

  return {
    selectedIds,
    selectedCount: computed(() => selectedIds().size),
    headerState,
    isSelected,
    toggle,
    toggleAll,
    clear,
    replace,
    toggleGroupLeaves,
    allMatching: allMatching.asReadonly(),
    selectAllMatching,
    state: computed(() => ({
      selectedIds: selectedIds(),
      selectedCount: selectedIds().size,
      headerState: headerState(),
      isSelected,
      toggle,
      toggleGroupLeaves,
      toggleAll,
      clear,
      replace,
      visibleIds: visibleIds(),
      allMatching: allMatching(),
      selectAllMatching,
      acrossPages,
    })),
    rowCheckboxAttrs: (id) => ({
      type: "checkbox",
      "aria-label": labels().selectRow,
      checked: isSelected(id),
      onChange: () => {
        toggle(id);
      },
    }),
    headerCheckboxAttrs: () => ({
      type: "checkbox",
      "aria-label": labels().selectAll,
      checked: headerState() === "all",
      indeterminate: headerState() === "some",
      onChange: toggleAll,
    }),
  };
}
