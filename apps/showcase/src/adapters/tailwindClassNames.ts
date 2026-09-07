import type { DataTableClassNames } from "@adapttable/unstyled";

/**
 * The Tailwind kit's class map — the "bring your own classes" look.
 *
 * Its own module because two call sites need it: the Tailwind adapter demo,
 * and `kitClassNames` in `kitProviders.tsx` for the pages that mount a table
 * directly instead of going through an adapter demo. `@adapttable/unstyled`
 * renders native controls by contract, so this map IS the kit's appearance —
 * a page that omits it shows raw HTML under a tab labelled Tailwind.
 *
 * Deliberately distinct from the shadcn preset: an INDIGO accent, gray
 * neutrals, softer radii. Same headless adapter, different visual character.
 */
export const tailwindClassNames: DataTableClassNames = {
  root: "rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
  toolbar:
    "flex flex-wrap items-center gap-2 p-3 border-b border-gray-200 dark:border-zinc-700",
  searchField:
    "flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-zinc-600 dark:bg-zinc-900 dark:focus-within:ring-indigo-900/40",
  searchIcon: "text-gray-400",
  search:
    "w-full bg-transparent text-sm outline-none placeholder:text-gray-400",
  sortSelect:
    "h-9 rounded-md border border-gray-300 px-2 text-sm dark:border-zinc-600 dark:bg-zinc-900",
  rowsPerPage:
    "h-8 rounded-md border border-indigo-200 bg-white px-1.5 text-sm dark:border-indigo-900/60 dark:bg-zinc-900",
  filtersButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800",
  filtersBackdrop: "fixed inset-0 z-40 bg-gray-900/30 dark:bg-black/50",
  filtersPanel:
    "fixed inset-y-0 end-0 z-50 flex w-[420px] max-w-[88vw] flex-col border-s border-gray-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900",
  filtersPopover:
    "z-50 mt-2 w-80 max-w-[88vw] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900",
  filtersCount:
    "inline-grid h-5 min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-xs font-bold leading-none text-white",
  filtersHeader:
    "flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-zinc-700",
  filtersTitle: "text-base font-semibold text-gray-900 dark:text-zinc-100",
  filtersClose:
    "flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
  filtersBody: "flex flex-1 flex-col gap-6 overflow-auto p-4",
  filtersForm: "flex flex-col gap-6",
  // ── Auto-built filter form (declarative `filters` definitions) ──
  filterField: "m-0 flex min-w-0 flex-col gap-4 border-0 p-0",
  filterLabel: "p-0 text-xs font-medium text-gray-500 dark:text-zinc-400",
  filterInput:
    "h-9 w-full rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900/40",
  filterSelect:
    "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900/40",
  filterCheckboxGroup: "flex flex-wrap gap-2.5",
  filterCheckbox:
    "inline-flex cursor-pointer select-none items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-600 has-[:checked]:text-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-500 [&>input]:sr-only",
  filtersFooter:
    "flex items-center justify-between gap-2 border-t border-gray-200 p-4 dark:border-zinc-700",
  filtersClear:
    "h-9 rounded-md px-3 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800",
  filtersDone:
    "h-9 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600",
  table: "w-full border-collapse text-sm",
  // Sticky (and pinned) cells must be opaque so scrolled rows never show through.
  headerCell:
    "border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-start font-semibold text-gray-500 [&[data-sticky]]:bg-gray-50 [&[data-pinned]]:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:[&[data-sticky]]:bg-zinc-800 dark:[&[data-pinned]]:bg-zinc-800",
  sortButton:
    "inline-flex items-center gap-1 font-semibold text-gray-600 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400",
  row: "border-b border-gray-100 last:border-0 hover:bg-gray-50 data-[selected]:bg-indigo-50 data-[dragging]:opacity-60 data-[drop=before]:shadow-[inset_0_2px_0_0_theme(colors.indigo.500)] data-[drop=after]:shadow-[inset_0_-2px_0_0_theme(colors.indigo.500)] dark:border-zinc-800 dark:hover:bg-zinc-800/60 dark:data-[selected]:bg-indigo-500/15",
  cell: "px-3 py-2.5 [&[data-pinned]]:bg-white dark:[&[data-pinned]]:bg-zinc-900",
  actionButton:
    "h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
  footer:
    "flex flex-wrap items-center gap-2 border-t border-gray-200 p-3 text-sm text-gray-600 dark:border-zinc-700 dark:text-zinc-400",
  pager: "ms-auto flex flex-wrap items-center gap-1",
  pagePrev:
    "inline-grid h-8 min-w-8 place-items-center rounded-md border border-gray-300 px-2 hover:bg-gray-50 disabled:opacity-50 aria-[current=page]:border-indigo-600 aria-[current=page]:bg-indigo-600 aria-[current=page]:text-white dark:border-zinc-600 dark:hover:bg-zinc-800",
  pageNext:
    "inline-grid h-8 min-w-8 place-items-center rounded-md border border-gray-300 px-2 hover:bg-gray-50 disabled:opacity-50 aria-[current=page]:border-indigo-600 aria-[current=page]:bg-indigo-600 aria-[current=page]:text-white dark:border-zinc-600 dark:hover:bg-zinc-800",
  pageNumber:
    "inline-grid h-8 min-w-8 place-items-center rounded-md border border-gray-300 px-2 hover:bg-gray-50 disabled:opacity-50 aria-[current=page]:border-indigo-600 aria-[current=page]:bg-indigo-600 aria-[current=page]:text-white dark:border-zinc-600 dark:hover:bg-zinc-800",
  pageEllipsis:
    "grid h-8 place-items-center px-1 text-gray-400 dark:text-zinc-500",
  chips: "flex flex-wrap gap-2 px-3 pb-2",
  chip: "inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  chipRemove:
    "rounded px-1 text-indigo-500 transition-colors hover:text-indigo-800 dark:hover:text-indigo-200",
  empty:
    "flex flex-wrap items-center justify-center gap-3 px-4 py-10 text-sm text-zinc-500 dark:text-zinc-400",
  emptyClear:
    "rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800",
  // ── Column popover ──────────────────────────────────────────────
  columnMenuButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 data-[active]:border-indigo-400 data-[active]:bg-indigo-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:data-[active]:bg-indigo-500/15",
  columnMenuPanel:
    "z-50 min-w-[264px] rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900",
  columnMenuHeader: "px-1.5 pb-1.5 pt-1",
  columnMenuTitle:
    "text-[11px] font-semibold uppercase tracking-wider text-gray-400",
  columnMenuItem:
    "flex cursor-grab items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800",
  columnMenuGrip: "inline-flex cursor-grab text-gray-300 hover:text-gray-500",
  columnMenuLabel:
    "flex-1 truncate text-[13px] font-medium text-gray-700 data-[hidden]:text-gray-400 data-[hidden]:line-through dark:text-zinc-300 dark:data-[hidden]:text-zinc-500",
  columnMenuVisibility:
    "inline-grid place-items-center rounded p-[3px] text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
  columnMenuPin:
    "inline-grid place-items-center rounded p-[3px] text-gray-400 hover:bg-gray-100 data-[active]:text-indigo-600 dark:hover:bg-zinc-800 dark:data-[active]:text-indigo-400",
  columnMenuReset:
    "mt-1.5 w-full border-t border-gray-100 px-2 pb-1 pt-2 text-start text-[13px] font-medium text-indigo-600 hover:text-indigo-700 dark:border-zinc-800 dark:text-indigo-400",
  columnMenuAutoSize:
    "mt-1.5 w-full border-t border-gray-100 px-2 pb-1 pt-2 text-start text-[13px] font-medium text-indigo-600 hover:text-indigo-700 dark:border-zinc-800 dark:text-indigo-400",
  columnMenuSearch:
    "mb-1.5 h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900/40",
  columnMenuBulk: "mb-1.5 flex flex-wrap gap-1 px-1",
  columnMenuBulkButton:
    "rounded-md px-2 py-1 text-start text-[12px] font-medium text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800",
  columnMenuMore:
    "inline-grid place-items-center rounded p-[3px] text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
  columnMenuSubmenu: "ms-6 flex flex-col gap-0.5 py-1",
  columnMenuAction:
    "w-full rounded-md px-2 py-1.5 text-start text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800",
  // ── Saved views popover ─────────────────────────────────────────
  viewsMenu: "relative",
  viewsButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 data-[active]:border-indigo-400 data-[active]:bg-indigo-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:data-[active]:bg-indigo-500/15",
  viewsPanel:
    "z-50 min-w-[264px] rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900",
  viewsRow: "px-1 py-0.5",
  viewsItem:
    "flex-1 truncate rounded-md px-2 py-1.5 text-start text-[13px] font-medium text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800",
  viewsDelete:
    "inline-grid place-items-center rounded p-[3px] text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
  viewsDivider: "my-1.5 border-gray-100 dark:border-zinc-800",
  viewsSaveRow: "px-1 py-0.5",
  // `flex-1 min-w-0` lets the input give up its intrinsic width so the save
  // button keeps its place on the row instead of overflowing the panel.
  viewsInput:
    "h-8 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900/40",
  viewsSave:
    "h-8 shrink-0 rounded-md bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600",
  resizeHandle: "hover:bg-indigo-300",
  // min-w-0: a grid item sizes to its content unless told otherwise, and a
  // card with a long value would otherwise be wider than the list holding
  // it, pushing the page sideways on a phone.
  card: "min-w-0 list-none rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900",
  cardRow:
    "flex items-start justify-between gap-3 py-1 text-sm first-of-type:mb-1 first-of-type:border-b first-of-type:border-gray-100 first-of-type:pb-2 dark:first-of-type:border-zinc-800",
  cardLabel:
    "pt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-400",
  cardValue: "min-w-0 text-right font-medium text-gray-900 dark:text-zinc-100",
  cardActions:
    "mt-2 flex justify-end gap-1 border-t border-gray-100 pt-2 dark:border-zinc-800",
  cardDetail: "mt-2 border-t border-gray-200 pt-2 text-sm dark:border-zinc-700",
  cards: "m-0 grid list-none gap-2 p-3",
  // ── Table scaffolding ───────────────────────────────────────────
  scrollBox: "overscroll-x-contain",
  thead: "bg-white dark:bg-zinc-900",
  tbody: "align-middle",
  headerRow: "align-middle",
  virtualSpacer: "block",
  filtersAnchor: "relative",
  filtersIcon: "text-gray-400",
  columnMenu: "relative",
  columnMenuSeparator: "my-1.5 border-gray-100 dark:border-zinc-800",
  exportCsvButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800",
  exportSpinner:
    "size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent",
  // ── Selection, actions & expansion ──────────────────────────────
  checkbox: "h-4 w-4 accent-indigo-600",
  selectionHeader:
    "w-11 border-b border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800",
  selectionCell:
    "w-11 px-3 py-2.5 [&[data-pinned]]:bg-white dark:[&[data-pinned]]:bg-zinc-900",
  actionsHeader:
    "w-[120px] border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-end font-semibold text-gray-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  actionsCell:
    "px-3 py-2.5 text-end [&[data-pinned]]:bg-white dark:[&[data-pinned]]:bg-zinc-900",
  rowActionsTrigger:
    "inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 [&::-webkit-details-marker]:hidden dark:hover:bg-zinc-800",
  rowActionsMenu:
    "relative inline-block [&>button]:block [&>button]:w-full [&>button]:px-2 [&>button]:text-start",
  expandHeader:
    "w-8 border-b border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800",
  expandCell: "w-8 px-2 py-2.5",
  expandButton:
    "inline-grid h-6 w-6 place-items-center rounded-md text-gray-400 transition-transform hover:bg-gray-100 data-[expanded]:rotate-90 dark:hover:bg-zinc-800",
  detailRow:
    "border-b border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800/40",
  detailCell: "px-3 py-2.5 text-sm",
  // ── Bulk actions ────────────────────────────────────────────────
  bulkBar:
    "flex flex-wrap items-center gap-2 border-b border-gray-200 bg-indigo-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-indigo-500/10",
  bulkButton:
    "inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800",
  bulkError: "text-sm font-medium text-red-600 dark:text-red-400",
  selectAllBanner: "flex flex-wrap items-center gap-2",
  selectAllText: "text-xs text-gray-500 dark:text-zinc-400",
  selectAllButton:
    "rounded-md px-1.5 py-0.5 text-xs font-medium text-indigo-600 hover:bg-gray-100 dark:text-indigo-400 dark:hover:bg-zinc-800",
  // ── Sorting, grouping & summary ─────────────────────────────────
  sortIndex:
    "ms-1 inline-grid h-4 min-w-4 place-items-center rounded-full bg-indigo-100 px-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  headerGroupRow: "border-b border-gray-200 dark:border-zinc-700",
  headerGroupCell:
    "border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-start text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  columnGroupToggle: "align-middle text-gray-400 dark:text-zinc-500",
  groupRow:
    "border-b border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800/50",
  groupCell: "px-3 py-2 font-medium",
  groupCard:
    "mb-1 rounded-lg bg-gray-50 px-3 py-2 font-medium dark:bg-zinc-800/50",
  groupToggle:
    "inline-grid h-6 w-6 place-items-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800",
  groupSelect: "h-4 w-4 accent-indigo-600",
  groupLabel: "text-sm font-semibold",
  groupCount: "text-xs text-gray-500 dark:text-zinc-400",
  groupAggregate: "ms-auto text-xs text-gray-500 dark:text-zinc-400",
  summary:
    "border-t border-gray-200 bg-gray-50 font-medium dark:border-zinc-700 dark:bg-zinc-800/50",
  summaryRow: "align-middle",
  summaryCell: "px-3 py-2.5",
  summaryCard:
    "mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-800/50",
  // ── Inline editing ──────────────────────────────────────────────
  editCellActivate: "w-full cursor-text text-start",
  editCellEditor:
    "h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900/40",
  // ── Filter form extras ──────────────────────────────────────────
  filterOperator:
    "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900/40",
  filterOptionsLoading: "text-xs text-gray-500 dark:text-zinc-400",
  // ── Loading, error & load-more ──────────────────────────────────
  loading: "p-3",
  loadingTable: "w-full border-collapse",
  loadingHeaderRow: "border-b border-gray-200 dark:border-zinc-700",
  loadingHeaderCell: "px-3 py-2.5 text-start",
  loadingRow: "border-b border-gray-100 last:border-0 dark:border-zinc-800",
  loadingCell: "px-3 py-2.5",
  loadingLine:
    "inline-block h-3 animate-pulse rounded bg-gray-200 dark:bg-zinc-700",
  loadingCards: "flex flex-col gap-2 p-3",
  loadingCard:
    "flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-zinc-700 [&>span]:inline-block [&>span]:h-3 [&>span]:animate-pulse [&>span]:rounded [&>span]:bg-gray-200 dark:[&>span]:bg-zinc-700",
  refreshIndicator:
    "h-0.5 w-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-indigo-600",
  error:
    "flex flex-col items-center gap-1.5 px-4 py-10 text-center text-sm text-gray-600 dark:text-zinc-400",
  retryButton:
    "rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800",
  loadMore: "flex justify-center p-3",
  loadMoreButton:
    "inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800",
};
