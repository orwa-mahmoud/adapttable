/**
 * The pivot configuration panel: three lists, and a way to move fields
 * between them.
 *
 * Every pivot UI in every spreadsheet is drag-and-drop, and every one of them
 * is unusable without a mouse. Dragging is a fine way to express "put Team
 * above Region" and a terrible way to be the *only* way — so the panel is
 * built keyboard-first: each field carries buttons that move it, and the
 * result is a control anyone can drive with Tab and Enter. A kit that wants
 * dragging can add it on top; nothing here forbids it, and nothing here
 * depends on it.
 *
 * Structure, part names, ordering and labels live here. Every visible control
 * — the buttons, the selects, the surfaces they sit on — is a slot the
 * adapter fills with its own component. A slot's content is a template the
 * kit stamps, because an Angular slot cannot project children through the
 * control outlet.
 */
import { AdaptControl } from "@adapttable/angular/adapter";
import {
  type AggregateName,
  assignField,
  moveField,
  PIVOT_AGGREGATIONS,
  type PivotConfig,
  type PivotField,
  pivotPanelZones,
  type PivotZone,
  removeField,
  resolveLabels,
  setMeasureAgg,
  type TableLabels,
} from "@adapttable/core";
import type { PivotZoneModel } from "@adapttable/core/pivot";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";

/**
 * The kit-native pieces the panel is built from. Each receives its props
 * through a `props` input.
 *
 * @public
 */
export interface PivotPanelSlots {
  /** The panel body. */
  readonly Surface: Type<unknown>;
  /** One titled zone. */
  readonly Zone: Type<unknown>;
  /** One field in a zone. */
  readonly Field: Type<unknown>;
  /** The control that adds a field to a zone. */
  readonly Add: Type<unknown>;
  /** The aggregation chooser on a measure. */
  readonly Agg: Type<unknown>;
}

/** Resolved labels, so a child does not resolve them again. */
type Labels = ReturnType<typeof resolveLabels>;

/**
 * One field row: its move and remove controls, and the aggregation chooser
 * when the field is a measure.
 *
 * @internal
 */
@Component({
  selector: "adapt-pivot-field-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl],
  template: `
    <ng-template #agg>
      @if (entry().aggregation !== undefined) {
        <ng-container
          [adaptControl]="slots().Agg"
          [adaptControlProps]="aggProps()"
        />
      }
    </ng-template>
    <ng-container
      [adaptControl]="slots().Field"
      [adaptControlProps]="fieldProps()"
    />
  `,
})
export class AdaptPivotFieldChrome {
  /** The field, and whether it can move. */
  readonly entry = input.required<PivotZoneModel["entries"][number]>();
  /** Which zone it sits in. */
  readonly zone = input.required<PivotZone>();
  /** The configuration being edited. */
  readonly config = input.required<PivotConfig>();
  /** Report a change. */
  readonly onChange = input.required<(next: PivotConfig) => void>();
  /** Resolved labels. */
  readonly labels = input.required<Labels>();
  /** The kit's field and aggregation controls. */
  readonly slots = input.required<PivotPanelSlots>();

  private readonly aggTpl = viewChild<TemplateRef<unknown>>("agg");

  /** Props for the aggregation chooser. Read only for a measure. */
  protected readonly aggProps = computed(() => ({
    label: this.labels().pivotAggregation,
    value: this.entry().aggregation,
    options: PIVOT_AGGREGATIONS,
    onChange: (next: AggregateName) => {
      this.onChange()(setMeasureAgg(this.config(), this.entry().index, next));
    },
  }));

  /** Props for the kit's field row. */
  protected readonly fieldProps = computed(() => {
    const entry = this.entry();
    const zone = this.zone();
    const config = this.config();
    const change = this.onChange();
    const labels = this.labels();
    return {
      label: entry.label,
      "data-adapttable-part": "pivot-field" as const,
      moveUpLabel: labels.pivotMoveUp,
      moveDownLabel: labels.pivotMoveDown,
      removeLabel: labels.pivotRemove,
      onMoveUp: entry.canMoveUp
        ? () => change(moveField(config, zone, entry.index, -1))
        : undefined,
      onMoveDown: entry.canMoveDown
        ? () => change(moveField(config, zone, entry.index, 1))
        : undefined,
      onRemove: () => change(removeField(config, zone, entry.index)),
      aggregation: entry.aggregation === undefined ? undefined : this.aggTpl(),
    };
  });
}

/**
 * One zone: its fields, then the control that adds another.
 *
 * @internal
 */
@Component({
  selector: "adapt-pivot-zone-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl, AdaptPivotFieldChrome],
  template: `
    <ng-template #entries>
      @for (entry of zone().entries; track entry.key) {
        <adapt-pivot-field-chrome
          [entry]="entry"
          [zone]="zone().zone"
          [config]="config()"
          [onChange]="onChange()"
          [labels]="labels()"
          [slots]="slots()"
        />
      }
      <ng-container
        [adaptControl]="slots().Add"
        [adaptControlProps]="addProps()"
      />
    </ng-template>
    <ng-container
      [adaptControl]="slots().Zone"
      [adaptControlProps]="zoneProps()"
    />
  `,
})
export class AdaptPivotZoneChrome {
  /** The zone and its entries. */
  readonly zone = input.required<PivotZoneModel>();
  /** The configuration being edited. */
  readonly config = input.required<PivotConfig>();
  /** Report a change. */
  readonly onChange = input.required<(next: PivotConfig) => void>();
  /** Resolved labels. */
  readonly labels = input.required<Labels>();
  /** The kit's zone, field, add and aggregation controls. */
  readonly slots = input.required<PivotPanelSlots>();

  private readonly entriesTpl = viewChild<TemplateRef<unknown>>("entries");

  /** Props for the control that adds a field. */
  protected readonly addProps = computed(() => ({
    label: this.labels().pivotAdd,
    options: this.zone().addOptions,
    onAdd: (key: string) => {
      this.onChange()(assignField(this.config(), key, this.zone().zone));
    },
  }));

  /** Props for the kit's zone. */
  protected readonly zoneProps = computed(() => ({
    zone: this.zone().zone,
    label: this.zone().label,
    "data-adapttable-part": "pivot-zone" as const,
    children: this.entriesTpl(),
  }));
}

/**
 * The pivot configuration panel.
 *
 * @public
 */
@Component({
  selector: "adapt-pivot-panel-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl, AdaptPivotZoneChrome],
  template: `
    <ng-template #body>
      @for (zone of zones(); track zone.zone) {
        <adapt-pivot-zone-chrome
          [zone]="zone"
          [config]="config()"
          [onChange]="onChange()"
          [labels]="resolved()"
          [slots]="slots()"
        />
      }
    </ng-template>
    <ng-container
      [adaptControl]="slots().Surface"
      [adaptControlProps]="surfaceProps()"
    />
  `,
})
export class AdaptPivotPanelChrome {
  /** Every field the user can pivot on. */
  readonly fields = input.required<readonly PivotField[]>();
  /** The configuration being edited. The panel never holds it. */
  readonly config = input.required<PivotConfig>();
  /** Report a change. */
  readonly onChange = input.required<(next: PivotConfig) => void>();
  /** Labels; gaps fall back to English. */
  readonly labels = input<TableLabels | undefined>(undefined);
  /** The kit's controls. */
  readonly slots = input.required<PivotPanelSlots>();
  /** Class for the kit's surface. */
  readonly className = input<string | undefined>(undefined);

  private readonly body = viewChild<TemplateRef<unknown>>("body");

  /** English where the host left a gap. */
  protected readonly resolved = computed(() => resolveLabels(this.labels()));

  /** The three zones, in panel order. */
  protected readonly zones = computed(() =>
    pivotPanelZones(this.fields(), this.config(), this.resolved())
  );

  /** Props for the kit's surface. */
  protected readonly surfaceProps = computed(() => ({
    className: this.className(),
    "data-adapttable-part": "pivot-panel" as const,
    children: this.body(),
  }));
}
