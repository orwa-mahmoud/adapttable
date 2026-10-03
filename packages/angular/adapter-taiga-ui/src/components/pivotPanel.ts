import { type TableLabels } from "@adapttable/angular";
import {
  AdaptPivotPanelChrome,
  type AggregateName,
  type PivotConfig,
  type PivotField,
  type PivotPanelSlots,
  type PivotZone,
} from "@adapttable/angular/pivot";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type TemplateRef,
} from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";

/**
 * The pivot configuration panel, in native HTML.
 *
 * The fieldset and legend are not decoration: they tell a screen reader which
 * zone a field belongs to, which is the whole question this panel answers.
 */

/** What the panel surface receives. */
interface SurfaceProps {
  readonly children?: TemplateRef<unknown>;
  readonly className?: string;
}

/** What one zone receives. */
interface ZoneProps {
  readonly zone: PivotZone;
  readonly label: string;
  readonly children?: TemplateRef<unknown>;
}

/** What one field row receives. */
interface FieldProps {
  readonly label: string;
  readonly onMoveUp?: () => void;
  readonly onMoveDown?: () => void;
  readonly onRemove: () => void;
  readonly moveUpLabel: string;
  readonly moveDownLabel: string;
  readonly removeLabel: string;
  readonly aggregation?: TemplateRef<unknown>;
}

/** What the add control receives. */
interface AddProps {
  readonly label: string;
  readonly options: readonly PivotField[];
  readonly onAdd: (key: string) => void;
}

/** What the aggregation chooser receives. */
interface AggProps {
  readonly label: string;
  readonly value: AggregateName;
  readonly options: readonly AggregateName[];
  readonly onChange: (next: AggregateName) => void;
}

/** The panel body. */
@Component({
  selector: "adapt-pivot-surface",
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    data-adapttable-part="pivot-panel"
    [class]="props().className"
  >
    @if (props().children; as children) {
      <ng-container [ngTemplateOutlet]="children" />
    }
  </div>`,
})
class AdaptPivotSurface {
  /** The zone list and the class the host asked for. */
  readonly props = input.required<SurfaceProps>();
}

/** One titled zone. */
@Component({
  selector: "adapt-pivot-zone",
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fieldset
    data-adapttable-part="pivot-zone"
    [attr.data-pivot-zone]="props().zone"
  >
    <legend>{{ props().label }}</legend>
    @if (props().children; as children) {
      <ng-container [ngTemplateOutlet]="children" />
    }
  </fieldset>`,
})
class AdaptPivotZone {
  /** The zone's caption and its fields. */
  readonly props = input.required<ZoneProps>();
}

/** One field, with buttons that move it and a control that removes it. */
@Component({
  selector: "adapt-pivot-field",
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div data-adapttable-part="pivot-field">
    <span>{{ props().label }}</span>
    @if (props().aggregation; as aggregation) {
      <ng-container [ngTemplateOutlet]="aggregation" />
    }
    <button
      tuiButton
      size="s"
      appearance="secondary"
      type="button"
      [attr.aria-label]="props().moveUpLabel + ': ' + props().label"
      [disabled]="!props().onMoveUp"
      (click)="props().onMoveUp?.()"
    >
      ↑
    </button>
    <button
      tuiButton
      size="s"
      appearance="secondary"
      type="button"
      [attr.aria-label]="props().moveDownLabel + ': ' + props().label"
      [disabled]="!props().onMoveDown"
      (click)="props().onMoveDown?.()"
    >
      ↓
    </button>
    <button
      tuiButton
      size="s"
      appearance="secondary"
      type="button"
      [attr.aria-label]="props().removeLabel + ': ' + props().label"
      (click)="props().onRemove()"
    >
      ✕
    </button>
  </div>`,
})
class AdaptPivotField {
  /** The field and the actions on it. */
  readonly props = input.required<FieldProps>();
}

/** The control that adds a field to a zone. */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-pivot-add",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<tui-textfield [stringify]="props().options | taigaLabels"
    ><input
      tuiSelect
      [attr.aria-label]="props().label"
      [disabled]="props().options.length === 0"
      (ngModelChange)="add($any({ target: { value: $event } }))"
      [ngModel]="null"
    /><tui-data-list *tuiDropdown>
      <button tuiOption type="button" value="">{{ props().label }}</button>
      @for (option of props().options; track option.key) {
        <button tuiOption type="button" [value]="option.key">
          {{ option.label }}
        </button>
      }
    </tui-data-list></tui-textfield
  >`,
})
class AdaptPivotAdd {
  /** The fields that can still be added. */
  readonly props = input.required<AddProps>();

  /** Add the chosen field, then show the prompt again. */
  protected add(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const key = select.value;
    select.value = "";
    if (key) this.props().onAdd(key);
  }
}

/** The aggregation chooser on a measure. */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-pivot-agg",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<tui-textfield
    ><input
      tuiSelect
      [attr.aria-label]="props().label"
      [ngModel]="props().value"
      (ngModelChange)="change($any({ target: { value: $event } }))"
    /><tui-data-list *tuiDropdown>
      @for (option of props().options; track option) {
        <button tuiOption type="button" [value]="option">{{ option }}</button>
      }
    </tui-data-list></tui-textfield
  >`,
})
class AdaptPivotAgg {
  /** The current aggregation and the ones it can become. */
  readonly props = input.required<AggProps>();

  /** Report the chosen aggregation. */
  protected change(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AggregateName;
    this.props().onChange(value);
  }
}

/** Native controls. A const after the classes, so each class exists. */
const PIVOT_SLOTS: PivotPanelSlots = {
  Surface: AdaptPivotSurface,
  Zone: AdaptPivotZone,
  Field: AdaptPivotField,
  Add: AdaptPivotAdd,
  Agg: AdaptPivotAgg,
};

/**
 * Configure a pivot: three zones, and buttons that move fields between them.
 *
 * @public
 */
@Component({
  selector: "adapt-pivot-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...TAIGA_CONTROLS, AdaptPivotPanelChrome],
  template: `<adapt-pivot-panel-chrome
    [fields]="fields()"
    [config]="config()"
    [onChange]="onChange()"
    [labels]="labels()"
    [className]="className()"
    [slots]="slots"
  />`,
})
export class AdaptPivotPanel {
  /** Every field the user can pivot on. */
  readonly fields = input.required<readonly PivotField[]>();
  /** The configuration being edited. */
  readonly config = input.required<PivotConfig>();
  /** Report a change. */
  readonly onChange = input.required<(next: PivotConfig) => void>();
  /** Labels; gaps fall back to English. */
  readonly labels = input<TableLabels | undefined>(undefined);
  /** Class for the surface. */
  readonly className = input<string | undefined>(undefined);

  /** This kit's native controls. */
  protected readonly slots = PIVOT_SLOTS;
}
