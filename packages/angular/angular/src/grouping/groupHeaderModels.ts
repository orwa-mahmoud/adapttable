import {
  groupAggregateEntries,
  groupLeafCount,
  groupRowLayout,
  groupSelectionState,
} from "@adapttable/core";
import {
  expandChevronIcon,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  groupIndentStyle,
  groupRowParts,
  type IconDescriptor,
  resolveMobileLabel,
  type SelectionState,
} from "@adapttable/core/binding";
import { computed, Directive, input, type Signal } from "@angular/core";

import { type ColumnDef } from "../columnDef";
type Entry = GroupHeaderRowSlotProps<
  never,
  SelectionState,
  ColumnDef<never>
>["entry"];
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
/** Shared AdaptGroupHeaderRow signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptGroupHeaderRowModel {
  readonly props =
    input.required<
      GroupHeaderRowSlotProps<never, SelectionState, ColumnDef<never>>
    >();
  protected readonly chevron: Signal<IconDescriptor> = computed(() => ({
    ...expandChevronIcon({ open: this.view.expanded() }),
    width: 14,
    height: 14,
  }));
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
/** Shared AdaptGroupHeaderCard signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptGroupHeaderCardModel {
  readonly props =
    input.required<
      GroupHeaderCardSlotProps<never, SelectionState, ColumnDef<never>>
    >();
  protected readonly chevron: Signal<IconDescriptor> = computed(() => ({
    ...expandChevronIcon({ open: this.view.expanded() }),
    width: 14,
    height: 14,
  }));
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
  protected caption(column: ColumnDef<never>): string | undefined {
    return resolveMobileLabel(column);
  }
}
