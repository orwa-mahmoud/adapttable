import { type DataTable, filterChipsFor } from "@adapttable/angular";
import {
  type ActiveFilterChip,
  type Direction,
  filterDefForColumn,
  type FilterRuntime,
  showSimpleFilterFields,
  type TableSource,
} from "@adapttable/core";
import {
  type ActiveFilterChipsSlotProps,
  type FilterHeaderControlProps,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
  FilterTriggerToggleState,
} from "@adapttable/core/binding";
import { computed, type Signal, signal, type TemplateRef } from "@angular/core";

/** Where the Filters button's panel opens. @public */
export type FiltersMode = "popover" | "drawer";

/**
 * Everything the template draws for filters.
 *
 * @public
 */
export interface FiltersView {
  /** Whether the Filters button and its overlay show. */
  readonly button: boolean;
  /** Where the panel opens. */
  readonly mode: FiltersMode;
  /** Whether the panel is open. */
  readonly open: Signal<boolean>;
  /** How many filters are set. */
  readonly count: Signal<number>;
  /** The button's press, recorded so a click on an open popover closes it. */
  readonly pointerDown: () => void;
  /** The button's click. */
  readonly click: () => void;
  /** Open the panel. A context-menu Filter uses this. */
  readonly show: () => void;
  /** The form's props. */
  readonly form: Signal<FiltersFormSlotProps<never>>;
  /** The popover's or the drawer's props. */
  readonly overlay: Signal<FilterOverlaySlotProps<TemplateRef<unknown>>>;
  /** The chips' props. */
  readonly chips: Signal<ActiveFilterChipsSlotProps>;
  /** Whether header funnels show. */
  readonly header: boolean;
  /** A column's header funnel props, when the column has a filter. */
  readonly headerProps: Signal<
    ReadonlyMap<string, FilterHeaderControlProps<never>>
  >;
}

/** What the wiring reads from the table. @public */
export interface FiltersViewInput<TRow> {
  readonly table: DataTable<TRow>;
  readonly source: Signal<TableSource<TRow>>;
  readonly runtime: Signal<FilterRuntime<TRow>>;
  readonly mode: FiltersMode;
  readonly button: boolean;
  readonly header: boolean;
  readonly closeHeaderFilterOnSelect: boolean;
  readonly dir: Signal<Direction>;
  readonly extraChips: Signal<readonly ActiveFilterChip[]>;
  readonly form: Signal<TemplateRef<unknown> | undefined>;
  readonly trigger: Signal<TemplateRef<unknown> | undefined>;
}

/**
 * The filter wiring for one table.
 *
 * @param input - See {@link FiltersViewInput}.
 * @returns See {@link FiltersView}.
 * @public
 */
export function filtersViewFor<TRow>(
  input: FiltersViewInput<TRow>
): FiltersView {
  const { table, source, runtime } = input;
  const open = signal(false);
  const toggle = new FilterTriggerToggleState();
  const chips = filterChipsFor(source, runtime, table.labels, input.extraChips);
  const close = (): void => {
    open.set(false);
  };
  const simpleFields = showSimpleFilterFields(input.header);

  return {
    button: input.button,
    mode: input.mode,
    open: open.asReadonly(),
    count: computed(() => chips().count),
    pointerDown: () => {
      toggle.pointerDown(open());
    },
    click: () => {
      if (toggle.click(open())) open.update((value) => !value);
    },
    show: () => {
      open.set(true);
    },
    form: computed(() => ({
      defs: runtime().defs as never,
      source: source() as never,
      registry: runtime().registry,
      labels: table.labels(),
      defaultExpanded: !simpleFields,
      showSimpleFields: simpleFields,
    })),
    overlay: computed(() => ({
      open: open(),
      onClose: close,
      filters: input.form()!,
      activeFilterCount: chips().count,
      onClearFilters: table.clearFilters,
      labels: table.labels(),
      dir: input.dir(),
      children: input.trigger(),
    })),
    chips: computed(() => ({
      chips: chips().chips,
      onClearAll: table.clearFilters,
      labels: table.labels(),
    })),
    header: input.header,
    headerProps: computed(() => {
      const byColumn = new Map<string, FilterHeaderControlProps<never>>();
      const { defs, registry } = runtime();
      for (const column of table.columns()) {
        const def = filterDefForColumn(defs, column.key);
        if (!def) continue;
        byColumn.set(column.key, {
          def: def,
          source: source() as never,
          labels: table.labels(),
          registry,
          closeOnSelect: input.closeHeaderFilterOnSelect,
        });
      }
      return byColumn;
    }),
  };
}
