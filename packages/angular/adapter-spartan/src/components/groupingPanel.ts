/**
 * The grouping strip in Spartan controls: the binding's Chrome, filled with the
 * browser's own controls.
 */
import {
  AdaptGroupingPanelChrome,
  type AngularGroupingPanelAggregationItemProps,
  type AngularGroupingPanelSurfaceProps,
  type ColumnDef,
  type GroupingPanelAggregationRemoveProps,
  type GroupingPanelChecklistProps,
  type GroupingPanelChipProps,
  type GroupingPanelDropZoneProps,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelRestoreProps,
  type GroupingPanelSelectProps,
  type GroupingPanelSlotProps,
  type GroupingPanelSlots,
} from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { HlmButton, HlmNativeOption, HlmNativeSelect } from "../helm/controls";

/** Closed add control: the shown placeholder plus the native chevron. */
function addControlWidth(label: string): string {
  return `calc(${String(label.length)}ch + 2.75rem)`;
}

@Component({
  selector: "adapt-grouping-surface",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <section
      [attr.aria-label]="p.label"
      [attr.data-mobile]="p.mobile ? true : null"
      [attr.dir]="p.dir ?? null"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px"
      (dragenter)="p.onDragEnter?.($event)"
      (dragover)="p.onDragOver?.($event)"
      (dragleave)="p.onDragLeave?.($event)"
      (drop)="p.onDrop?.($event)"
    >
      <ng-container [ngTemplateOutlet]="p.children" />
    </section>
  `,
})
class AdaptGroupingSurface {
  readonly props = input.required<AngularGroupingPanelSurfaceProps>();
}

@Component({
  selector: "adapt-grouping-drop-zone",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <fieldset
      [attr.aria-label]="p.label"
      [attr.data-empty]="p.empty ? true : null"
      [attr.data-active]="p.active ? true : null"
      [attr.data-dragging]="p.dragging ? true : null"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      [attr.data-drop-active]="p.dropProps['data-drop-active'] ? true : null"
      (dragenter)="p.dropProps.onDragEnter?.($event)"
      (dragover)="p.dropProps.onDragOver?.($event)"
      (dragleave)="p.dropProps.onDragLeave?.($event)"
      (drop)="p.dropProps.onDrop?.($event)"
    >
      @if (p.empty) {
        {{ p.label }}
      } @else {
        <span aria-hidden="true">│</span>
      }
    </fieldset>
  `,
})
class AdaptGroupingDropZone {
  readonly props = input.required<GroupingPanelDropZoneProps<DragEvent>>();
}

@Component({
  imports: [HlmButton],
  selector: "adapt-grouping-chip",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <span
      [attr.data-level]="p.level"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      style="display: inline-flex; align-items: center; gap: 4px"
    >
      <button
        adaptHlmButton
        type="button"
        data-adapttable-part="grouping-chip-handle"
        [attr.draggable]="p.dragProps.draggable ? 'true' : null"
        [attr.data-grouping-dragging]="
          p.dragProps['data-grouping-dragging'] ? true : null
        "
        [attr.tabindex]="p.keyboardProps.tabIndex"
        [attr.role]="p.keyboardProps.role"
        [attr.aria-label]="p.keyboardProps['aria-label']"
        (dragstart)="p.dragProps.onDragStart?.($event)"
        (dragend)="p.dragProps.onDragEnd?.($event)"
        (keydown)="p.keyboardProps.onKeyDown($event)"
      >
        <span aria-hidden="true">⋮⋮</span> {{ p.label }}
      </button>
      <button
        adaptHlmButton
        type="button"
        [attr.aria-label]="p.removeLabel"
        data-adapttable-part="grouping-chip-remove"
        (click)="p.onRemove()"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </span>
  `,
})
class AdaptGroupingChip {
  readonly props =
    input.required<GroupingPanelChipProps<KeyboardEvent, DragEvent>>();
}

@Component({
  imports: [HlmNativeSelect, HlmNativeOption],
  selector: "adapt-grouping-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <select
      adaptHlmNativeSelect
      [attr.aria-label]="p.label"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      [disabled]="p.disabled ?? false"
      [value]="p.value"
      [style.width]="
        p['data-adapttable-part'] === 'grouping-add' ? width(p.label) : null
      "
      (change)="p.onChange($any($event.target).value)"
    >
      @if (p["data-adapttable-part"] === "grouping-add") {
        <option
          adaptHlmNativeOption
          value=""
          disabled
          hidden
          [selected]="p.value === ''"
        >
          {{ p.label }}
        </option>
      }
      @for (option of p.options; track option.value) {
        <option
          adaptHlmNativeOption
          [value]="option.value"
          [selected]="option.value === p.value"
        >
          {{ option.label }}
        </option>
      }
    </select>
  `,
})
class AdaptGroupingSelect {
  readonly props = input.required<GroupingPanelSelectProps>();
  protected readonly width = addControlWidth;
}

@Component({
  selector: "adapt-grouping-remove-zone",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <fieldset
      [attr.aria-label]="p.label"
      [attr.data-active]="p.active ? true : null"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      (dragenter)="p.dropProps.onDragEnter?.($event)"
      (dragover)="p.dropProps.onDragOver?.($event)"
      (dragleave)="p.dropProps.onDragLeave?.($event)"
      (drop)="p.dropProps.onDrop?.($event)"
    >
      {{ p.label }}
    </fieldset>
  `,
})
class AdaptGroupingRemoveZone {
  readonly props = input.required<GroupingPanelRemoveZoneProps<DragEvent>>();
}

@Component({
  selector: "adapt-grouping-aggregation-item",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <span
      [attr.data-read-only]="p.readOnly ? true : null"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
    >
      <span>{{ p.label }}</span>
      @if (p.readOnly) {
        <span>{{ p.readOnlyLabel }}</span>
      } @else {
        <ng-container [ngTemplateOutlet]="p.children" />
      }
    </span>
  `,
})
class AdaptGroupingAggregationItem {
  readonly props = input.required<AngularGroupingPanelAggregationItemProps>();
}

@Component({
  imports: [HlmButton],
  selector: "adapt-grouping-aggregation-remove",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      adaptHlmButton
      type="button"
      [attr.aria-label]="p.label"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      (click)="p.onRemove()"
    >
      ×
    </button>
  `,
})
class AdaptGroupingAggregationRemove {
  readonly props = input.required<GroupingPanelAggregationRemoveProps>();
}

@Component({
  imports: [HlmNativeSelect, HlmNativeOption],
  selector: "adapt-grouping-aggregation-picker",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <select
      adaptHlmNativeSelect
      [attr.aria-label]="p.label"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      [disabled]="p.disabled === true || available().length === 0"
      [style.width]="width(p.label)"
      (change)="choose($any($event.target))"
    >
      <option adaptHlmNativeOption value="" disabled hidden [selected]="true">
        {{ p.label }}
      </option>
      @for (option of available(); track option.value) {
        <option
          adaptHlmNativeOption
          [value]="option.value"
          [selected]="false"
          data-adapttable-part="grouping-aggregation-option"
        >
          {{ option.label }}
        </option>
      }
    </select>
  `,
})
class AdaptGroupingAggregationPicker {
  readonly props = input.required<GroupingPanelChecklistProps>();
  protected readonly width = addControlWidth;
  protected readonly available = () =>
    this.props().options.filter((option) => !option.checked);

  protected choose(select: HTMLSelectElement): void {
    if (select.value === "") return;
    this.props().onToggle(select.value, true);
    select.value = "";
  }
}

@Component({
  imports: [HlmButton],
  selector: "adapt-grouping-aggregation-restore",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      adaptHlmButton
      type="button"
      [disabled]="p.disabled"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      (click)="p.onRestore()"
    >
      {{ p.label }}
    </button>
  `,
})
class AdaptGroupingAggregationRestore {
  readonly props = input.required<GroupingPanelRestoreProps>();
}

const SLOTS: GroupingPanelSlots = {
  Surface: AdaptGroupingSurface,
  DropZone: AdaptGroupingDropZone,
  Chip: AdaptGroupingChip,
  Select: AdaptGroupingSelect,
  RemoveZone: AdaptGroupingRemoveZone,
  AggregationItem: AdaptGroupingAggregationItem,
  AggregationRemove: AdaptGroupingAggregationRemove,
  AggregationPicker: AdaptGroupingAggregationPicker,
  AggregationRestore: AdaptGroupingAggregationRestore,
};

/**
 * The grouping strip drawn with Brain/Helm controls. A slot fill receives the
 * panel's props through one `props` input.
 *
 * @public
 */
@Component({
  selector: "adapt-grouping-panel",
  imports: [AdaptGroupingPanelChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <adapt-grouping-panel-chrome
      [state]="p.state"
      [columns]="p.columns"
      [labels]="p.labels"
      [mobile]="p.mobile"
      [dir]="p.dir"
      [slots]="slots"
    />
  `,
})
export class AdaptGroupingPanel<TRow> {
  /** The strip's state and columns, from the table's grouping feature. */
  readonly props = input.required<GroupingPanelSlotProps<ColumnDef<TRow>>>();

  protected readonly slots = SLOTS;
}
