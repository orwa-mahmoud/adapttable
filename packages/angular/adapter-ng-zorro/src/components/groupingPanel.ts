/**
 * The NG-ZORRO grouping strip: the binding's Chrome, filled with the
 * kit's own controls.
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
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzFlexModule } from "ng-zorro-antd/flex";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzTypographyModule } from "ng-zorro-antd/typography";

import { AdaptOverlayOrigin } from "./overlayPlacement";

/** Closed add control: the shown placeholder plus the native chevron. */
function addControlWidth(label: string): string {
  return `calc(${String(label.length)}ch + 2.75rem)`;
}

@Component({
  selector: "adapt-grouping-surface",
  imports: [NgTemplateOutlet, NzCardModule, NzFlexModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <nz-card
      nzSize="small"
      role="region"
      [attr.aria-label]="p.label"
      [attr.data-mobile]="p.mobile ? true : null"
      [dir]="p.dir ?? 'ltr'"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      [nzBodyStyle]="{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px',
      }"
      (dragenter)="p.onDragEnter?.($event)"
      (dragover)="p.onDragOver?.($event)"
      (dragleave)="p.onDragLeave?.($event)"
      (drop)="p.onDrop?.($event)"
    >
      <ng-container [ngTemplateOutlet]="p.children" />
    </nz-card>
  `,
})
class AdaptGroupingSurface {
  readonly props = input.required<AngularGroupingPanelSurfaceProps>();
}

@Component({
  selector: "adapt-grouping-drop-zone",
  imports: [NzFlexModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <fieldset
      nz-flex
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
  selector: "adapt-grouping-chip",
  imports: [NzButtonModule, NzTagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <nz-tag
      [attr.data-level]="p.level"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      style="display: inline-flex; align-items: center; gap: 4px"
    >
      <button
        nz-button
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
        <span aria-hidden="true">⋮⋮</span> <span>{{ p.label }} </span>
      </button>
      <button
        nz-button
        type="button"
        [attr.aria-label]="p.removeLabel"
        data-adapttable-part="grouping-chip-remove"
        (click)="p.onRemove()"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </nz-tag>
  `,
})
class AdaptGroupingChip {
  readonly props =
    input.required<GroupingPanelChipProps<KeyboardEvent, DragEvent>>();
}

@Component({
  selector: "adapt-grouping-select",
  imports: [FormsModule, NzSelectModule, AdaptOverlayOrigin],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <nz-select
      adaptOverlayOrigin
      #select
      [attr.aria-label]="p.label"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      [nzDisabled]="p.disabled ?? false"
      [ngModel]="p.value || null"
      [nzPlaceHolder]="p.label"
      [style.width]="
        p['data-adapttable-part'] === 'grouping-add' ? width(p.label) : null
      "
      (ngModelChange)="
        p.onChange($event);
        p['data-adapttable-part'] === 'grouping-add' && select.writeValue(null)
      "
    >
      @for (option of p.options; track option.value) {
        <nz-option [nzValue]="option.value" [nzLabel]="option.label" />
      }
    </nz-select>
  `,
})
class AdaptGroupingSelect {
  readonly props = input.required<GroupingPanelSelectProps>();
  protected readonly width = addControlWidth;
}

@Component({
  selector: "adapt-grouping-remove-zone",
  imports: [NzFlexModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <fieldset
      nz-flex
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
  imports: [NgTemplateOutlet, NzFlexModule, NzTypographyModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <span
      nz-flex
      nzGap="small"
      [attr.data-read-only]="p.readOnly ? true : null"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
    >
      <span nz-typography>{{ p.label }}</span>
      @if (p.readOnly) {
        <span nz-typography>{{ p.readOnlyLabel }}</span>
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
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      nz-button
      type="button"
      [attr.aria-label]="p.label"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      (click)="p.onRemove()"
    >
      <span>× </span>
    </button>
  `,
})
class AdaptGroupingAggregationRemove {
  readonly props = input.required<GroupingPanelAggregationRemoveProps>();
}

@Component({
  selector: "adapt-grouping-aggregation-picker",
  imports: [FormsModule, NzSelectModule, AdaptOverlayOrigin],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <nz-select
      adaptOverlayOrigin
      #select
      [attr.aria-label]="p.label"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      [nzDisabled]="p.disabled === true || available().length === 0"
      [nzPlaceHolder]="p.label"
      [ngModel]="null"
      [style.width]="width(p.label)"
      (ngModelChange)="choose($event); select.writeValue(null)"
    >
      @for (option of available(); track option.value) {
        <nz-option
          [nzValue]="option.value"
          [nzLabel]="option.label"
          nzCustomContent
        >
          <span data-adapttable-part="grouping-aggregation-option">{{
            option.label
          }}</span>
        </nz-option>
      }
    </nz-select>
  `,
})
class AdaptGroupingAggregationPicker {
  readonly props = input.required<GroupingPanelChecklistProps>();
  protected readonly width = addControlWidth;
  protected readonly available = () =>
    this.props().options.filter((option) => !option.checked);

  protected choose(value: string | null): void {
    if (value) this.props().onToggle(value, true);
  }
}

@Component({
  selector: "adapt-grouping-aggregation-restore",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      nz-button
      type="button"
      [disabled]="p.disabled"
      [attr.data-adapttable-part]="p['data-adapttable-part']"
      (click)="p.onRestore()"
    >
      <span>{{ p.label }} </span>
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
 * The grouping strip drawn with NG-ZORRO controls. A slot fill receives the
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
