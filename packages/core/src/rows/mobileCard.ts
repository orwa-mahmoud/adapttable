/**
 * The pieces of a mobile card, for a host who wants to lay them out
 * themselves.
 *
 * The built-in card is a stack of labelled fields, which is the right answer
 * for most tables and the wrong one for some: an order needs its total large
 * and its reference small, a person needs their avatar beside their name
 * rather than under a caption reading "Avatar".
 *
 * `renderCard` replaces that stack — and only that stack. The card's shell
 * stays: the list-item semantics, the selection checkbox, the expand and tree
 * toggles, the reorder controls, the row actions and the detail panel are all
 * rendered around the custom body, so a custom card cannot accidentally drop
 * the parts that make the list usable or accessible.
 *
 * What it is handed is the same content the built-in would have rendered —
 * each field's column, its resolved label and its value node, editors and
 * cell renderers included. So a custom card is a layout decision, not a
 * re-implementation: reuse the values, arrange them differently.
 */
import type { ReactNode } from "react";

import type { ColumnDef } from "../types";

/**
 * One field on a mobile card.
 *
 * @public
 */
export interface MobileCardField<TRow> {
  /** The column it came from. */
  column: ColumnDef<TRow>;
  /**
   * The label the built-in card would show — the column's `mobileLabel`, its
   * string header, or its key. `undefined` when the column asked for none
   * (`mobileLabel: ""`), which is how a bare avatar or title line avoids a
   * caption reading "Avatar".
   */
  label: string | undefined;
  /**
   * The value, rendered exactly as the built-in card renders it: the column's
   * `Cell` or accessor, wrapped in the cell editor when editing is armed.
   */
  value: ReactNode;
}

/**
 * What {@link MobileCardRenderer} is given.
 *
 * @public
 */
export interface MobileCardModel<TRow> {
  /** The card's place in the rendered window. */
  index: number;
  /** The fields the built-in card would have laid out, in order. */
  fields: readonly MobileCardField<TRow>[];
  /** Whether this row is selected. */
  selected: boolean;
  /** Whether this row's detail panel is open. */
  expanded: boolean;
}

/**
 * Replace a mobile card's body.
 *
 * @typeParam TRow - The row type.
 * @returns The card's content, rendered inside the shell the table owns.
 *
 * @public
 */
export type MobileCardRenderer<TRow> = (
  row: TRow,
  card: MobileCardModel<TRow>
) => ReactNode;
