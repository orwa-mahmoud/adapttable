import {
  defaultFilterRegistry,
  type FilterDef,
  filterLabel,
  filterOpLabel,
  type FilterTypeRegistry,
  filterWidgetKind,
  type FilterWidgetRenderProps,
  joinRelativeToken,
  listFilterValues,
  type RangeOp,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  type RelativePreset,
  renderRegisteredFilter,
  splitRelativeToken,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import {
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

import { resolveRenderer } from "../cell";
import {
  booleanFilterFor,
  filterOptionsFor,
  type FilterOptionsState,
  rangeFilterFor,
  textFilterFor,
} from "./filters";
let nextFieldId = 0;
/** Allocate a caption ID shared by adapter-native filter controls. @public */
export function createFilterFieldId(): string {
  nextFieldId += 1;
  return `adapttable-filter-${String(nextFieldId)}`;
}
/** Shared OptionsField signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptFilterOptionsModel<TRow> implements OnInit {
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
/** Shared AdaptTextFilterField signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptTextFilterFieldModel<TRow> {
  readonly def = input.required<FilterDef<TRow>>();
  readonly source = input.required<TableSource<TRow>>();
  readonly labels = input.required<Required<TableLabels>>();
  protected readonly id = createFilterFieldId();
  protected readonly widget = textFilterFor(this.def, this.source);
  protected opLabel(key: keyof TableLabels): string {
    return filterOpLabel(this.labels(), key);
  }
  protected pickOp(value: string | null): void {
    if (value === null) return;
    const widget = this.widget();
    const op = widget.ops.find((op) => op === value);
    if (op !== undefined) widget.write(op, widget.value);
  }
}
/** Shared AdaptBooleanFilterField signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptBooleanFilterFieldModel<TRow> {
  readonly def = input.required<FilterDef<TRow>>();
  readonly source = input.required<TableSource<TRow>>();
  readonly labels = input.required<Required<TableLabels>>();
  protected readonly widget = booleanFilterFor(this.def, this.source);
  protected pick(value: string | null): void {
    if (value === "true" || value === "false" || value === "" || value === null)
      this.widget().write(value ?? "");
  }
}
/** Shared AdaptSelectFilterField signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptSelectFilterFieldModel<
  TRow,
> extends AdaptFilterOptionsModel<TRow> {
  readonly def = input.required<FilterDef<TRow>>();
  readonly source = input.required<TableSource<TRow>>();
  readonly labels = input.required<Required<TableLabels>>();
  protected readonly caption = computed(() => filterLabel(this.def()));
  protected readonly current = computed(() =>
    String(this.source().extra[this.def().key] ?? "")
  );
}
/** Shared AdaptMultiSelectFilterField signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptMultiSelectFilterFieldModel<
  TRow,
> extends AdaptFilterOptionsModel<TRow> {
  readonly def = input.required<FilterDef<TRow>>();
  readonly source = input.required<TableSource<TRow>>();
  protected readonly id = createFilterFieldId();
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
/** Shared AdaptRangeFilterField signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptRangeFilterFieldModel<TRow> {
  readonly def = input.required<FilterDef<TRow>>();
  readonly source = input.required<TableSource<TRow>>();
  readonly labels = input.required<Required<TableLabels>>();
  protected readonly id = createFilterFieldId();
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
  protected pickOp(value: string | null): void {
    const widget = this.widget();
    const next = widget.ops.find((op) => op === value);
    widget.setOp(next);
    widget.write(next, widget.a, widget.b);
  }
  protected pickPreset(value: string | null): void {
    if (value === null) return;
    const preset = RELATIVE_PRESETS.find((preset) => preset === value);
    if (preset === undefined) return;
    const widget = this.widget();
    widget.write(widget.op, joinRelativeToken(preset, this.relative().n), "");
  }
  protected pickCount(value: string): void {
    const widget = this.widget();
    widget.write(
      widget.op,
      joinRelativeToken(this.relative().preset, Number(value)),
      ""
    );
  }
}
/** Shared AdaptAutoFilterForm signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptAutoFilterFormModel<TRow> {
  readonly defs = input.required<readonly FilterDef<TRow>[]>();
  readonly source = input.required<TableSource<TRow>>();
  readonly labels = input.required<Required<TableLabels>>();
  readonly registry = input<FilterTypeRegistry>(defaultFilterRegistry);
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
  protected kindOf(def: FilterDef<TRow>): string {
    const registry = this.registry();
    const kind: string =
      registry.get(def.type)?.widget ?? filterWidgetKind(def, registry) ?? "";
    return kind === "dateRange" || kind === "numberRange" ? "range" : kind;
  }
}
