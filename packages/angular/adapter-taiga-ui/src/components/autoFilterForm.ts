import {
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
  inject,
  Injector,
  input,
  type OnInit,
  type Signal,
  signal,
  TemplateRef,
  type Type,
} from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";
import { CHECKLIST_SLOTS } from "./checklistFilter";

/**
 * The auto-built filter form: one native field per definition — a text
 * field with its operator, a yes/no select, a select, a group of checkboxes,
 * a checklist, or an operator-first number or date range.
 */

/** A field's column stack: the caption is a flex item, so `gap` applies. */
const FIELD_STACK =
  "display: flex; flex-direction: column; gap: 16px; min-width: 0; margin: 0; padding: 0; border: 0";

let nextFieldId = 0;

/** A fresh id for a field's caption, which its group is labelled by. */
function fieldId(): string {
  nextFieldId += 1;
  return `adapttable-filter-${String(nextFieldId)}`;
}

/** A text filter: its operator and its value. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-text-filter-field",
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
        <tui-textfield [stringify]="w.opLabelKeys | taigaLabels: labels()"
          ><input
            tuiSelect
            data-adapttable-part="filter-operator"
            style="flex: 0 0 8.5rem; width: 8.5rem"
            [attr.aria-label]="labels().operator"
            [ngModel]="w.op"
            (ngModelChange)="pickOp($event)"
          /><tui-data-list *tuiDropdown>
            @for (op of w.ops; track op) {
              <button tuiOption type="button" [value]="op">
                {{ opLabel(w.opLabelKeys[op]) }}
              </button>
            }
          </tui-data-list></tui-textfield
        >
        @if (w.needsValue) {
          <tui-textfield
            ><input
              tuiInput
              type="text"
              data-adapttable-part="filter-input"
              [attr.aria-label]="w.label"
              [attr.placeholder]="def().placeholder ?? null"
              [value]="w.value"
              (input)="w.write(w.op, $any($event.target).value)"
          /></tui-textfield>
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
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-boolean-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let w = widget();
    <label data-adapttable-part="filter-field" [style]="stack">
      <span data-adapttable-part="filter-label">{{ w.label }}</span>
      <tui-textfield
        [stringify]="
          {
            '': labels().boolAny,
            true: labels().boolTrue,
            false: labels().boolFalse,
          } | taigaLabels
        "
        ><input
          tuiSelect
          data-adapttable-part="filter-select"
          [attr.aria-label]="w.label"
          [ngModel]="w.choice"
          (ngModelChange)="pick($event)"
        /><tui-data-list *tuiDropdown>
          <button tuiOption type="button" value="">
            {{ labels().boolAny }}
          </button>
          <button tuiOption type="button" value="true">
            {{ labels().boolTrue }}
          </button>
          <button tuiOption type="button" value="false">
            {{ labels().boolFalse }}
          </button>
        </tui-data-list></tui-textfield
      >
    </label>
  `,
})
export class AdaptBooleanFilterField<TRow> {
  /** The definition. */
  readonly def = input.required<FilterDef<TRow>>();
  /** The source whose filter bag the field writes. */
  readonly source = input.required<TableSource<TRow>>();
  /** Resolved labels. */
  readonly labels = input.required<Required<TableLabels>>();

  protected readonly stack = FIELD_STACK;
  protected readonly widget = booleanFilterFor(this.def, this.source);

  /** The select offers only the three choices. */
  protected pick(value: string): void {
    this.widget().write(value as "" | "true" | "false");
  }
}

/** The choices of a select or checkbox field, following its definition. */
@Directive()
abstract class OptionsField<TRow> implements OnInit {
  abstract readonly def: Signal<FilterDef<TRow>>;
  private readonly injector = inject(Injector);
  protected readonly choices = signal<Signal<FilterOptionsState> | undefined>(
    undefined
  );
  protected readonly options = computed(
    () => this.choices()?.() ?? { options: [], loading: false }
  );

  ngOnInit(): void {
    this.choices.set(filterOptionsFor(this.def, this.injector));
  }
}

/** A single-choice filter. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-select-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let value = current();
    <label data-adapttable-part="filter-field" [style]="stack">
      <span data-adapttable-part="filter-label">{{ caption() }}</span>
      <tui-textfield
        [stringify]="
          options().options | taigaLabels: { '': labels().filterAll }
        "
        ><input
          tuiSelect
          data-adapttable-part="filter-select"
          [ngModel]="value"
          (ngModelChange)="source().setExtra(def().key, $event)"
        /><tui-data-list *tuiDropdown>
          @if (options().loading) {
            <button tuiOption type="button" value="" [disabled]="true">
              …
            </button>
          } @else {
            <button tuiOption type="button" value="">
              {{ labels().filterAll }}
            </button>
            @for (option of options().options; track option.value) {
              <button tuiOption type="button" [value]="option.value">
                {{ option.label }}
              </button>
            }
          }
        </tui-data-list></tui-textfield
      >
    </label>
  `,
})
export class AdaptSelectFilterField<TRow> extends OptionsField<TRow> {
  /** The definition. */
  readonly def = input.required<FilterDef<TRow>>();
  /** The source whose filter bag the field writes. */
  readonly source = input.required<TableSource<TRow>>();
  /** Resolved labels: the option for every value. */
  readonly labels = input.required<Required<TableLabels>>();

  protected readonly stack = FIELD_STACK;
  protected readonly caption = computed(() => filterLabel(this.def()));
  protected readonly current = computed(() =>
    String(this.source().extra[this.def().key] ?? "")
  );
}

/** A multi-choice filter drawn as checkboxes. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-multi-select-filter-field",
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
        data-taiga-part="filter-checkbox-group"
        style="display: flex; flex-wrap: wrap; gap: 10px; overflow: auto"
        [style.max-height.px]="listHeight"
      >
        @if (options().loading) {
          <span data-taiga-part="filter-options-loading">…</span>
        } @else {
          @for (option of options().options; track option.value) {
            <label data-adapttable-part="filter-checkbox">
              <input
                tuiCheckbox
                type="checkbox"
                [ngModelOptions]="{ standalone: true }"
                [ngModel]="selected().includes(option.value)"
                (ngModelChange)="toggle(option.value, $event)"
              />
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

/** An operator-first number or date range. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-range-filter-field",
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
        <tui-textfield
          ><input
            tuiSelect
            data-adapttable-part="filter-operator"
            style="flex: 0 0 8.5rem; width: 8.5rem"
            [attr.aria-label]="l.operator"
            [ngModel]="w.op ?? ''"
            (ngModelChange)="pickOp($event)"
          /><tui-data-list *tuiDropdown>
            <button tuiOption type="button" value="">
              {{ l.operator }}
            </button>
            @for (op of w.ops; track op) {
              <button tuiOption type="button" [value]="op">
                {{ opLabel(op) }}
              </button>
            }
          </tui-data-list></tui-textfield
        >
        @if (w.arity === "two") {
          <tui-textfield
            ><input
              tuiInput
              data-adapttable-part="filter-input"
              style="flex: 1 1 7rem; min-width: 7rem"
              [type]="w.inputType"
              [attr.placeholder]="l.from"
              [attr.aria-label]="l.from"
              [value]="w.a"
              (input)="w.write(w.op, $any($event.target).value, w.b)"
          /></tui-textfield>
          <tui-textfield
            ><input
              tuiInput
              data-adapttable-part="filter-input"
              style="flex: 1 1 7rem; min-width: 7rem"
              [type]="w.inputType"
              [attr.placeholder]="l.to"
              [attr.aria-label]="l.to"
              [value]="w.b"
              (input)="w.write(w.op, w.a, $any($event.target).value)"
          /></tui-textfield>
        }
        @if (w.op === "relative") {
          @let token = relative();
          <tui-textfield
            ><input
              tuiSelect
              data-adapttable-part="filter-input"
              style="flex: 1 1 8.5rem; min-width: 8.5rem"
              [attr.aria-label]="l.opRelative"
              [ngModel]="token.preset"
              (ngModelChange)="pickPreset($event)"
            /><tui-data-list *tuiDropdown>
              @for (preset of presets; track preset) {
                <button tuiOption type="button" [value]="preset">
                  {{ presetLabel(preset) }}
                </button>
              }
            </tui-data-list></tui-textfield
          >
          @if (token.preset === "last" || token.preset === "next") {
            <tui-textfield
              ><input
                tuiInput
                type="number"
                min="1"
                data-adapttable-part="filter-input"
                style="flex: 0 0 4.5rem; width: 4.5rem"
                [attr.aria-label]="l.value"
                [value]="token.n"
                (input)="pickCount($any($event.target).value)"
            /></tui-textfield>
          }
        }
        @if (
          w.op !== undefined &&
          w.op !== "relative" &&
          w.arity !== "none" &&
          w.arity !== "two"
        ) {
          <tui-textfield
            ><input
              tuiInput
              data-adapttable-part="filter-input"
              style="flex: 1 1 7rem; min-width: 7rem"
              [type]="w.inputType"
              [attr.placeholder]="l.value"
              [attr.aria-label]="l.value"
              [value]="w.a"
              (input)="w.write(w.op, $any($event.target).value, '')"
          /></tui-textfield>
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
  protected readonly stack = FIELD_STACK;
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

  protected pickCount(value: string): void {
    const w = this.widget();
    w.write(w.op, joinRelativeToken(this.relative().preset, Number(value)), "");
  }
}

/**
 * The auto-built filter form: one native field per definition.
 *
 * @public
 */
@Component({
  selector: "adapt-auto-filter-form",
  imports: [
    ...TAIGA_CONTROLS,
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
