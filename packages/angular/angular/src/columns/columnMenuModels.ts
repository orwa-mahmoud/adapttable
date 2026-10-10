import {
  ADAPTTABLE_SLOT_TABLE,
  type ColumnDrag,
  type ColumnLayout,
  injectColumnDrag,
} from "@adapttable/angular";
import {
  ACTIONS_COLUMN_KEY,
  type ColumnMenuChoice,
  type ColumnMenuItem,
  type ColumnMenuRow,
  columnMenuRows,
  nextPinSide,
  pinActionLabel,
  REORDER_COLUMN_KEY,
} from "@adapttable/core";
import {
  columnMenuActions,
  type ColumnMenuSlotProps,
  eyeIcon,
  filterColumnMenuRows,
  GRIP_ICON,
  hideAllColumns,
  PIN_ICON,
  showAllColumns,
  unpinAllColumns,
} from "@adapttable/core/binding";
import { computed, Directive, inject, input, signal } from "@angular/core";

import { injectColumnRenameEditor } from "./columnMenu";
const NOOP_RENAME = (): void => undefined;
function isChoice(item: ColumnMenuItem): item is ColumnMenuChoice {
  return "kind" in item && item.kind === "choice";
}
/** Shared AdaptColumnMenuRow signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptColumnMenuRowModel {
  readonly row = input.required<ColumnMenuRow<never>>();
  readonly props = input.required<ColumnMenuSlotProps<never>>();
  readonly drag = input.required<ColumnDrag>();
  protected readonly open = signal(false);
  protected readonly gripIcon = GRIP_ICON;
  protected readonly pinIcon = PIN_ICON;
  protected readonly eyeOn = eyeIcon(false);
  protected readonly eyeOff = eyeIcon(true);
  private readonly table = inject(ADAPTTABLE_SLOT_TABLE);
  protected readonly rename = injectColumnRenameEditor({
    column: computed(() => ({
      key: this.row().key,
      name: this.row().name,
      onRename: this.props().onRenameColumn ?? NOOP_RENAME,
      requiredMessage: this.props().labels.columnNameRequired,
      renamedMessage: this.props().labels.columnRenamed,
    })),
  });
  protected readonly actions = computed(() => {
    const props = this.props();
    return columnMenuActions(this.row(), {
      featureHost: this.table.featureHost as never,
      labels: props.labels,
      layout: props.layout,
      sortBy: props.sortBy,
      sortDir: props.sortDir,
      onSortColumn: props.onSortColumn,
      onAutoSizeColumn: props.onAutoSizeColumn,
      onFilterColumn: props.onFilterColumn,
      onBeginRename: props.onRenameColumn ? this.rename.begin : undefined,
      groupingPanel: props.groupingPanel,
    });
  });
  protected pinLabel(
    row: ColumnMenuRow<never>,
    props: ColumnMenuSlotProps<never>
  ): string {
    return pinActionLabel(row.pinned, props.labels);
  }
  protected nextPin(row: ColumnMenuRow<never>): ReturnType<typeof nextPinSide> {
    return nextPinSide(row.pinned);
  }
  protected asChoice(item: ColumnMenuItem): ColumnMenuChoice | undefined {
    return isChoice(item) ? item : undefined;
  }
  protected asAction(item: ColumnMenuItem): { disabled: boolean } {
    return item;
  }
  protected runAction(item: ColumnMenuItem): void {
    if (isChoice(item)) return;
    item.run();
    if (item.id !== "rename") this.open.set(false);
  }
}
/** Shared AdaptColumnMenuEdgeRow signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptColumnMenuEdgeRowModel {
  readonly layout = input.required<ColumnLayout<never>>();
  readonly columnKey = input.required<string>();
  readonly side = input.required<"start" | "end">();
  readonly name = input.required<string>();
  readonly showLabel = input.required<string>();
  readonly hideLabel = input.required<string>();
  readonly pinLabel = input.required<string>();
  readonly unpinLabel = input.required<string>();
  protected readonly pinIcon = PIN_ICON;
  protected readonly eyeOn = eyeIcon(false);
  protected readonly eyeOff = eyeIcon(true);
}
/** Shared AdaptColumnMenu signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptColumnMenuModel {
  readonly props = input.required<ColumnMenuSlotProps<never>>();
  protected readonly query = signal("");
  protected readonly reorderKey = REORDER_COLUMN_KEY;
  protected readonly actionsKey = ACTIONS_COLUMN_KEY;
  protected readonly drag = injectColumnDrag();
  protected readonly rows = computed(() =>
    filterColumnMenuRows(
      columnMenuRows(this.props().allColumns, this.props().layout),
      this.query()
    )
  );
  protected showAll(): void {
    showAllColumns(this.rows(), this.props().layout);
  }
  protected hideAll(): void {
    hideAllColumns(this.rows(), this.props().layout);
  }
  protected unpinAll(): void {
    unpinAllColumns(this.rows(), this.props().layout);
  }
}
