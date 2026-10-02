/**
 * A row's detail panel, and a real table nested under a row.
 *
 * A panel built by hand has none of the sorting, filtering, selection,
 * keyboard navigation or accessibility the outer table has. A nested table is
 * the kit's own table, so the reader gets the same table twice over. The host
 * mounts it from a template handed the defaults core decides for every
 * nested table — never write the URL, no second search box, the parent's
 * density and labels, an accessible name — and the region that names it for
 * assistive technology is drawn here, once.
 */
import {
  type NestedTableDefaults,
  nestedTableDefaults,
  nestedTableLabel,
  type NestedTableParent,
} from "@adapttable/core";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

import { resolveRenderer } from "../cell";
import type { Renderer } from "../columnDef";

export type { NestedTableDefaults, NestedTableParent } from "@adapttable/core";

/**
 * What a row-detail renderer receives.
 *
 * @public
 */
export interface RowDetailContext<TRow> {
  /** The row, so `let-row` binds it. */
  readonly $implicit: TRow;
  /** The row. */
  readonly row: TRow;
}

/**
 * What a nested table's template or component receives: the defaults to
 * bind onto the kit's own table, and the row it sits under.
 *
 * @public
 */
export interface NestedTableContext<TRow = unknown> {
  /** The defaults, so `let-defaults` binds them. */
  readonly $implicit: NestedTableDefaults;
  /** The defaults. */
  readonly defaults: NestedTableDefaults;
  /** The row the nested table sits under — where its own rows come from. */
  readonly row: TRow;
}

/**
 * A row's nested table.
 *
 * @public
 */
export interface NestedTable<TRow = unknown> {
  /**
   * Accessible name for the nested table and its region — name it after the
   * row it belongs to ("Orders for Ada Lovelace"), not after the feature.
   */
  readonly label?: string;
  /**
   * Mounts the kit's own table with the defaults, over the row's own data:
   * `<ng-template let-d let-row="row"><adapt-data-table [data]="row.orders"
   * [urlSync]="d.urlSync" … /></ng-template>`, or a component with `defaults`
   * and `row` inputs.
   */
  readonly table: Renderer<NestedTableContext<TRow>>;
}

/**
 * A host's declaration: the nested table for a row, or nothing.
 *
 * @public
 */
export type NestedTableFor<TRow> = (row: TRow) => NestedTable<TRow> | undefined;

/**
 * Draws one row's detail: its nested table inside a named region when the
 * row has one, else the host's own detail renderer.
 *
 * @public
 */
@Component({
  selector: "adapt-row-detail",
  imports: [NgTemplateOutlet, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (nestedView(); as view) {
      <section
        data-adapttable-part="nested-table"
        [attr.aria-label]="view.label"
      >
        @if (view.content?.template; as template) {
          <ng-container
            [ngTemplateOutlet]="template"
            [ngTemplateOutletContext]="view.context"
          />
        } @else if (view.content?.component; as component) {
          <ng-container
            [ngComponentOutlet]="component"
            [ngComponentOutletInputs]="view.content.inputs"
          />
        }
      </section>
    } @else if (ownView(); as own) {
      @if (own.template; as template) {
        <ng-container
          [ngTemplateOutlet]="template"
          [ngTemplateOutletContext]="ownContext()"
        />
      } @else if (own.component; as component) {
        <ng-container
          [ngComponentOutlet]="component"
          [ngComponentOutletInputs]="own.inputs"
        />
      }
    }
  `,
})
export class AdaptRowDetail<TRow> {
  /** The row. */
  readonly row = input.required<TRow>();
  /** The host's own detail renderer, for rows with no nested table. */
  readonly render = input<Renderer<RowDetailContext<TRow>>>();
  /** The nested table for a row, when the host declares one. */
  readonly nested = input<NestedTableFor<TRow>>();
  /** What the parent contributes to its nested tables. */
  readonly parent = input<NestedTableParent>();

  /** @internal */
  protected readonly ownContext = computed((): RowDetailContext<TRow> => ({
    $implicit: this.row(),
    row: this.row(),
  }));

  /** The nested table's region and content, when the row has one. @internal */
  protected readonly nestedView = computed(() => {
    const row = this.row();
    const nested = this.nested()?.(row);
    if (!nested) return undefined;
    const label = nestedTableLabel(nested.label);
    const defaults = nestedTableDefaults(label, this.parent());
    const context: NestedTableContext<TRow> = {
      $implicit: defaults,
      defaults,
      row,
    };
    return {
      label,
      context,
      content: resolveRenderer(nested.table, context),
    };
  });

  /** The host's own detail, resolved. @internal */
  protected readonly ownView = computed(() =>
    resolveRenderer(this.render(), this.ownContext())
  );
}
