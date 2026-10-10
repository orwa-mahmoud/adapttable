import {
  type NestedTableContext,
  type NestedTableFor,
  type Renderer,
  type RowDetailContext,
} from "@adapttable/angular";
import {
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
