/**
 * One pivot line's row header: the indent, the part name, and the caption.
 *
 * The model stores the caption function and the indent on the column, because
 * a cell component only receives the row and the column. The grand-total
 * footer never uses this component — its caption stays the localized label.
 */
import {
  AdaptCell,
  type CellContext,
  type ColumnDef,
  type Renderer,
} from "@adapttable/angular";
import { type PivotRow, pivotRowIndentStyle } from "@adapttable/core";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

/** The caption function {@link pivotTableModel} stores on the row-header column. */
export function pivotRowCaptionOf(
  column: { meta?: Record<string, unknown> },
  row: PivotRow
): string | Renderer<CellContext<PivotRow>> {
  const caption = column.meta?.pivotCaption;
  return typeof caption === "function"
    ? (caption as (line: PivotRow) => string | Renderer<CellContext<PivotRow>>)(
        row
      )
    : row.label;
}

/** The indent {@link pivotTableModel} stores, as a padding length or nothing. */
export function pivotRowPadOf(
  column: { meta?: Record<string, unknown> },
  row: PivotRow
): string | null {
  const indent = column.meta?.pivotIndent;
  if (typeof indent !== "number") return null;
  return pivotRowIndentStyle(row, indent)?.paddingInlineStart ?? null;
}

/**
 * The row-header cell. Kits that draw their own cell replace `column.cell`;
 * this is the one `@adapttable/angular/pivot` renders.
 *
 * @public
 */
@Component({
  selector: "adapt-pivot-row-header",
  imports: [AdaptCell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (contentColumn(); as content) {
      <span
        [adaptCell]="content"
        [adaptCellRow]="row()"
        [adaptCellIndex]="rowIndex()"
        data-adapttable-part="pivot-row-header"
        [attr.data-pivot-kind]="row().kind"
        [style.padding-inline-start]="pad()"
      ></span>
    } @else {
      <span
        data-adapttable-part="pivot-row-header"
        [attr.data-pivot-kind]="row().kind"
        [style.padding-inline-start]="pad()"
        >{{ caption() }}</span
      >
    }`,
})
export class AdaptPivotRowHeader {
  /** The pivot line. */
  readonly row = input.required<PivotRow>();
  /** The row-header column, carrying the caption and the indent. */
  readonly column = input.required<ColumnDef<PivotRow>>();

  /** The row's position, forwarded to a custom renderer. */
  readonly rowIndex = input(0);

  /** Evaluate the host callback once for each row or column change. */
  protected readonly caption = computed(() =>
    pivotRowCaptionOf(this.column(), this.row())
  );

  /** Reuse the binding's template/component renderer inside the part wrapper. */
  protected readonly contentColumn = computed<ColumnDef<PivotRow> | null>(
    () => {
      const content = this.caption();
      return typeof content === "string"
        ? null
        : { ...this.column(), cell: content };
    }
  );

  /** Nesting, or nothing at the outermost line and when indent is off. */
  protected readonly pad = computed(() =>
    pivotRowPadOf(this.column(), this.row())
  );
}
