/**
 * NG-ZORRO group header, footer and "show more" rows for the desktop table,
 * and the same three as cards on phones — the kit fills for
 * {@link GROUP_HEADER_ROW} and {@link GROUP_HEADER_CARD}.
 */
import {
  AdaptAttrs,
  AdaptGroupHeaderCardModel,
  AdaptGroupHeaderRowModel,
  AdaptGroupMoreButtonChrome,
  AdaptGroupToggleSpacer,
  AdaptIcon,
  type GroupMoreButtonSlotProps,
} from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzTypographyModule } from "ng-zorro-antd/typography";

import { AdaptSelectionCheckbox } from "./selectionCheckbox";

/** The entry either slot draws. */

/** Reflect only the decorative wrapper; an open/down chevron remains down. */
const GROUP_CHEVRON_STYLE = `
  .group-chevron {
    display: inline-flex;
  }
  .group-chevron:dir(rtl) {
    transform: scaleX(-1);
  }
`;

/**
 * The "show more" button inside a more row or card.
 *
 * @public
 */
@Component({
  selector: "adapt-group-more",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button
      nz-button
      nzType="text"
      type="button"
      data-adapttable-part="group-more"
      style="font: inherit; background: transparent; border: none; padding: 0; cursor: pointer; text-decoration: underline; color: inherit"
      (click)="props().onClick()"
    >
      <span>{{ props().label }} </span>
    </button>
  `,
})
export class AdaptGroupMore {
  readonly props = input.required<GroupMoreButtonSlotProps>();
}

/** What both the row and the card derive from one entry. */

/**
 * A group's header, footer or "show more" row in the desktop table. One
 * cell per column from the first aggregate onward, so a subtotal sits under
 * the column it totals.
 *
 * @public
 */
@Component({
  selector: "tr[adaptGroupHeaderRow]",
  styles: GROUP_CHEVRON_STYLE,
  imports: [
    NzButtonModule,
    NzTypographyModule,
    AdaptSelectionCheckbox,
    AdaptAttrs,
    AdaptGroupMoreButtonChrome,
    AdaptGroupToggleSpacer,
    AdaptIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[attr.data-adapttable-part]": "view.parts().row",
    "[attr.data-collapsed]": "view.collapsed()",
  },
  template: `
    @let p = props();
    @let l = layout();
    <td
      [attr.colspan]="p.leadingCells + l.labelColumns.length"
      [attr.data-adapttable-part]="view.parts().cell"
      [style]="labelCellStyle()"
    >
      <span
        style="display: inline-flex; align-items: center; gap: 8px; width: 100%"
      >
        @if (view.group(); as group) {
          <button
            nz-button
            nzType="text"
            type="button"
            data-adapttable-part="group-toggle"
            [attr.aria-expanded]="view.expanded()"
            [attr.aria-label]="
              view.expanded() ? p.labels.collapseGroup : p.labels.expandGroup
            "
            (click)="p.onToggleCollapse(group.key)"
          >
            <span aria-hidden="true" class="group-chevron">
              <svg [adaptIcon]="chevron()"></svg>
            </span>
          </button>
          @if (p.selection) {
            <adapt-selection-checkbox [attrs]="selectionAttrs()" />
          }
        } @else {
          <adapt-group-toggle-spacer />
        }
        <span nz-typography [attr.data-adapttable-part]="view.parts().label">
          @if (view.more(); as more) {
            <adapt-group-more-button-chrome
              [scope]="more.scope"
              [remaining]="more.remaining"
              [groupKey]="more.groupKey"
              [labels]="p.labels"
              [onShowMore]="p.onShowMore"
              [slots]="moreSlots"
            />
          } @else if (view.footer(); as footer) {
            {{ p.labels.groupTotal(footer.label) }}
          } @else {
            {{ view.group()?.label }}
          }
        </span>
        @if (view.plain()) {
          <adapt-group-toggle-spacer />
        } @else {
          <span
            nz-typography
            data-adapttable-part="group-count"
            style="opacity: 0.65"
            >{{ p.labels.groupCount(view.count()) }}</span
          >
        }
        @for (aggregate of l.labelAggregates; track aggregate.column.key) {
          <span
            data-adapttable-part="group-aggregate"
            [attr.data-column]="aggregate.column.key"
            style="margin-inline-start: auto"
            >{{ aggregate.node }}</span
          >
        }
      </span>
    </td>
    @for (cell of l.cells; track cell.column.key) {
      <td
        [adaptAttrs]="p.getCellProps(cell.column)"
        [attr.data-adapttable-part]="
          cell.node === undefined ? null : 'group-aggregate'
        "
        [attr.data-column]="cell.node === undefined ? null : cell.column.key"
      >
        {{ cell.node }}
      </td>
    }
    @if (p.showActions) {
      <td></td>
    }
  `,
})
export class AdaptGroupHeaderRow extends AdaptGroupHeaderRowModel {
  /** The kit emits one change from either the label or its native input. */
  protected readonly selectionAttrs = computed(() => ({
    type: "checkbox",
    "data-adapttable-part": "group-select",
    "aria-label": this.props().labels.selectAll,
    checked: this.view.selectState() === "all",
    indeterminate: this.view.selectState() === "some",
    onChange: () => {
      const group = this.view.group();
      if (group) this.props().selection?.toggleGroupLeaves(group.leafIds);
    },
  }));

  protected readonly moreSlots = { Button: AdaptGroupMore };
}

/**
 * A group's header, footer or "show more" block in the phone card list. A
 * card shows only the subtotals that exist, each captioned by its column.
 *
 * @public
 */
@Component({
  selector: "adapt-group-header-card",
  styles: GROUP_CHEVRON_STYLE,
  imports: [
    AdaptGroupMoreButtonChrome,
    AdaptIcon,
    AdaptSelectionCheckbox,
    NzButtonModule,
    NzCardModule,
    NzTypographyModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <nz-card
      nzSize="small"
      [attr.data-adapttable-part]="view.parts().card"
      [attr.data-collapsed]="view.collapsed()"
      style="font-weight: 600"
    >
      <span style="display: inline-flex; align-items: center; gap: 8px">
        @if (view.group(); as group) {
          <button
            nz-button
            nzType="text"
            type="button"
            data-adapttable-part="group-toggle"
            [attr.aria-expanded]="view.expanded()"
            [attr.aria-label]="
              view.expanded() ? p.labels.collapseGroup : p.labels.expandGroup
            "
            (click)="p.onToggleCollapse(group.key)"
          >
            <span aria-hidden="true" class="group-chevron">
              <svg [adaptIcon]="chevron()"></svg>
            </span>
          </button>
          @if (p.selection) {
            <adapt-selection-checkbox [attrs]="selectionAttrs()" />
          }
        }
        <span nz-typography [attr.data-adapttable-part]="view.parts().label">
          @if (view.more(); as more) {
            <adapt-group-more-button-chrome
              [scope]="more.scope"
              [remaining]="more.remaining"
              [groupKey]="more.groupKey"
              [labels]="p.labels"
              [onShowMore]="p.onShowMore"
              [slots]="moreSlots"
            />
          } @else if (view.footer(); as footer) {
            {{ p.labels.groupTotal(footer.label) }}
          } @else {
            {{ view.group()?.label }}
          }
        </span>
        @if (!view.plain()) {
          <span
            nz-typography
            data-adapttable-part="group-count"
            style="opacity: 0.65"
            >{{ p.labels.groupCount(view.count()) }}</span
          >
        }
      </span>
      @for (aggregate of aggregates(); track aggregate.column.key) {
        <span style="display: flex; gap: 8px; margin-top: 4px">
          <span style="opacity: 0.65">{{ caption(aggregate.column) }}</span>
          <span
            data-adapttable-part="group-aggregate"
            [attr.data-column]="aggregate.column.key"
            style="margin-inline-start: auto"
            >{{ aggregate.node }}</span
          >
        </span>
      }
    </nz-card>
  `,
})
export class AdaptGroupHeaderCard extends AdaptGroupHeaderCardModel {
  /** The kit emits one change from either the label or its native input. */
  protected readonly selectionAttrs = computed(() => ({
    type: "checkbox",
    "data-adapttable-part": "group-select",
    "aria-label": this.props().labels.selectAll,
    checked: this.view.selectState() === "all",
    indeterminate: this.view.selectState() === "some",
    onChange: () => {
      const group = this.view.group();
      if (group) this.props().selection?.toggleGroupLeaves(group.leafIds);
    },
  }));

  protected readonly moreSlots = { Button: AdaptGroupMore };
}
