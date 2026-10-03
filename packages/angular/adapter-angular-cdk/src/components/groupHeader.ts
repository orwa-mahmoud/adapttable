/**
 * Native group header, footer and "show more" rows for the desktop table,
 * and the same three as cards on phones — the kit fills for
 * {@link GROUP_HEADER_ROW} and {@link GROUP_HEADER_CARD}.
 */
import {
  AdaptAttrs,
  AdaptGroupMoreButtonChrome,
  AdaptGroupToggleSpacer,
  AdaptIcon,
  type ColumnDef,
  expandChevronIcon,
  groupAggregateEntries,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  groupIndentStyle,
  groupLeafCount,
  type GroupMoreButtonSlotProps,
  groupRowLayout,
  groupRowParts,
  groupSelectionState,
  type IconDescriptor,
  resolveMobileLabel,
  type SelectionState,
} from "@adapttable/angular";
import { A11yModule } from "@angular/cdk/a11y";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Signal,
} from "@angular/core";

/** The entry either slot draws. */
type Entry = GroupHeaderRowSlotProps<
  never,
  SelectionState,
  ColumnDef<never>
>["entry"];

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
  imports: [A11yModule],
  selector: "adapt-group-more",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button
      cdkMonitorElementFocus
      data-adapttable-cdk-control
      type="button"
      data-adapttable-part="group-more"
      style="font: inherit; background: transparent; border: none; padding: 0; cursor: pointer; text-decoration: underline; color: inherit"
      (click)="props().onClick()"
    >
      {{ props().label }}
    </button>
  `,
})
export class AdaptGroupMore {
  readonly props = input.required<GroupMoreButtonSlotProps>();
}

/** What both the row and the card derive from one entry. */
function groupEntryView(
  entry: () => Entry,
  selection: () => SelectionState | null
) {
  const group = computed(() => {
    const current = entry();
    return current.kind === "group" ? current : undefined;
  });
  return {
    parts: computed(() => groupRowParts(entry().kind)),
    /** Neither a footer nor a "show more" row has a toggle or a count. */
    plain: computed(() => entry().kind !== "group"),
    expanded: computed(() => {
      const current = entry();
      return current.kind !== "group" || !current.collapsed;
    }),
    collapsed: computed(() => {
      const current = entry();
      return current.kind === "group" && current.collapsed ? "true" : null;
    }),
    group,
    footer: computed(() => {
      const current = entry();
      return current.kind === "groupFooter" ? current : undefined;
    }),
    more: computed(() => {
      const current = entry();
      return current.kind === "groupMore" ? current : undefined;
    }),
    selectState: computed(() => {
      const open = group();
      const current = selection();
      return open && current
        ? groupSelectionState(open.leafIds, current.selectedIds)
        : undefined;
    }),
    count: computed(() => {
      const open = group();
      return open ? groupLeafCount(open) : 0;
    }),
    aggregateCells: computed(() => {
      const current = entry();
      return current.kind === "groupMore" ? undefined : current.aggregateCells;
    }),
  };
}

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
    A11yModule,
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
            cdkMonitorElementFocus
            data-adapttable-cdk-control
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
          @if (p.selection; as selection) {
            <input
              cdkMonitorElementFocus
              data-adapttable-cdk-control
              type="checkbox"
              data-adapttable-part="group-select"
              [attr.aria-label]="p.labels.selectAll"
              [checked]="view.selectState() === 'all'"
              [indeterminate]="view.selectState() === 'some'"
              (change)="selection.toggleGroupLeaves(group.leafIds)"
            />
          }
        } @else {
          <adapt-group-toggle-spacer />
        }
        <span [attr.data-adapttable-part]="view.parts().label">
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
          <span data-adapttable-part="group-count" style="opacity: 0.65">{{
            p.labels.groupCount(view.count())
          }}</span>
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
export class AdaptGroupHeaderRow {
  /** Slot props from the table's group-header-row fill. */
  readonly props =
    input.required<
      GroupHeaderRowSlotProps<never, SelectionState, ColumnDef<never>>
    >();

  protected readonly chevron: Signal<IconDescriptor> = computed(() => ({
    ...expandChevronIcon({ open: this.view.expanded() }),
    width: 14,
    height: 14,
  }));
  protected readonly moreSlots = { Button: AdaptGroupMore };
  /** Operations for the current group or footer, retaining the model type. */
  protected readonly aggregateOps: Signal<
    Parameters<typeof groupRowLayout>[2]
  > = computed(() => {
    const current = this.props().entry;
    return current.kind === "groupMore" ? undefined : current.aggregateOps;
  });
  protected readonly view = groupEntryView(
    () => this.props().entry,
    () => this.props().selection
  );

  protected readonly layout = computed(() =>
    groupRowLayout<never, ColumnDef<never>>(
      this.props().columns,
      this.view.aggregateCells(),
      this.aggregateOps()
    )
  );

  protected readonly labelCellStyle = computed(() => ({
    fontWeight: 600,
    ...groupIndentStyle(this.props().entry.level),
  }));
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
  imports: [A11yModule, AdaptGroupMoreButtonChrome, AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <div
      [attr.data-adapttable-part]="view.parts().card"
      [attr.data-collapsed]="view.collapsed()"
      style="font-weight: 600"
    >
      <span style="display: inline-flex; align-items: center; gap: 8px">
        @if (view.group(); as group) {
          <button
            cdkMonitorElementFocus
            data-adapttable-cdk-control
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
          @if (p.selection; as selection) {
            <input
              cdkMonitorElementFocus
              data-adapttable-cdk-control
              type="checkbox"
              data-adapttable-part="group-select"
              [attr.aria-label]="p.labels.selectAll"
              [checked]="view.selectState() === 'all'"
              [indeterminate]="view.selectState() === 'some'"
              (change)="selection.toggleGroupLeaves(group.leafIds)"
            />
          }
        }
        <span [attr.data-adapttable-part]="view.parts().label">
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
          <span data-adapttable-part="group-count" style="opacity: 0.65">{{
            p.labels.groupCount(view.count())
          }}</span>
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
    </div>
  `,
})
export class AdaptGroupHeaderCard {
  /** Slot props from the table's group-header-card fill. */
  readonly props =
    input.required<
      GroupHeaderCardSlotProps<never, SelectionState, ColumnDef<never>>
    >();

  protected readonly chevron: Signal<IconDescriptor> = computed(() => ({
    ...expandChevronIcon({ open: this.view.expanded() }),
    width: 14,
    height: 14,
  }));
  protected readonly moreSlots = { Button: AdaptGroupMore };
  /** Operations for the current group or footer, retaining the model type. */
  protected readonly aggregateOps: Signal<
    Parameters<typeof groupRowLayout>[2]
  > = computed(() => {
    const current = this.props().entry;
    return current.kind === "groupMore" ? undefined : current.aggregateOps;
  });
  protected readonly view = groupEntryView(
    () => this.props().entry,
    () => this.props().selection
  );

  protected readonly aggregates = computed(() =>
    groupAggregateEntries<never, ColumnDef<never>>(
      this.props().columns,
      this.view.aggregateCells(),
      this.aggregateOps()
    )
  );

  /** A subtotal's caption: the column's mobile label. */
  protected caption(column: ColumnDef<never>): string | undefined {
    return resolveMobileLabel(column);
  }
}
