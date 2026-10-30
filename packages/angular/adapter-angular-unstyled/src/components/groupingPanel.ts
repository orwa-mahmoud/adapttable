/**
 * The grouping strip in native HTML: the binding's Chrome, filled with the
 * browser's own controls.
 */
import type { ColumnDef } from "@adapttable/angular";
import {
  AdaptGroupingPanelChrome,
  type AngularGroupingPanelAggregationItemProps,
  type AngularGroupingPanelSurfaceProps,
  type GroupingPanelAggregationRemoveProps,
  type GroupingPanelChecklistProps,
  type GroupingPanelChipProps,
  type GroupingPanelDropZoneProps,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelRestoreProps,
  type GroupingPanelSelectProps,
  type GroupingPanelSlotProps,
  type GroupingPanelSlots,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

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
      style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 16px; min-inline-size: 0"
      (dragenter)="p.onDragEnter?.($event)"
      (dragover)="p.onDragOver?.($event)"
      (dragleave)="p.onDragLeave?.($event)"
      (drop)="p.onDrop?.($event)"
    >
      <span
        style="font-size: 0.8125rem; font-weight: 600; margin-inline-end: 8px"
        >{{ p.label }}</span
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
  styles: [
    `
      fieldset {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        flex: 0 0 auto;
        margin: 0 2px;
        padding: 0;
        border: 1px dashed color-mix(in srgb, currentColor 30%, transparent);
        border-radius: 4px;
        min-inline-size: 10px;
        min-block-size: 32px;
      }
      fieldset[data-empty] {
        min-inline-size: 9rem;
        min-block-size: 44px;
        padding: 8px;
      }
      fieldset:not([data-empty]):not([data-active]):not([data-dragging]) {
        opacity: 0;
      }
      fieldset[data-dragging] {
        border-color: Highlight;
        background: color-mix(in srgb, Highlight 8%, transparent);
      }
      fieldset[data-active] {
        border-color: Highlight;
        border-style: solid;
        background: color-mix(in srgb, Highlight 22%, transparent);
        outline: 2px solid Highlight;
        outline-offset: 1px;
      }
    `,
  ],
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
      }
    </fieldset>
  `,
})
class AdaptGroupingDropZone {
  readonly props = input.required<GroupingPanelDropZoneProps<DragEvent>>();
}

@Component({
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
        <span aria-hidden="true">⋮⋮</span> {{ p.level }}. {{ p.label }}
      </button>
      <button
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
  selector: "adapt-grouping-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <select
      [attr.aria-label]="p.label"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      [disabled]="p.disabled ?? false"
      [value]="p.value"
      [style.width]="
        p['data-adapttable-part'] === 'grouping-add' ? width(p.label) : '8rem'
      "
      (change)="p.onChange($any($event.target).value)"
    >
      @if (p["data-adapttable-part"] === "grouping-add") {
        <option value="" disabled hidden [selected]="p.value === ''">
          {{ p.label }}
        </option>
      }
      @for (option of p.options; track option.value) {
        <option [value]="option.value" [selected]="option.value === p.value">
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
  styles: [
    `
      fieldset {
        display: flex;
        flex: 1 1 auto;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        min-inline-size: 0;
        min-block-size: 44px;
        margin: 0;
        padding: 8px 12px;
        border: 1px dashed #b91c1c;
        border-radius: 6px;
        color: #b91c1c;
        font-size: 0.8125rem;
      }
      fieldset[data-active] {
        background: color-mix(in srgb, #b91c1c 12%, transparent);
        border-style: solid;
        outline: 2px solid #b91c1c;
      }
    `,
  ],
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
      style="display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px; max-inline-size: 100%"
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
  selector: "adapt-grouping-aggregation-remove",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
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
  selector: "adapt-grouping-aggregation-picker",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <select
      [attr.aria-label]="p.label"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      [disabled]="p.disabled === true || available().length === 0"
      [style.width]="width(p.label)"
      (change)="choose($any($event.target))"
    >
      <option value="" disabled hidden [selected]="true">
        {{ p.label }}
      </option>
      @for (option of available(); track option.value) {
        <option
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
  selector: "adapt-grouping-aggregation-restore",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
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
 * The grouping strip drawn with native controls. A slot fill receives the
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
