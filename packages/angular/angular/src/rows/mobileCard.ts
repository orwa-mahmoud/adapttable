/**
 * Angular mobile-card bodies: host templates and components receive the
 * same labelled, editable fields as the kit's built-in card.
 */
import type {
  MobileCardField as CoreMobileCardField,
  MobileCardModel,
} from "@adapttable/core";
import type { TemplateRef } from "@angular/core";

import type { CellContext, ColumnDef, Renderer } from "../columnDef";

/**
 * One card field. Stamp `value` with `context` through `NgTemplateOutlet`
 * to retain the column's cell renderer and its composed editor.
 *
 * @public
 */
export interface MobileCardField<TRow> extends Omit<
  CoreMobileCardField<TRow>,
  "column" | "label" | "value"
> {
  /** The Angular column. */
  readonly column: ColumnDef<TRow>;
  /** Its resolved mobile caption, absent for `mobileLabel: ""`. */
  readonly label: string | undefined;
  /** The actual value content, including its editor when editing is armed. */
  readonly value: TemplateRef<CellContext<TRow>>;
  /** The context to pass when stamping `value`. */
  readonly context: CellContext<TRow>;
}

/**
 * A custom body's template context or component inputs. Only the body is
 * replaced; the kit keeps selection, expansion, reorder and row actions.
 *
 * @public
 */
export interface MobileCardContext<TRow> extends Readonly<
  Omit<MobileCardModel<TRow>, "fields">
> {
  /** The row, for a template's `let-row`. */
  readonly $implicit: TRow;
  /** The row. */
  readonly row: TRow;
  /** The same fields the default card would draw, in column order. */
  readonly fields: readonly MobileCardField<TRow>[];
}

/**
 * Replace a mobile card's field layout with a template or component.
 *
 * @public
 */
export type MobileCardRenderer<TRow> = Renderer<MobileCardContext<TRow>>;
