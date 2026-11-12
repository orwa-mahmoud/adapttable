/**
 * The toolbar, drawn once for every kit.
 *
 * The binding owns what the toolbar holds and in which order: the host's
 * start slot, search, the mobile sort controls, the host's toolbar content,
 * the filters button and its popover, the saved-views and columns menus, the
 * extras the composed features add, add-row, the host's end slot and the
 * rows-per-page choice. A kit hands over each control and a frame that lays
 * the search and the controls out.
 */
import { pageSizeOptions, type SortByOption } from "@adapttable/core";
import {
  type ComponentType,
  type ReactElement,
  type ReactNode,
  type Ref,
  useRef,
} from "react";

import { FeatureSlot } from "../features/providers";
import { FILTER_POPOVER, TOOLBAR_EXTRAS } from "../features/slotKeys";
import type { KitButtonProps } from "./primitives";
import type { KitToolbarProps } from "./tableComposition";

/**
 * The search field: the binding's input attributes, which the kit spreads on
 * its input.
 *
 * @public
 */
export interface KitToolbarSearchProps {
  /** The input's attributes: value, type, role, name and change handler. */
  readonly input: ReturnType<
    KitToolbarProps<unknown>["table"]["getSearchInputProps"]
  >;
}

/**
 * The sort-by choice on a phone.
 *
 * @public
 */
export interface KitToolbarSortProps {
  /** The control's name. */
  readonly label: string;
  /** The sorted column's key; empty while unsorted. */
  readonly value: string;
  /** The sortable columns. */
  readonly options: readonly SortByOption[];
  /** Sort by a column, or stop sorting. */
  readonly onValueChange: (value: string | undefined) => void;
}

/**
 * The button that opens the filters.
 *
 * @public
 */
export interface KitFiltersButtonProps {
  /** The button element, which an anchored popover opens from. */
  readonly elementRef: Ref<HTMLButtonElement>;
  /** Its caption. */
  readonly label: string;
  /** How many filters are on. */
  readonly count: number;
  /** Whether the popover is open; absent when the filters open elsewhere. */
  readonly expanded: boolean | undefined;
  /** Whether the filters are open, wherever they open. */
  readonly open: boolean;
  /** Pressed, before the click: pairs with the popover's outside-press. */
  readonly onPointerDown: () => void;
  /** Toggle the filters. */
  readonly onClick: () => void;
}

/**
 * The rows-per-page choice.
 *
 * @public
 */
export interface KitRowsPerPageProps {
  /** The control's name. */
  readonly label: string;
  /** The page size. */
  readonly value: number;
  /** The sizes to choose from. */
  readonly options: readonly number[];
  /** Choose a size. */
  readonly onValueChange: (value: number) => void;
}

/**
 * The toolbar's regions, for a kit's frame to lay out.
 *
 * @public
 */
export interface KitToolbarFrameProps {
  /** The host's start slot. */
  readonly start: ReactNode;
  /** The search field. */
  readonly search: ReactNode;
  /** Everything after the search, in order. */
  readonly controls: ReactNode;
}

/**
 * What a kit hands {@link createToolbar}.
 *
 * @public
 */
export interface KitToolbar {
  /** Lays the search and the controls out. */
  readonly Frame: ComponentType<KitToolbarFrameProps>;
  /** The search field. */
  readonly Search: ComponentType<KitToolbarSearchProps>;
  /** The sort-by choice on a phone. */
  readonly SortSelect: ComponentType<KitToolbarSortProps>;
  /** The toolbar's buttons: the sort direction outlined, add-row filled. */
  readonly Button: ComponentType<KitButtonProps>;
  /** The button that opens the filters. */
  readonly FiltersButton: ComponentType<KitFiltersButtonProps>;
  /**
   * How the kit's filters popover finds its trigger: anchored to the
   * button's element, or wrapping the button.
   */
  readonly filtersPopover: "anchor" | "wrap";
  /** The rows-per-page choice. */
  readonly RowsPerPage: ComponentType<KitRowsPerPageProps>;
}

/**
 * Build a kit's toolbar.
 *
 * @param kit - The kit's controls and frame.
 * @returns The toolbar component.
 *
 * @public
 */
export function createToolbar(
  kit: KitToolbar
): <TRow>(props: Readonly<KitToolbarProps<TRow>>) => ReactElement {
  const { Frame, Search, SortSelect, Button, FiltersButton, RowsPerPage } = kit;
  return function Toolbar<TRow>(
    props: Readonly<KitToolbarProps<TRow>>
  ): ReactElement {
    const { table, hasFilters, filtersMode, filtersOpen } = props;
    const { labels, source } = table;
    const anchorRef = useRef<HTMLButtonElement>(null);
    const sortOptions =
      props.sortByOptions ?? (table.isMobile ? table.sortByOptions : undefined);
    const sortable = sortOptions !== undefined && sortOptions.length > 0;
    const popover = hasFilters && filtersMode === "popover";
    const filtersButton = hasFilters ? (
      <FiltersButton
        elementRef={anchorRef}
        label={labels.filters}
        count={props.activeFilterCount}
        expanded={popover ? filtersOpen : undefined}
        open={filtersOpen}
        onPointerDown={props.onFiltersTriggerPointerDown}
        onClick={props.onToggleFilters}
      />
    ) : null;
    const overlay = {
      open: filtersOpen,
      onClose: props.onCloseFilters,
      filters: props.filters,
      activeFilterCount: props.activeFilterCount,
      onClearFilters: props.onClearFilters,
      labels,
      dir: props.dir,
    };
    let filters: ReactNode = filtersButton;
    if (popover && kit.filtersPopover === "wrap") {
      filters = (
        <FeatureSlot
          slot={FILTER_POPOVER}
          props={{ ...overlay, children: filtersButton }}
        />
      );
    } else if (popover) {
      filters = (
        <>
          {filtersButton}
          <FeatureSlot
            slot={FILTER_POPOVER}
            props={{ ...overlay, anchorEl: anchorRef.current }}
          />
        </>
      );
    }
    const descending = source.sortDir === "desc";
    return (
      <Frame
        start={props.toolbarSlots?.start}
        search={
          props.searchable === false ? null : (
            <Search
              input={table.getSearchInputProps(
                props.searchPlaceholder
                  ? { placeholder: props.searchPlaceholder }
                  : undefined
              )}
            />
          )
        }
        controls={
          <>
            {sortable && (
              <SortSelect
                label={labels.sortBy}
                value={source.sortBy ?? ""}
                options={sortOptions}
                onValueChange={(value) =>
                  source.setSort(value, source.sortDir ?? "asc")
                }
              />
            )}
            {table.isMobile && sortable && (
              <Button
                variant="outlined"
                data-adapttable-part="sort-direction"
                disabled={!source.sortBy}
                aria-label={
                  descending ? labels.sortAscending : labels.sortDescending
                }
                onClick={() =>
                  source.setSort(source.sortBy, descending ? "asc" : "desc")
                }
              >
                {descending ? labels.sortDescending : labels.sortAscending}
              </Button>
            )}
            {props.toolbar}
            {filters}
            {props.savedViewsMenu}
            {props.columnMenu}
            <FeatureSlot
              slot={TOOLBAR_EXTRAS}
              props={{
                onUndo: props.onUndo,
                onRedo: props.onRedo,
                canUndo: props.canUndo,
                canRedo: props.canRedo,
                undoLabel: props.undoLabel,
                redoLabel: props.redoLabel,
                onPrint: props.onPrint,
                printLabel: props.printLabel,
                density: props.density,
                onDensityChange: props.onDensityChange,
                onToggleFullscreen: props.onToggleFullscreen,
                isFullscreen: props.isFullscreen,
                onExportCsv: props.onExportCsv,
                exportBusy: props.exportBusy,
                exportAnnouncement: props.exportAnnouncement ?? "",
                exportProgressState: props.exportProgressState,
                exportLabel: props.exportLabel,
                exportDisabled: props.exportDisabled,
                exportDisabledReason: props.exportDisabledReason,
                labels,
              }}
            />
            {props.onAddRow && (
              <Button
                variant="filled"
                data-adapttable-part="add-row"
                onClick={props.onAddRow}
              >
                {props.addRowLabel}
              </Button>
            )}
            {props.toolbarSlots?.end}
            {props.showRowsPerPage && (
              <RowsPerPage
                label={labels.rowsPerPage}
                value={source.limit}
                options={pageSizeOptions([source.limit, source.defaultLimit])}
                onValueChange={source.setLimit}
              />
            )}
          </>
        }
      />
    );
  };
}
