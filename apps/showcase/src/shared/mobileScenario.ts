/**
 * The mobile-cards page, written once for React, Vue and Angular: the same
 * table flipped between its desktop layout and phone cards, with both
 * pagination styles, the built-in or a custom card, a bounded list, the
 * table's data states, and a host callback when a card is activated. A
 * framework adds its switches' markup and its table.
 */

/** Which layout the table takes: automatic, phone cards or a scrolling table. */
export type MobileLayout = "auto" | "phone" | "table";

/** How the cards page through the rows. */
export type MobilePaging = "infinite" | "paged";

/** What the table is showing: rows, nothing, a load in flight, or a failure. */
export type MobileDataState = "ready" | "empty" | "loading" | "error";

/** The layout switch, in order. */
export const MOBILE_LAYOUTS: readonly {
  readonly value: MobileLayout;
  readonly label: string;
}[] = [
  { value: "auto", label: "Automatic" },
  { value: "phone", label: "Phone cards" },
  { value: "table", label: "Scrollable table" },
];

/** The pagination switch, in order. */
export const MOBILE_PAGING: readonly {
  readonly value: MobilePaging;
  readonly label: string;
}[] = [
  { value: "infinite", label: "Infinite scroll" },
  { value: "paged", label: "Paged" },
];

/** The card switch, in order. */
export const MOBILE_CARDS: readonly {
  readonly value: boolean;
  readonly label: string;
}[] = [
  { value: false, label: "Built-in card" },
  { value: true, label: "Custom card" },
];

/** The data-state switch, in order. */
export const MOBILE_DATA_STATES: readonly {
  readonly value: MobileDataState;
  readonly label: string;
}[] = [
  { value: "ready", label: "Rows" },
  { value: "empty", label: "Empty" },
  { value: "loading", label: "Loading" },
  { value: "error", label: "Error" },
];

/** The page's words: the switches' group names, the toggle and the hint. */
export const MOBILE_TEXT = {
  layout: "Layout",
  paging: "Pagination",
  card: "Card layout",
  data: "Data",
  bounded: "Bounded list",
  hint: "search and pagination stay identical",
  waiting: "Activate a card to see the host callback.",
  activated: (name: string) => `Opened ${name}`,
} as const;

/** How tall the bounded list is, in px. */
export const MOBILE_BOUNDED_HEIGHT = 240;

/** The failure the error state reports. */
export const MOBILE_LOAD_ERROR = new Error(
  "The directory could not be loaded. Try again."
);

/** The page opens on phone cards that scroll infinitely, with rows. */
export const MOBILE_START = {
  layout: "phone" as MobileLayout,
  paging: "infinite" as MobilePaging,
  customCard: false,
  bounded: false,
  dataState: "ready" as MobileDataState,
};

/**
 * The table's `forceMobile` for a layout: cards, a table, or the breakpoint's
 * own choice.
 *
 * @param layout - The chosen layout.
 * @returns `true`, `false`, or `undefined` for automatic.
 */
export function forceMobileFor(layout: MobileLayout): boolean | undefined {
  if (layout === "auto") return undefined;
  return layout === "phone";
}

/**
 * The rows the table is handed for a data state: none while empty or
 * loading.
 *
 * @param rows - The rows.
 * @param state - The chosen data state.
 * @returns The rows to show.
 */
export function rowsFor<TRow>(
  rows: readonly TRow[],
  state: MobileDataState
): readonly TRow[] {
  return state === "empty" || state === "loading" ? [] : rows;
}
