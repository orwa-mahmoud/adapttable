/**
 * The React face of the neutral mobile-card model.
 */
import type { MobileCardField, MobileCardModel } from "@adapttable/core";
import type { ReactNode } from "react";

/**
 * One field of a mobile card, as a React host receives it.
 *
 * The neutral model types `value` as `DisplayValue`, because a non-React
 * binding stores whatever it renders. Here the value is already React content
 * — the column's `Cell` or accessor, wrapped in the cell editor when editing
 * is armed — so it can go straight into JSX.
 *
 * @public
 */
export interface ReactMobileCardField<TRow> extends Omit<
  MobileCardField<TRow>,
  "value"
> {
  /** The value, rendered exactly as the built-in card renders it. */
  value: ReactNode;
}

/**
 * A mobile card's model, as a React host receives it.
 *
 * @public
 */
export interface ReactMobileCardModel<TRow> extends Omit<
  MobileCardModel<TRow>,
  "fields"
> {
  /** The fields the built-in card would have laid out, in order. */
  fields: readonly ReactMobileCardField<TRow>[];
}

/**
 * Replace a mobile card's body in a React table.
 *
 * @typeParam TRow - The row type.
 * @returns The card's content, rendered inside the shell the table owns.
 *
 * @public
 */
export type ReactMobileCardRenderer<TRow> = (
  row: TRow,
  card: ReactMobileCardModel<TRow>
) => ReactNode;
