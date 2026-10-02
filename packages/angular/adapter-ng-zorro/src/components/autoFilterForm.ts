/**
 * The auto-built filter form: one NG-ZORRO field per definition — a text
 * field with its operator, a yes/no select, a select, a group of checkboxes,
 * a checklist, or an operator-first number or date range.
 */
import {
  AdaptAttrs,
  AdaptChecklistChrome,
  booleanFilterFor,
  defaultFilterRegistry,
  type FilterDef,
  filterLabel,
  filterOpLabel,
  filterOptionsFor,
  type FilterOptionsState,
  type FilterTypeRegistry,
  filterWidgetKind,
  type FilterWidgetRenderProps,
  joinRelativeToken,
  listFilterValues,
  rangeFilterFor,
  type RangeOp,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  type RelativePreset,
  renderRegisteredFilter,
  resolveRenderer,
  splitRelativeToken,
  type TableLabels,
  type TableSource,
  textFilterFor,
  type TextOp,
} from "@adapttable/angular";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  type Signal,
  signal,
  TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzInputNumberModule } from "ng-zorro-antd/input-number";
import { NzSelectModule } from "ng-zorro-antd/select";

import { CHECKLIST_SLOTS } from "./checklistFilter";
import { AdaptOverlayOrigin } from "./overlayPlacement";

/** A field's column stack: the caption is a flex item, so `gap` applies. */
const FIELD_STACK =
  "display: flex; flex-direction: column; gap: 16px; min-width: 0; margin: 0; padding: 0; border: 0";

const HIDDEN_LABEL =
  "position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap";

let nextFieldId = 0;

/** A fresh id for a field's caption, which its group is labelled by. */
function fieldId(): string {
  nextFieldId += 1;
  return `adapttable-filter-${String(nextFieldId)}`;
}

/** A text filter: its operator and its value. @internal */
@Component({
  selector: "adapt-text-filter-field",
  imports: [AdaptOverlayOrigin, FormsModule, NzInputModule, NzSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let w = widget();
    <fieldset
      data-adapttable-part="filter-field"
      [attr.aria-labelledby]="id"
      [style]="stack"
    >
      <div data-adapttable-part="filter-label" [id]="id">{{ w.label }}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px">
        <label [for]="id + '-operator'" [style]="hiddenLabel">{{
          labels().operator
        }}</label>
        <nz-select
          adaptOverlayOrigin
          nzSize="small"
          [nzId]="id + '-operator'"
          data-adapttable-part="filter-operator"
          style="flex: 0 0 8.5rem; width: 8.5rem"
          [ngModel]="w.op"
          (ngModelChange)="pickOp($event)"
        >
          @for (op of w.ops; track op) {
            <nz-option [nzValue]="op" [nzLabel]="opLabel(w.opLabelKeys[op])" />
          }
        </nz-select>
        @if (w.needsValue) {
          <input
            nz-input
            nzSize="small"
            type="text"
            data-adapttable-part="filter-input"
            [attr.aria-label]="w.label"
            [attr.placeholder]="def().placeholder ?? null"
            [value]="w.value"
            (input)="w.write(w.op, $any($event.target).value)"
          />
        }
      </div>
    </fieldset>
  `,
})
export class AdaptTextFilterField<TRow> {
  /** The definition. */
  readonly def = input.required<FilterDef<TRow>>();
  /** The source whose filter bag the field writes. */
  readonly source = input.required<TableSource<TRow>>();
  /** Resolved labels. */
  readonly labels = input.required<Required<TableLabels>>();

  protected readonly id = fieldId();
  protected readonly hiddenLabel = HIDDEN_LABEL;
  protected readonly stack = FIELD_STACK;
  protected readonly widget = textFilterFor(this.def, this.source);

  protected opLabel(key: keyof TableLabels): string {
    return filterOpLabel(this.labels(), key);
  }

  /** The select offers only the widget's operators. */
  protected pickOp(value: string): void {
    const w = this.widget();
    w.write(value as TextOp, w.value);
  }
}

/** A yes/no filter. @internal */
@Component({
  selector: "adapt-boolean-filter-field",
  imports: [AdaptOverlayOrigin, FormsModule, NzSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let w = widget();
    <div data-adapttable-part="filter-field" [style]="stack">
      <label data-adapttable-part="filter-label" [for]="id">{{
        w.label
      }}</label>
      <nz-select
        adaptOverlayOrigin
        nzSize="small"
        data-adapttable-part="filter-select"
        [nzId]="id"
        [ngModel]="w.choice"
        (ngModelChange)="pick($event)"
      >
        <nz-option nzValue="" [nzLabel]="labels().boolAny" />
        <nz-option nzValue="true" [nzLabel]="labels().boolTrue" />
        <nz-option nzValue="false" [nzLabel]="labels().boolFalse" />
      </nz-select>
    </div>
  `,
})
export class AdaptBooleanFilterField<TRow> {
  /** The definition. */
  readonly def = input.required<FilterDef<TRow>>();
  /** The source whose filter bag the field writes. */
  readonly source = input.required<TableSource<TRow>>();
  /** Resolved labels. */
  readonly labels = input.required<Required<TableLabels>>();

  protected readonly id = fieldId();
  protected readonly hiddenLabel = HIDDEN_LABEL;
  protected readonly stack = FIELD_STACK;
  protected readonly widget = booleanFilterFor(this.def, this.source);

  /** The select offers only the three choices. */
  protected pick(value: string): void {
    this.widget().write(value as "" | "true" | "false");
  }
}

/** The choices of a select or checkbox field, loaded once the field starts. */
@Directive()
abstract class OptionsField<TRow> {
  abstract readonly def: Signal<FilterDef<TRow>>;
  private readonly injector = inject(Injector);
  protected readonly choices = signal<Signal<FilterOptionsState> | undefined>(
    undefined
  );
  protected readonly options = computed(
    () => this.choices()?.() ?? { options: [], loading: false }
  );

  constructor() {
    effect(() => {
      this.choices.set(filterOptionsFor(this.def(), this.injector));
    });
  }
}

/** A single-choice filter. @internal */
@Component({
  selector: "adapt-select-filter-field",
  imports: [AdaptOverlayOrigin, FormsModule, NzSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let value = current();
    <div data-adapttable-part="filter-field" [style]="stack">
      <label data-adapttable-part="filter-label" [for]="id">{{
        caption()
      }}</label>
      <nz-select
        adaptOverlayOrigin
        nzSize="small"
        data-adapttable-part="filter-select"
        [nzId]="id"
        [nzLoading]="options().loading"
        [nzNotFoundContent]="labels().checklistNoValues"
        [ngModel]="value"
        (ngModelChange)="source().setExtra(def().key, $event)"
      >
        @if (options().loading) {
          <nz-option nzValue="" nzLabel="…" [nzDisabled]="true" />
        } @else {
          <nz-option nzValue="" [nzLabel]="labels().filterAll" />
          @for (option of options().options; track option.value) {
            <nz-option [nzValue]="option.value" [nzLabel]="option.label" />
          }
        }
      </nz-select>
    </div>
  `,
})
export class AdaptSelectFilterField<TRow> extends OptionsField<TRow> {
  /** The definition. */
  readonly def = input.required<FilterDef<TRow>>();
  /** The source whose filter bag the field writes. */
  readonly source = input.required<TableSource<TRow>>();
  /** Resolved labels: the option for every value. */
  readonly labels = input.required<Required<TableLabels>>();

  protected readonly id = fieldId();
  protected readonly hiddenLabel = HIDDEN_LABEL;
  protected readonly stack = FIELD_STACK;
  protected readonly caption = computed(() => filterLabel(this.def()));
  protected readonly current = computed(() =>
    String(this.source().extra[this.def().key] ?? "")
  );
}

/** A multi-choice filter drawn as checkboxes. @internal */
@Component({
  selector: "adapt-multi-select-filter-field",
  imports: [FormsModule, NzCheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <fieldset
      data-adapttable-part="filter-field"
      [attr.aria-labelledby]="id"
      [style]="stack"
    >
      <div data-adapttable-part="filter-label" [id]="id">{{ caption() }}</div>
      <div
        style="display: flex; flex-wrap: wrap; gap: 10px; overflow: auto"
        [style.max-height.px]="listHeight"
      >
        @if (options().loading) {
          <span>…</span>
        } @else {
          @for (option of options().options; track option.value) {
            <label
              nz-checkbox
              data-adapttable-part="filter-checkbox"
              [ngModel]="selected().includes(option.value)"
              (ngModelChange)="toggle(option.value, $event)"
            >
              {{ option.label }}
            </label>
          }
        }
      </div>
    </fieldset>
  `,
})
export class AdaptMultiSelectFilterField<TRow> extends OptionsField<TRow> {
  /** The definition. */
  readonly def = input.required<FilterDef<TRow>>();
  /** The source whose filter bag the field writes. */
  readonly source = input.required<TableSource<TRow>>();

  protected readonly id = fieldId();
  protected readonly hiddenLabel = HIDDEN_LABEL;
  protected readonly stack = FIELD_STACK;
  protected readonly listHeight = 220;
  protected readonly caption = computed(() => filterLabel(this.def()));
  protected readonly selected = computed(() =>
    listFilterValues(this.source().extra[this.def().key])
  );

  protected toggle(value: string, on: boolean): void {
    const current = this.selected();
    this.source().setExtra(
      this.def().key,
      on ? [...current, value] : current.filter((item) => item !== value)
    );
  }
}

/** A range bound with a real numeric spinner or themed date input. @internal */
@Component({
  selector: "adapt-range-filter-value",
  imports: [AdaptAttrs, FormsModule, NzInputModule, NzInputNumberModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (type() === "number") {
      <label [for]="id" [style]="hiddenLabel">{{ label() }}</label>
      <nz-input-number
        #numeric
        [adaptAttrs]="{ 'aria-valuenow': numberValue() }"
        [adaptAttrsTarget]="numberTarget"
        [nzControls]="false"
        nzSize="small"
        [nzId]="id"
        [nzPlaceHolder]="label()"
        data-adapttable-part="filter-input"
        style="flex: 1 1 7rem; min-width: 7rem"
        [ngModel]="numberValue()"
        (ngModelChange)="writeNumber($event)"
      />
    } @else {
      <input
        nz-input
        nzSize="small"
        data-adapttable-part="filter-input"
        style="flex: 1 1 7rem; min-width: 7rem"
        [type]="type()"
        [attr.placeholder]="label()"
        [attr.aria-label]="label()"
        [value]="value()"
        (input)="valueChange.emit($any($event.target).value)"
      />
    }
  `,
})
export class AdaptRangeFilterValue {
  readonly type = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly valueChange = output<string>();
  protected readonly id = fieldId();
  protected readonly hiddenLabel = HIDDEN_LABEL;
  protected readonly numberValue = computed(() =>
    this.value() === "" ? null : Number(this.value())
  );
  private readonly numberElement = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("numeric", { read: ElementRef });
  protected readonly numberTarget = () =>
    this.numberElement()?.nativeElement.querySelector<HTMLInputElement>(
      "input"
    ) ?? null;

  protected writeNumber(value: number | null): void {
    this.valueChange.emit(value === null ? "" : String(value));
  }
}

/** An operator-first number or date range. @internal */
@Component({
  selector: "adapt-range-filter-field",
  imports: [
    AdaptAttrs,
    AdaptOverlayOrigin,
    AdaptRangeFilterValue,
    FormsModule,
    NzInputNumberModule,
    NzSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let w = widget();
    @let l = labels();
    <fieldset
      data-adapttable-part="filter-field"
      [attr.aria-labelledby]="id"
      [style]="stack"
    >
      <div data-adapttable-part="filter-label" [id]="id">{{ w.label }}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px">
        <label [for]="id + '-operator'" [style]="hiddenLabel">{{
          labels().operator
        }}</label>
        <nz-select
          adaptOverlayOrigin
          nzSize="small"
          [nzId]="id + '-operator'"
          data-adapttable-part="filter-operator"
          style="flex: 0 0 8.5rem; width: 8.5rem"
          [ngModel]="w.op ?? ''"
          (ngModelChange)="pickOp($event)"
        >
          <nz-option nzValue="" [nzLabel]="l.operator" />
          @for (op of w.ops; track op) {
            <nz-option [nzValue]="op" [nzLabel]="opLabel(op)" />
          }
        </nz-select>
        @if (w.arity === "two") {
          <adapt-range-filter-value
            [type]="w.inputType"
            [label]="l.from"
            [value]="w.a"
            (valueChange)="w.write(w.op, $event, w.b)"
          />
          <adapt-range-filter-value
            [type]="w.inputType"
            [label]="l.to"
            [value]="w.b"
            (valueChange)="w.write(w.op, w.a, $event)"
          />
        }
        @if (w.op === "relative") {
          @let token = relative();
          <label [for]="id + '-preset'" [style]="hiddenLabel">{{
            l.opRelative
          }}</label>
          <nz-select
            adaptOverlayOrigin
            nzSize="small"
            [nzId]="id + '-preset'"
            data-adapttable-part="filter-input"
            style="flex: 1 1 8.5rem; min-width: 8.5rem"
            [ngModel]="token.preset"
            (ngModelChange)="pickPreset($event)"
          >
            @for (preset of presets; track preset) {
              <nz-option [nzValue]="preset" [nzLabel]="presetLabel(preset)" />
            }
          </nz-select>
          @if (token.preset === "last" || token.preset === "next") {
            <label [for]="id + '-count'" [style]="hiddenLabel">{{
              l.value
            }}</label>
            <nz-input-number
              #count
              [adaptAttrs]="{ 'aria-valuenow': token.n }"
              [adaptAttrsTarget]="countTarget"
              [nzControls]="false"
              nzSize="small"
              [nzId]="id + '-count'"
              [nzMin]="1"
              data-adapttable-part="filter-input"
              style="flex: 0 0 4.5rem; width: 4.5rem"
              [ngModel]="token.n"
              (ngModelChange)="pickCount($event)"
            />
          }
        }
        @if (
          w.op !== undefined &&
          w.op !== "relative" &&
          w.arity !== "none" &&
          w.arity !== "two"
        ) {
          <adapt-range-filter-value
            [type]="w.inputType"
            [label]="l.value"
            [value]="w.a"
            (valueChange)="w.write(w.op, $event, '')"
          />
        }
      </div>
    </fieldset>
  `,
})
export class AdaptRangeFilterField<TRow> {
  /** The definition. */
  readonly def = input.required<FilterDef<TRow>>();
  /** The source whose filter bag the field writes. */
  readonly source = input.required<TableSource<TRow>>();
  /** Resolved labels. */
  readonly labels = input.required<Required<TableLabels>>();

  protected readonly id = fieldId();
  protected readonly hiddenLabel = HIDDEN_LABEL;
  protected readonly stack = FIELD_STACK;
  private readonly countElement = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("count", { read: ElementRef });
  protected readonly countTarget = () =>
    this.countElement()?.nativeElement.querySelector<HTMLInputElement>(
      "input"
    ) ?? null;
  protected readonly presets = RELATIVE_PRESETS;
  protected readonly widget = rangeFilterFor(this.def, this.source);
  protected readonly relative = computed(() =>
    splitRelativeToken(this.widget().a)
  );

  protected opLabel(op: RangeOp): string {
    const keys = this.widget().opLabelKeys as Partial<
      Record<RangeOp, keyof TableLabels>
    >;
    const key = keys[op];
    return key ? filterOpLabel(this.labels(), key) : op;
  }

  protected presetLabel(preset: RelativePreset): string {
    return this.labels()[RELATIVE_PRESET_LABEL_KEYS[preset]];
  }

  protected pickOp(value: string): void {
    const w = this.widget();
    const next = w.ops.find((op) => op === value);
    w.setOp(next);
    w.write(next, w.a, w.b);
  }

  /** The select offers only the presets. */
  protected pickPreset(value: string): void {
    const w = this.widget();
    w.write(
      w.op,
      joinRelativeToken(value as RelativePreset, this.relative().n),
      ""
    );
  }

  protected pickCount(value: number | null): void {
    const w = this.widget();
    w.write(w.op, joinRelativeToken(this.relative().preset, value ?? 1), "");
  }
}

/**
 * The auto-built filter form: one NG-ZORRO field per definition.
 *
 * @public
 */
@Component({
  selector: "adapt-auto-filter-form",
  imports: [
    AdaptBooleanFilterField,
    AdaptChecklistChrome,
    AdaptMultiSelectFilterField,
    AdaptRangeFilterField,
    AdaptSelectFilterField,
    AdaptTextFilterField,
    NgComponentOutlet,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @for (field of fields(); track field.def.key) {
      @let def = field.def;
      @if (field.renderer?.template; as template) {
        <ng-container
          [ngTemplateOutlet]="template"
          [ngTemplateOutletContext]="field.context"
        />
      } @else if (field.renderer?.component; as component) {
        <ng-container
          [ngComponentOutlet]="component"
          [ngComponentOutletInputs]="field.renderer.inputs"
        />
      } @else if (field.text; as text) {
        {{ text }}
      } @else {
        @switch (kindOf(def)) {
          @case ("text") {
            <adapt-text-filter-field
              [def]="def"
              [source]="source()"
              [labels]="labels()"
            />
          }
          @case ("boolean") {
            <adapt-boolean-filter-field
              [def]="def"
              [source]="source()"
              [labels]="labels()"
            />
          }
          @case ("select") {
            <adapt-select-filter-field
              [def]="def"
              [source]="source()"
              [labels]="labels()"
            />
          }
          @case ("multiSelect") {
            <adapt-multi-select-filter-field [def]="def" [source]="source()" />
          }
          @case ("checklist") {
            <adapt-checklist-chrome
              [def]="def"
              [source]="source()"
              [labels]="labels()"
              [slots]="checklistSlots"
            />
          }
          @case ("range") {
            <adapt-range-filter-field
              [def]="def"
              [source]="source()"
              [labels]="labels()"
            />
          }
        }
      }
    }
  `,
})
export class AdaptAutoFilterForm<TRow> {
  /** The resolved definitions, in order. */
  readonly defs = input.required<readonly FilterDef<TRow>[]>();
  /** The source whose filter bag the fields read and write. */
  readonly source = input.required<TableSource<TRow>>();
  /** Resolved labels. */
  readonly labels = input.required<Required<TableLabels>>();
  /** The filter type registry. */
  readonly registry = input<FilterTypeRegistry>(defaultFilterRegistry);

  protected readonly checklistSlots = CHECKLIST_SLOTS;

  /** Resolve each host renderer with the same live props its callback receives. */
  protected readonly fields = computed(() => {
    const source = this.source();
    const labels = this.labels();
    const registry = this.registry();
    return this.defs().map((def) => {
      const props: FilterWidgetRenderProps<TRow> = {
        def,
        source,
        labels,
        className: undefined,
      };
      const value = renderRegisteredFilter(def, source, labels, registry);
      const context = { ...props, $implicit: props };
      let renderer: TemplateRef<typeof context> | Type<unknown> | undefined;
      if (value instanceof TemplateRef) {
        renderer = value;
      } else if (typeof value === "function" && "ɵcmp" in value) {
        renderer = value as unknown as Type<unknown>;
      }
      return {
        def,
        context,
        renderer: resolveRenderer(renderer, context),
        text:
          value && (typeof value === "string" || typeof value === "number")
            ? String(value)
            : null,
      };
    });
  });

  /** Which field draws a definition. */
  protected kindOf(def: FilterDef<TRow>): string {
    const registry = this.registry();
    const kind: string =
      registry.get(def.type)?.widget ?? filterWidgetKind(def, registry) ?? "";
    return kind === "dateRange" || kind === "numberRange" ? "range" : kind;
  }
}
