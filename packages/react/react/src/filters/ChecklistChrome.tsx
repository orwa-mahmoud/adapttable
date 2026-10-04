/**
 * Compact checklist layout. Structure only — adapters pass the search
 * field, action buttons and checkboxes the end user clicks. Options wrap
 * like the multi-select form; they never stack one value per row.
 *
 * Past {@link CHECKLIST_VIRTUALIZE_AT} options the list windows: a column
 * with hundreds of distinct values would otherwise mount hundreds of kit
 * checkboxes behind a 240px viewport. Windowing is structure, so it lives
 * here rather than in any adapter — the slots still render whatever their
 * kit renders, there are just fewer of them at a time.
 */
import {
  CHECKLIST_ITEM_WIDTH,
  CHECKLIST_LIST_HEIGHT,
  CHECKLIST_OPTION_GAP,
  filterLabel,
  resolveLabels,
} from "@adapttable/core";
import type {
  ChecklistFilterProps,
  ChecklistSlots as NeutralChecklistSlots,
} from "@adapttable/core/binding";
import { type CSSProperties, type ReactNode } from "react";

import { useChecklistFilter } from "./checklist";
import { useChecklistWindow } from "./checklistWindow";

export type { FilterDef, TableSource } from "@adapttable/core";
export type {
  ChecklistButtonProps,
  ChecklistCheckboxProps,
  ChecklistClassNames,
  ChecklistFilterProps,
  ChecklistSearchProps,
} from "@adapttable/core/binding";

/**
 * Adapter-supplied controls for {@link ChecklistChrome} — `@adapttable/core`'s
 * `ChecklistSlots` drawing React nodes.
 *
 * @public
 */
export type ChecklistSlots = NeutralChecklistSlots<ReactNode>;

/**
 * Props for {@link ChecklistChrome}.
 *
 * @public
 */
export interface ChecklistChromeProps<TRow> extends ChecklistFilterProps<TRow> {
  /** The kit's components for each part. */
  readonly slots: ChecklistSlots;
}

const LIST: CSSProperties = {
  maxHeight: CHECKLIST_LIST_HEIGHT,
  overflow: "auto",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: CHECKLIST_OPTION_GAP,
};

/**
 * The windowed list is a fixed viewport with rows that start at the top: the
 * spacers stand in for what is not mounted, so the box can never grow to fit
 * its content or the scrollbar would describe the window instead of the list.
 */
const WINDOWED_LIST: CSSProperties = {
  ...LIST,
  maxHeight: undefined,
  height: CHECKLIST_LIST_HEIGHT,
  alignItems: "flex-start",
  alignContent: "flex-start",
};

const OPTION: CSSProperties = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  maxWidth: "100%",
};

/**
 * Uniform cells while windowed. Options-per-row has to be arithmetic for the
 * window to know which row it is on, and a natural-width chip cloud has no
 * such number.
 */
const WINDOWED_OPTION: CSSProperties = {
  ...OPTION,
  flex: `0 0 ${CHECKLIST_ITEM_WIDTH}px`,
  minWidth: 0,
};

/** Forces a row break so the spacer holds open whole rows, not a gap in one. */
const SPACER: CSSProperties = { flexBasis: "100%", height: 0 };

/**
 * Distinct-values checklist layout. Returns `null` when the source has no
 * `allFilteredRows` and no facets — a server page must declare facets
 * before this widget can count a set it does not hold.
 *
 * @public
 */
export function ChecklistChrome<TRow>({
  def,
  source,
  labels: labelOverrides,
  classNames = {},
  slots,
}: Readonly<ChecklistChromeProps<TRow>>) {
  const labels = resolveLabels(labelOverrides);
  const state = useChecklistFilter(def, source);
  const window = useChecklistWindow(state.visible.length, state.virtualize);
  if (!state.available) return null;
  const Search = slots.Search;
  const Button = slots.Button;
  const Checkbox = slots.Checkbox;
  const mounted = state.visible.slice(window.start, window.end);

  return (
    <div
      data-adapttable-part="filter-checklist"
      className={classNames.filterChecklist ?? classNames.filterField}
      style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}
    >
      <div
        data-adapttable-part="filter-label"
        className={classNames.filterLabel}
      >
        {filterLabel(def)}
      </div>
      <Search
        label={labels.checklistSearch}
        value={state.query}
        className={classNames.filterChecklistSearch ?? classNames.filterInput}
        onChange={state.setQuery}
      />
      <div
        data-adapttable-part="filter-checklist-actions"
        className={classNames.filterChecklistActions}
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        <Button label={labels.selectAll} onClick={state.selectAllVisible} />
        <Button label={labels.checklistClear} onClick={state.clear} />
      </div>
      <div
        ref={window.ref}
        data-adapttable-part="filter-checklist-list"
        data-virtualized={state.virtualize ? "true" : "false"}
        className={
          classNames.filterChecklistList ?? classNames.filterCheckboxGroup
        }
        style={state.virtualize ? WINDOWED_LIST : LIST}
        onScroll={state.virtualize ? window.onScroll : undefined}
      >
        {window.padTop > 0 ? (
          <div style={{ ...SPACER, height: window.padTop }} />
        ) : null}
        {mounted.map((item) => (
          <div
            key={item.value}
            style={state.virtualize ? WINDOWED_OPTION : OPTION}
          >
            <Checkbox
              label={item.label}
              count={labels.groupCount(item.count)}
              checked={state.selected.includes(item.value)}
              className={classNames.filterCheckbox}
              countClassName={classNames.filterChecklistCount}
              onChange={(on) => state.toggle(item.value, on)}
            />
          </div>
        ))}
        {window.padBottom > 0 ? (
          <div style={{ ...SPACER, height: window.padBottom }} />
        ) : null}
        {state.visible.length === 0 ? (
          <span>{labels.checklistNoValues}</span>
        ) : null}
      </div>
    </div>
  );
}
