import type { DataTableClassNames } from "@adapttable/unstyled";

import { type Locale } from "../data";
import {
  type DataMode,
  type Density,
  type FiltersUi,
  type PageMode,
} from "../Demo";
import { UnstyledLike } from "./UnstyledLike";

// Plain "bring your own Tailwind classes" look — deliberately distinct from the
// shadcn demo: an INDIGO accent, gray neutrals, softer radii. Same headless
// adapter, completely different visual character.
const TAILWIND: DataTableClassNames = {
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
    "fixed inset-y-0 end-0 z-50 flex w-[340px] max-w-[88vw] flex-col border-s border-gray-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900",
  filtersPopover:
    "z-50 mt-2 w-80 max-w-[88vw] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900",
  filtersCount:
    "inline-grid h-5 min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-xs font-bold leading-none text-white",
  filtersHeader:
    "flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-zinc-700",
  filtersTitle: "text-base font-semibold text-gray-900 dark:text-zinc-100",
  filtersClose:
    "flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
  filtersBody: "flex flex-1 flex-col gap-4 overflow-auto p-4",
  // ── Auto-built filter form (declarative `filters` definitions) ──
  filterField: "m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0",
  filterLabel: "p-0 text-xs font-medium text-gray-500 dark:text-zinc-400",
  filterInput:
    "h-9 w-full rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900/40",
  filterSelect:
    "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900/40",
  filterCheckboxGroup: "flex flex-wrap gap-1.5",
  filterCheckbox:
    "inline-flex cursor-pointer select-none items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-600 has-[:checked]:text-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-500 [&>input]:sr-only",
  filtersFooter:
    "flex items-center justify-between gap-2 border-t border-gray-200 p-4 dark:border-zinc-700",
  filtersClear:
    "h-9 rounded-md px-3 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800",
  filtersDone:
    "h-9 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600",
  table: "w-full border-collapse text-sm",
  // Pinned cells must be opaque so scrolled content never shows through.
  headerCell:
    "border-b border-gray-200 bg-gray-50/60 px-3 py-2.5 text-start font-semibold text-gray-500 [&[data-pinned]]:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:[&[data-pinned]]:bg-zinc-800",
  sortButton:
    "inline-flex items-center gap-1 font-semibold text-gray-600 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400",
  row: "border-b border-gray-100 last:border-0 hover:bg-gray-50 data-[selected]:bg-indigo-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60 dark:data-[selected]:bg-indigo-500/15",
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
  resizeHandle: "hover:bg-indigo-300",
  card: "mb-2 rounded-lg border border-gray-200 p-3 dark:border-zinc-700",
  cardRow: "flex justify-between gap-3 py-0.5 text-sm",
  cardLabel: "text-gray-500 dark:text-zinc-400",
  cardValue: "font-medium",
};

export function UnstyledDemo({
  mode,
  locale,
  pageMode,
  urlKey,
  density,
  filtersUi,
  animate,
  grouping,
  editing,
}: Readonly<{
  mode: DataMode;
  locale: Locale;
  pageMode?: PageMode;
  urlKey?: string;
  density?: Density;
  filtersUi?: FiltersUi;
  animate?: boolean;
  grouping?: boolean;
  editing?: boolean;
}>) {
  return (
    <UnstyledLike
      mode={mode}
      locale={locale}
      pageMode={pageMode}
      urlKey={urlKey}
      density={density}
      filtersUi={filtersUi}
      animate={animate}
      grouping={grouping}
      editing={editing}
      classNames={TAILWIND}
    />
  );
}
