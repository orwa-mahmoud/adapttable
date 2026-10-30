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
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  viewChild,
} from "@angular/core";
import { NgModel } from "@angular/forms";

import { resetTaigaSelect } from "../resetTaigaSelect";
import { TAIGA_CONTROLS } from "../taigaControls";

/**
 * The grouping strip in native HTML: the binding's Chrome, filled with the
 * browser's own controls.
 */

/** Preferred textfield width: the shown placeholder plus the kit's chevron. */
function addControlWidth(label: string): string {
  return `calc(${String(label.length)}ch + 2.75rem)`;
}

@Component({
  selector: "adapt-grouping-surface",
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet],
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
  imports: [...TAIGA_CONTROLS],
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
        border-color: var(--tui-background-accent-1, #526ed3);
        background: color-mix(
          in srgb,
          var(--tui-background-accent-1, #526ed3) 8%,
          transparent
        );
      }
      fieldset[data-active] {
        border-color: var(--tui-background-accent-1, #526ed3);
        border-style: solid;
        background: color-mix(
          in srgb,
          var(--tui-background-accent-1, #526ed3) 22%,
          transparent
        );
        outline: 2px solid var(--tui-background-accent-1, #526ed3);
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
  imports: [...TAIGA_CONTROLS],
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
        tuiButton
        size="s"
        appearance="secondary"
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
        tuiButton
        size="s"
        appearance="secondary"
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
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-grouping-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <tui-textfield
      [tuiTextfieldCleaner]="false"
      [stringify]="p.options | taigaLabels"
      [style.inline-size]="
        p['data-adapttable-part'] === 'grouping-add'
          ? width(p.label)
          : optionWidth()
      "
      style="max-inline-size: 100%; flex-shrink: 0"
      ><input
        tuiSelect
        [attr.aria-label]="p.label"
        [attr.data-adapttable-part]="p['data-adapttable-part']"
        [disabled]="p.disabled ?? false"
        [placeholder]="
          p['data-adapttable-part'] === 'grouping-add' ? p.label : ''
        "
        [ngModelOptions]="{ standalone: true }"
        [ngModel]="p.value || null"
        (ngModelChange)="change($event)"
      /><tui-data-list *tuiDropdown>
        @if (p["data-adapttable-part"] === "grouping-add") {
          <button tuiOption type="button" value="" [disabled]="true" hidden>
            {{ p.label }}
          </button>
        }
        @for (option of p.options; track option.value) {
          <button tuiOption type="button" [value]="option.value">
            {{ option.label }}
          </button>
        }
      </tui-data-list></tui-textfield
    >
  `,
})
class AdaptGroupingSelect {
  private readonly destroyRef = inject(DestroyRef);
  readonly props = input.required<GroupingPanelSelectProps>();
  protected readonly width = addControlWidth;
  protected readonly optionWidth = computed(() => {
    const length = this.props().options.reduce(
      (longest, option) => Math.max(longest, option.label.length),
      0
    );
    return `calc(${String(length)}ch + 4rem)`;
  });
  private readonly model = viewChild.required(NgModel);

  protected change(value: string | null): void {
    const model = this.model();
    const props = this.props();
    if (value !== null) props.onChange(value);
    if (props["data-adapttable-part"] === "grouping-add") {
      resetTaigaSelect(model, this.destroyRef);
    }
  }
}

@Component({
  imports: [...TAIGA_CONTROLS],
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
        border: 1px dashed var(--tui-text-negative, #d32f2f);
        border-radius: 6px;
        color: var(--tui-text-negative, #d32f2f);
        font-size: 0.8125rem;
      }
      fieldset[data-active] {
        background: color-mix(
          in srgb,
          var(--tui-text-negative, #d32f2f) 12%,
          transparent
        );
        border-style: solid;
        outline: 2px solid var(--tui-text-negative, #d32f2f);
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
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet],
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
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-grouping-aggregation-remove",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      tuiButton
      size="s"
      appearance="secondary"
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
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-grouping-aggregation-picker",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <tui-textfield
      [tuiTextfieldCleaner]="false"
      [stringify]="available() | taigaLabels"
      [style.inline-size]="width(p.label)"
      ><input
        tuiSelect
        [attr.aria-label]="p.label"
        [attr.data-adapttable-part]="p['data-adapttable-part']"
        [disabled]="p.disabled === true || available().length === 0"
        [placeholder]="p.label"
        [ngModelOptions]="{ standalone: true }"
        (ngModelChange)="choose($event)"
        [ngModel]="null"
      /><tui-data-list *tuiDropdown>
        <button tuiOption type="button" value="" [disabled]="true" hidden>
          {{ p.label }}
        </button>
        @for (option of available(); track option.value) {
          <button
            tuiOption
            type="button"
            [value]="option.value"
            data-adapttable-part="grouping-aggregation-option"
          >
            {{ option.label }}
          </button>
        }
      </tui-data-list></tui-textfield
    >
  `,
})
class AdaptGroupingAggregationPicker {
  private readonly destroyRef = inject(DestroyRef);
  readonly props = input.required<GroupingPanelChecklistProps>();
  protected readonly width = addControlWidth;
  protected readonly available = () =>
    this.props().options.filter((option) => !option.checked);

  private readonly model = viewChild.required(NgModel);

  protected choose(value: string | null): void {
    const model = this.model();
    if (value) this.props().onToggle(value, true);
    resetTaigaSelect(model, this.destroyRef);
  }
}

@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-grouping-aggregation-restore",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      tuiButton
      size="s"
      appearance="secondary"
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
  imports: [...TAIGA_CONTROLS, AdaptGroupingPanelChrome],
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
