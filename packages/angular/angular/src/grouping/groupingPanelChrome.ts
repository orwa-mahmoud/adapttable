/**
 * The grouping strip's Chrome: chips, insertion carets, the add control,
 * aggregations and the ungroup target — from core's grouping-panel model.
 * Every control is the kit's: the kit hands its surface, zones, chips and
 * selects in `slots`.
 */
import {
  deferGroupingDropToInner,
  type Direction,
  focusAfterAggregationRemoval,
  groupingAggregationOptions,
  groupingAvailableColumns,
  groupingColumnName,
  groupingDropPlan,
  type GroupingDropProps,
  type GroupingPanelState,
  INERT_GROUPING_DROP_HANDLERS,
  type TableLabels,
} from "@adapttable/core";
import type {
  GroupingPanelAggregationRemoveProps,
  GroupingPanelChecklistProps,
  GroupingPanelChipProps,
  GroupingPanelDropZoneProps,
  GroupingPanelRemoveZoneProps,
  GroupingPanelRestoreProps,
  GroupingPanelSelectProps,
  GroupingPanelSurfaceProps,
} from "@adapttable/core/binding";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  type TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";

import { AdaptLiveRegion } from "../a11y/liveRegion";
import type { ColumnDef } from "../columnDef";
import { AdaptControl } from "../control";

/**
 * The kit's controls for the grouping strip. Each is a standalone component
 * with one `props` input. The surface's content, and an aggregation item's
 * controls, are templates.
 *
 * @public
 */
export interface GroupingPanelSlots {
  /** The strip's outer surface. */
  readonly Surface: Type<unknown>;
  /** One insertion caret. */
  readonly DropZone: Type<unknown>;
  /** One grouped field. */
  readonly Chip: Type<unknown>;
  /** The add-field control, or one aggregation's operation. */
  readonly Select: Type<unknown>;
  /** The drag-to-ungroup target. */
  readonly RemoveZone: Type<unknown>;
  /** One aggregation: its name, and its controls when the reader owns it. */
  readonly AggregationItem: Type<unknown>;
  /** The control that takes one aggregation away. */
  readonly AggregationRemove: Type<unknown>;
  /** The control that adds an aggregation. */
  readonly AggregationPicker: Type<unknown>;
  /** The control that puts the declared aggregations back. */
  readonly AggregationRestore: Type<unknown>;
}

/**
 * The surface's props in Angular: its content is a template.
 *
 * @public
 */
export type AngularGroupingPanelSurfaceProps = GroupingPanelSurfaceProps<
  TemplateRef<unknown>,
  DragEvent
>;

/**
 * One aggregation item's props in Angular: its controls are a template.
 *
 * @public
 */
export interface AngularGroupingPanelAggregationItemProps {
  readonly label: string;
  readonly readOnly: boolean;
  readonly readOnlyLabel: string;
  readonly children: TemplateRef<unknown>;
  readonly "data-adapttable-part": "grouping-aggregation-item";
}

type DropProps = GroupingDropProps<DragEvent>;

const INERT_DROP = INERT_GROUPING_DROP_HANDLERS as DropProps;

interface ChipDraw {
  readonly key: string;
  readonly drop: DropProps;
  readonly leading: GroupingPanelDropZoneProps<DragEvent> | undefined;
  readonly chip: GroupingPanelChipProps<KeyboardEvent, DragEvent>;
  readonly trailing: GroupingPanelDropZoneProps<DragEvent> | undefined;
}

interface AggregationDraw {
  readonly columnKey: string;
  readonly label: string;
  readonly readOnly: boolean;
  readonly readOnlyLabel: string;
  readonly operation: GroupingPanelSelectProps | undefined;
  readonly remove: GroupingPanelAggregationRemoveProps | undefined;
}

interface AggregationsDraw {
  readonly label: string;
  readonly items: readonly AggregationDraw[];
  readonly picker: GroupingPanelChecklistProps;
  readonly restore: GroupingPanelRestoreProps | undefined;
}

interface PanelDraw {
  readonly mobile: boolean;
  readonly dir: Direction | undefined;
  readonly surface: Omit<AngularGroupingPanelSurfaceProps, "children">;
  readonly chips: readonly ChipDraw[];
  readonly emptyZone: GroupingPanelDropZoneProps<DragEvent> | undefined;
  readonly add: GroupingPanelSelectProps;
  readonly aggregations: AggregationsDraw | undefined;
  readonly announcement: string;
  readonly removeZone: GroupingPanelRemoveZoneProps<DragEvent> | undefined;
}

/** One insertion caret, or a caret that refuses a drop onto the same spot. */
function zoneAt(
  state: GroupingPanelState,
  labels: Required<TableLabels>,
  index: number,
  inert: (index: number) => boolean
): GroupingPanelDropZoneProps<DragEvent> {
  const live = !inert(index);
  return {
    label: labels.groupingDropColumns,
    empty: false,
    dragging: live && state.drag !== undefined,
    active: live && state.drag?.overIndex === index,
    dropProps: live ? state.dropProps(index) : INERT_DROP,
    "data-adapttable-part": "grouping-drop-zone",
  };
}

function chipDrop(
  state: GroupingPanelState,
  plan: ReturnType<typeof groupingDropPlan>,
  index: number
): DropProps {
  const target = plan.chipTarget(index);
  if (target === undefined) return INERT_DROP;
  return deferGroupingDropToInner(state.dropProps(target));
}

function panelDrop(
  state: GroupingPanelState,
  plan: ReturnType<typeof groupingDropPlan>,
  mobile: boolean
): DropProps {
  if (mobile || plan.panelTarget === undefined) return {};
  return deferGroupingDropToInner(state.dropProps(plan.panelTarget));
}

/**
 * What the strip draws for one state. Layout only: the decisions are
 * core's drop plan.
 */
function drawGroupingPanel(
  state: GroupingPanelState,
  columns: readonly {
    readonly key: string;
    readonly header?: unknown;
    readonly mobileLabel?: string;
    readonly groupable?: boolean;
  }[],
  labels: Required<TableLabels>,
  mobile: boolean,
  dir: Direction | undefined,
  onRemoveAggregate: (key: string) => void,
  onToggleAggregate: (value: string, checked: boolean) => void
): PanelDraw {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const plan = groupingDropPlan(state.groupBy, state.drag);
  const nameOf = (key: string): string => {
    const column = byKey.get(key);
    return column ? groupingColumnName(column) : key;
  };
  const chips: ChipDraw[] = state.groupBy.map((key, index) => {
    const label = nameOf(key);
    const last = index === state.groupBy.length - 1;
    return {
      key,
      drop: mobile ? {} : chipDrop(state, plan, index),
      leading: mobile ? undefined : zoneAt(state, labels, index, plan.inert),
      chip: {
        label,
        level: index + 1,
        dragProps: state.chipDragProps(key),
        keyboardProps: state.chipKeyboardProps(key, label),
        onRemove: () => {
          state.remove(key);
        },
        removeLabel: labels.removeGroupingColumn(label),
        "data-adapttable-part": "grouping-chip",
      },
      trailing:
        !mobile && last
          ? zoneAt(state, labels, index + 1, plan.inert)
          : undefined,
    };
  });
  const items = state.aggregations.items;
  const offered = state.aggregations.candidates;
  const available = groupingAvailableColumns(columns, state.groupBy);
  const showAggregations =
    state.groupBy.length > 0 && (items.length > 0 || offered.length > 0);
  return {
    mobile,
    dir,
    surface: {
      label: labels.groupingPanel,
      mobile,
      dir,
      ...panelDrop(state, plan, mobile),
      "data-adapttable-part": "grouping-panel",
    },
    chips,
    emptyZone:
      !mobile && state.groupBy.length === 0
        ? {
            label: labels.groupingDropColumns,
            empty: true,
            dragging: state.drag !== undefined,
            active: state.drag?.overIndex === 0,
            dropProps: state.dropProps(0),
            "data-adapttable-part": "grouping-drop-zone",
          }
        : undefined,
    add: {
      label: labels.addGroupingColumn,
      value: "",
      options: available,
      onChange: state.add,
      disabled: available.length === 0,
      "data-adapttable-part": "grouping-add",
    },
    aggregations: showAggregations
      ? {
          label: labels.groupingAggregations,
          items: items.map((item) => {
            const name = nameOf(item.columnKey);
            return {
              columnKey: item.columnKey,
              label: name,
              readOnly: !item.editable,
              readOnlyLabel: labels.groupingAggregationReadOnly,
              operation: item.editable
                ? {
                    label: labels.groupingAggregationFor(name),
                    value: item.operationId ?? "",
                    options: groupingAggregationOptions(item, labels),
                    onChange: (value: string) => {
                      if (value === "") return;
                      state.setAggregateOperation(item.columnKey, value);
                    },
                    disabled: !state.canSetAggregates,
                    "data-adapttable-part": "grouping-aggregation-operation",
                  }
                : undefined,
              remove: item.editable
                ? {
                    label: labels.groupingRemoveAggregation(name),
                    onRemove: () => {
                      onRemoveAggregate(item.columnKey);
                    },
                    "data-adapttable-part": "grouping-aggregation-remove",
                  }
                : undefined,
            };
          }),
          picker: {
            label: labels.groupingAddAggregation,
            options: offered.map((candidate) => ({
              value: candidate.columnKey,
              label: nameOf(candidate.columnKey),
              checked: candidate.active,
            })),
            onToggle: onToggleAggregate,
            disabled: !state.canSetAggregates || offered.length === 0,
            "data-adapttable-part": "grouping-aggregation-add",
          },
          restore:
            state.aggregations.hasDefaults && !state.aggregations.atDefaults
              ? {
                  label: labels.groupingRestoreAggregations,
                  disabled: !state.canSetAggregates,
                  onRestore: state.restoreAggregateDefaults,
                  "data-adapttable-part": "grouping-aggregations-restore",
                }
              : undefined,
        }
      : undefined,
    announcement: state.announcement,
    removeZone:
      state.drag?.source === "chip"
        ? {
            label: labels.groupingDropToRemove,
            active: state.drag.overRemove === true,
            dropProps: state.removeDropProps(),
            "data-adapttable-part": "grouping-remove-zone",
          }
        : undefined,
  };
}

/** One aggregation row: the kit's item, with its controls as a template. @internal */
@Component({
  selector: "adapt-grouping-aggregation",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <ng-template #controls>
      @if (operation(); as operation) {
        <ng-container
          [adaptControl]="slots().Select"
          [adaptControlProps]="operation"
        />
      }
      @if (remove(); as remove) {
        <ng-container
          [adaptControl]="slots().AggregationRemove"
          [adaptControlProps]="remove"
        />
      }
    </ng-template>
    <span [attr.data-adapttable-aggregation]="columnKey()">
      <ng-container
        [adaptControl]="slots().AggregationItem"
        [adaptControlProps]="item()"
      />
    </span>
  `,
})
export class AdaptGroupingAggregation {
  readonly columnKey = input.required<string>();
  readonly label = input.required<string>();
  readonly readOnly = input.required<boolean>();
  readonly readOnlyLabel = input.required<string>();
  readonly operation = input<GroupingPanelSelectProps>();
  readonly remove = input<GroupingPanelAggregationRemoveProps>();
  readonly slots = input.required<GroupingPanelSlots>();

  private readonly controls =
    viewChild.required<TemplateRef<unknown>>("controls");

  protected readonly item = computed(
    (): AngularGroupingPanelAggregationItemProps => ({
      label: this.label(),
      readOnly: this.readOnly(),
      readOnlyLabel: this.readOnlyLabel(),
      children: this.controls(),
      "data-adapttable-part": "grouping-aggregation-item",
    })
  );
}

/** The strip's view. The public component forwards its inputs here. @internal */
@Component({
  selector: "adapt-grouping-panel-view",
  imports: [AdaptControl, AdaptGroupingAggregation, AdaptLiveRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <div #root style="display: contents">
      <ng-template #body>
        @let drawn = model();
        @let kit = slots();
        @for (chip of drawn.chips; track chip.key) {
          <span
            data-adapttable-part="grouping-item"
            style="display: inline-flex; align-items: center"
            (dragenter)="chip.drop.onDragEnter?.($event)"
            (dragover)="chip.drop.onDragOver?.($event)"
            (dragleave)="chip.drop.onDragLeave?.($event)"
            (drop)="chip.drop.onDrop?.($event)"
          >
            @if (chip.leading; as zone) {
              <ng-container
                [adaptControl]="kit.DropZone"
                [adaptControlProps]="zone"
              />
            }
            <ng-container
              [adaptControl]="kit.Chip"
              [adaptControlProps]="chip.chip"
            />
            @if (chip.trailing; as zone) {
              <ng-container
                [adaptControl]="kit.DropZone"
                [adaptControlProps]="zone"
              />
            }
          </span>
        }
        @if (drawn.emptyZone; as zone) {
          <ng-container
            [adaptControl]="kit.DropZone"
            [adaptControlProps]="zone"
          />
        }
        <ng-container
          [adaptControl]="kit.Select"
          [adaptControlProps]="drawn.add"
        />
        @if (drawn.aggregations; as aggregations) {
          <fieldset
            [attr.aria-label]="aggregations.label"
            data-adapttable-part="grouping-aggregations"
            style="display: flex; flex: 1 0 100%; width: 100%; flex-wrap: wrap; align-items: center; gap: 0.5rem; min-width: 0; margin: 0; padding: 0; border: none"
          >
            @for (item of aggregations.items; track item.columnKey) {
              <adapt-grouping-aggregation
                [columnKey]="item.columnKey"
                [label]="item.label"
                [readOnly]="item.readOnly"
                [readOnlyLabel]="item.readOnlyLabel"
                [operation]="item.operation"
                [remove]="item.remove"
                [slots]="kit"
              />
            }
            <ng-container
              [adaptControl]="kit.AggregationPicker"
              [adaptControlProps]="aggregations.picker"
            />
            @if (aggregations.restore; as restore) {
              <ng-container
                [adaptControl]="kit.AggregationRestore"
                [adaptControlProps]="restore"
              />
            }
          </fieldset>
        }
        <div
          [adaptLiveRegion]="drawn.announcement"
          part="grouping-announcer"
        ></div>
        @if (drawn.removeZone; as zone) {
          <span style="display: flex; flex: 1 0 100%; width: 100%">
            <ng-container
              [adaptControl]="kit.RemoveZone"
              [adaptControlProps]="zone"
            />
          </span>
        }
      </ng-template>
      <ng-container
        [adaptControl]="slots().Surface"
        [adaptControlProps]="surface()"
      />
    </div>
  `,
})
export class AdaptGroupingPanelView<TRow> {
  /** Live grouping interactions and the fields already grouped. */
  readonly state = input.required<GroupingPanelState>();
  /** Every column the add control and the chips can name. */
  readonly columns = input.required<readonly ColumnDef<TRow>[]>();
  /** Resolved labels. */
  readonly labels = input.required<Required<TableLabels>>();
  /** Whether the strip uses the compact mobile treatment. */
  readonly mobile = input(false);
  /** Logical text direction. */
  readonly dir = input<Direction>();
  /** The kit's controls. */
  readonly slots = input.required<GroupingPanelSlots>();

  private readonly body = viewChild.required<TemplateRef<unknown>>("body");
  private readonly root = viewChild<ElementRef<HTMLElement>>("root");
  private pendingRemovalIndex: number | null = null;

  constructor() {
    // Focus moves after the removed aggregation's control is gone, so a
    // keyboard reader is not left on the document.
    afterRenderEffect(() => {
      const items = this.state().aggregations.items;
      const removed = this.pendingRemovalIndex;
      if (removed === null) return;
      this.pendingRemovalIndex = null;
      focusAfterAggregationRemoval(
        this.root()?.nativeElement ?? null,
        items.map((item) => item.columnKey),
        removed
      );
    });
  }

  protected readonly model = computed(() =>
    drawGroupingPanel(
      this.state(),
      this.columns(),
      this.labels(),
      this.mobile(),
      this.dir(),
      (key) => {
        this.noteRemoval(key);
        this.state().removeAggregate(key);
      },
      (value, checked) => {
        if (checked) {
          this.state().addAggregate(value);
          return;
        }
        this.noteRemoval(value);
        this.state().removeAggregate(value);
      }
    )
  );

  protected readonly surface = computed(
    (): AngularGroupingPanelSurfaceProps => ({
      ...this.model().surface,
      children: this.body(),
    })
  );

  /** Remember where an aggregation stood, then let the caller remove it. */
  private noteRemoval(key: string): void {
    this.pendingRemovalIndex = this.state().aggregations.items.findIndex(
      (item) => item.columnKey === key
    );
  }
}

/**
 * The interactive grouping strip: the structure is here, every control is
 * the kit's.
 *
 * @public
 */
@Component({
  selector: "adapt-grouping-panel-chrome",
  imports: [AdaptGroupingPanelView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <adapt-grouping-panel-view
      [state]="state()"
      [columns]="columns()"
      [labels]="labels()"
      [mobile]="mobile()"
      [dir]="dir()"
      [slots]="slots()"
    />
  `,
})
export class AdaptGroupingPanelChrome<TRow> {
  /** Live grouping interactions and the fields already grouped. */
  readonly state = input.required<GroupingPanelState>();
  /** Every column the add control and the chips can name. */
  readonly columns = input.required<readonly ColumnDef<TRow>[]>();
  /** Resolved labels. */
  readonly labels = input.required<Required<TableLabels>>();
  /** Whether the strip uses the compact mobile treatment. */
  readonly mobile = input(false);
  /** Logical text direction. */
  readonly dir = input<Direction>();
  /** The kit's controls. */
  readonly slots = input.required<GroupingPanelSlots>();
}
