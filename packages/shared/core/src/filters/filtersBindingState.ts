/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */
import type { ChecklistValue } from "../contracts/query";
import type { ChecklistWindow } from "./checklistModel";

/**
 * Kit-agnostic state behind {@link useChecklistFilter}.
 *
 * @public
 */
export interface ChecklistFilterState {
  /** False when the source has no full filtered set — do not render. */
  available: boolean;
  /** Distinct values, selected-but-missing ones included at count 0. */
  items: readonly ChecklistValue[];
  /** `items` narrowed by the search box. */
  visible: readonly ChecklistValue[];
  /** Current search box text. */
  query: string;
  /** Replaces the checklist's search text. */
  setQuery: (next: string) => void;
  /** Currently checked values. */
  selected: readonly string[];
  /** True when `visible` is long enough to window. */
  virtualize: boolean;
  /** Checks every option the search left visible. */
  selectAllVisible: () => void;
  /** Unchecks every option. */
  clear: () => void;
  /** Checks or unchecks one option. */
  toggle: (value: string, on: boolean) => void;
}

/** What {@link useChecklistWindow} hands the layout. */
export interface ChecklistWindowState extends ChecklistWindow {
  /** Attach to the scrolling list element. */
  ref: (element: HTMLDivElement | null) => void;
  /** Attach to the same element's `onScroll`. */
  onScroll: () => void;
}
