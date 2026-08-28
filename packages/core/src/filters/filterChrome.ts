/**
 * How the table presents filters — one container, never stacked.
 *
 * @internal
 */
export type FilterChromeMode = "popover" | "drawer" | "header";

/**
 * Resolve the single filter chrome. `headerFilters` is an alias for
 * `"header"`. Header mode wins when both are passed so a host cannot
 * mount the toolbar overlay and the header row at once.
 *
 * @internal
 */
export function resolveFilterMode(
  mode?: FilterChromeMode,
  headerFilters?: boolean
): FilterChromeMode {
  if (headerFilters === true || mode === "header") return "header";
  if (mode === "drawer") return "drawer";
  return "popover";
}

/**
 * Whether the toolbar still shows Filters. Header mode hides that button
 * for the simple form (the icons own those fields) but keeps it when the
 * AND/OR tree is on — the tree has no column of its own.
 *
 * @internal
 */
export function toolbarShowsFilters(
  mode: FilterChromeMode,
  hasForm: boolean,
  hasFilterTree: boolean
): boolean {
  if (!hasForm) return false;
  return mode !== "header" || hasFilterTree;
}

/**
 * Whether the per-field form mounts inside Filters. Header icons own those
 * fields; `filterFields={false}` keeps only the AND/OR tree.
 *
 * @internal
 */
export function showSimpleFilterFields(
  headerFiltersOn: boolean,
  filterFields?: boolean
): boolean {
  if (headerFiltersOn) return false;
  return filterFields !== false;
}
