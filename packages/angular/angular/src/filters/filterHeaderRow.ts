/**
 * Compact per-column filter row under the header. Structure only — the kit
 * passes the search, select, range and multi controls the reader uses. The
 * same definitions and extra bag the panel uses.
 */
import {
  type BooleanChoice,
  booleanFilterWidget,
  defaultFilterRegistry,
  type FilterDef,
  filterDefForColumn,
  type FilterFormSource,
  type FilterOption,
  type FilterTypeRegistry,
  headerFilterBooleanOptions,
  headerFilterCellKind,
  headerFilterMultiModel,
  headerFilterRangeModel,
  headerFilterSelectModel,
  initialRangeFilterOp,
  initialTextFilterOp,
  rangeFilterWidget,
  renderRegisteredFilter,
  type TableLabels,
  textFilterWidget,
  type TextOp,
} from "@adapttable/core";
import type {
  FilterHeaderClassNames,
  FilterHeaderMultiProps,
  FilterHeaderRangeProps,
  FilterHeaderSearchProps,
  FilterHeaderSelectProps,
} from "@adapttable/core/binding";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  type OnInit,
  signal,
  TemplateRef,
  type Type,
} from "@angular/core";

import { resolveRenderer } from "../cell";
import { AdaptControl } from "../control";
import { AdaptColumnSpacer } from "../virtual/columnSpacer";
import { filterOptionsFor } from "./filters";

/**
 * The kit's controls for one header-filter cell. Each is a standalone
 * component with one `props` input: {@link FilterHeaderSearchProps},
 * {@link FilterHeaderSelectProps}, {@link FilterHeaderRangeProps} or
 * {@link FilterHeaderMultiProps}.
 *
 * @public
 */
export interface FilterHeaderSlots {
  /** A text search box. */
  readonly Search: Type<unknown>;
  /** A single-choice select, also used for a boolean. */
  readonly Select: Type<unknown>;
  /** One bound of a number or date range. */
  readonly Range: Type<unknown>;
  /** A compact multi-select menu. */
  readonly Multi: Type<unknown>;
}

/** Class names that are actually set, joined for a `class` attribute. */
function joinClass(
  ...names: readonly (string | undefined)[]
): string | undefined {
  const present = names.filter((name): name is string => Boolean(name));
  return present.length > 0 ? present.join(" ") : undefined;
}

/**
 * Compact control for one filter definition — one cell of the header row,
 * or a single column title.
 *
 * @public
 */
@Component({
  selector: "adapt-filter-header-control-chrome",
  imports: [AdaptControl, NgComponentOutlet, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let content = custom();
    @if (content.renderer?.template; as template) {
      <ng-container
        [ngTemplateOutlet]="template"
        [ngTemplateOutletContext]="content.context"
      />
    } @else if (content.renderer?.component; as component) {
      <ng-container
        [ngComponentOutlet]="component"
        [ngComponentOutletInputs]="content.renderer.inputs"
      />
    } @else if (content.text; as text) {
      {{ text }}
    } @else {
      @switch (kind()) {
        @case ("text") {
          <ng-container
            [adaptControl]="slots().Search"
            [adaptControlProps]="textProps()"
          />
        }
        @case ("select") {
          <ng-container
            [adaptControl]="slots().Select"
            [adaptControlProps]="selectProps()"
          />
        }
        @case ("boolean") {
          <ng-container
            [adaptControl]="slots().Select"
            [adaptControlProps]="booleanProps()"
          />
        }
        @case ("multi") {
          <ng-container
            [adaptControl]="slots().Multi"
            [adaptControlProps]="multiProps()"
          />
        }
        @case ("range") {
          <span
            data-adapttable-part="filter-header-input"
            [class]="className()"
          >
            <ng-container
              [adaptControl]="slots().Range"
              [adaptControlProps]="rangeLower()"
            />
            @if (rangeUpper(); as upper) {
              <ng-container
                [adaptControl]="slots().Range"
                [adaptControlProps]="upper"
              />
            }
          </span>
        }
      }
    }
  `,
})
export class AdaptFilterHeaderControlChrome<TRow> implements OnInit {
  /** The filter this control edits. */
  readonly def = input.required<FilterDef<TRow>>();
  /** Reads and writes the active filter values. */
  readonly source = input.required<FilterFormSource<TRow>>();
  /** Resolved labels, every key filled. */
  readonly labels = input.required<Required<TableLabels>>();
  /** The kit's controls for each filter shape. */
  readonly slots = input.required<FilterHeaderSlots>();
  /** Class for the control. */
  readonly className = input<string>();
  /** Class for a multi-select menu. */
  readonly menuClassName = input<string>();
  /** Custom filter types, beyond the built-ins. */
  readonly registry = input<FilterTypeRegistry>();

  /** Choices for a select or multi cell. Empty until `ngOnInit`. */
  protected readonly options = signal<readonly FilterOption[]>([]);

  private readonly injector = inject(Injector);
  private readonly textOp = signal<TextOp | undefined>(undefined);
  private readonly resolved = computed(
    () => this.registry() ?? defaultFilterRegistry
  );

  /** A host template, component, or text takes precedence over the kit widget. */
  protected readonly custom = computed(() => {
    const props = {
      def: this.def(),
      source: this.source(),
      labels: this.labels(),
      className: this.className(),
    };
    const value = renderRegisteredFilter(
      props.def,
      props.source,
      props.labels,
      this.resolved(),
      props.className
    );
    const context = { ...props, $implicit: props };
    let renderer: TemplateRef<typeof context> | Type<unknown> | undefined;
    if (value instanceof TemplateRef) {
      renderer = value;
    } else if (typeof value === "function" && "ɵcmp" in value) {
      renderer = value as unknown as Type<unknown>;
    }
    return {
      context,
      renderer: resolveRenderer(renderer, context),
      text:
        value && (typeof value === "string" || typeof value === "number")
          ? String(value)
          : null,
    };
  });

  /** Which built-in control this definition draws. */
  protected readonly kind = computed(() =>
    headerFilterCellKind(this.def(), this.resolved())
  );

  /** Props for a text search. */
  protected readonly textProps = computed((): FilterHeaderSearchProps => {
    const def = this.def();
    const source = this.source();
    const op = this.textOp() ?? initialTextFilterOp(def, source.extra);
    const widget = textFilterWidget(def, source, op, (next) => {
      this.textOp.set(next);
    });
    return {
      label: widget.label,
      placeholder: this.labels().search,
      value: widget.value,
      className: this.className(),
      onChange: (value) => widget.write(widget.op, value),
    };
  });

  /** Props for a single-choice select. */
  protected readonly selectProps = computed((): FilterHeaderSelectProps => {
    const model = headerFilterSelectModel(
      this.def(),
      this.source(),
      this.options(),
      this.labels()
    );
    return {
      label: model.label,
      value: model.value,
      options: model.options,
      className: this.className(),
      onChange: model.write,
    };
  });

  /** Props for a yes / no / any select. */
  protected readonly booleanProps = computed((): FilterHeaderSelectProps => {
    const widget = booleanFilterWidget(this.def(), this.source());
    return {
      label: widget.label,
      value: widget.choice,
      options: headerFilterBooleanOptions(this.labels()),
      className: this.className(),
      onChange: (value) => widget.write(value as BooleanChoice),
    };
  });

  /** Props for a compact multi-select menu. */
  protected readonly multiProps = computed((): FilterHeaderMultiProps => {
    const model = headerFilterMultiModel(
      this.def(),
      this.source(),
      this.options(),
      this.labels()
    );
    return {
      label: model.label,
      summary: model.summary,
      options: model.options,
      selected: model.selected,
      className: this.className(),
      menuClassName: this.menuClassName(),
      onToggle: model.toggle,
    };
  });

  private readonly range = computed(() => {
    const def = this.def();
    const source = this.source();
    const widget = rangeFilterWidget(
      def,
      source,
      initialRangeFilterOp(def, source.extra)
    );
    const model = headerFilterRangeModel(widget);
    const field = (
      value: string,
      onChange: (next: string) => void
    ): FilterHeaderRangeProps => ({
      label: widget.label,
      type: widget.inputType,
      value,
      onChange,
    });
    return {
      lower: field(widget.a, model.writeLower),
      upper: model.showUpper ? field(widget.b, model.writeUpper) : null,
    };
  });

  /** The lower bound, or the only bound. */
  protected readonly rangeLower = computed(() => this.range().lower);
  /** The upper bound, present only for a between pair. */
  protected readonly rangeUpper = computed(() => this.range().upper);

  /** Load the definition's choices once its input is bound. */
  ngOnInit(): void {
    const state = filterOptionsFor(this.def(), this.injector);
    this.options.set(state().options);
    effect(
      () => {
        this.options.set(state().options);
      },
      { injector: this.injector }
    );
  }
}

/**
 * Second header row of per-column quick filters. Pads and spacers match the
 * leaf header so sticky, pin offsets and column windowing stay aligned.
 * Renders nothing when the row is disabled or there is no definition.
 *
 * @public
 */
@Component({
  selector: "adapt-filter-header-chrome",
  imports: [AdaptColumnSpacer, AdaptFilterHeaderControlChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (shown()) {
      <tr
        data-adapttable-part="filter-header-row"
        [attr.aria-label]="labels().headerFilters"
        [class]="rowClass()"
      >
        @if (expandable()) {
          <td
            data-adapttable-part="expand-header"
            [class]="padClass(classNames()?.expandHeader)"
            [attr.data-sticky]="stickyAttr() ? 'true' : null"
            [style]="padStyle()"
          ></td>
        }
        @if (showReorder()) {
          <td
            data-adapttable-part="reorder-header"
            [class]="padClass(classNames()?.reorderHeader)"
            [attr.data-sticky]="stickyAttr() ? 'true' : null"
            [style]="padStyle()"
          ></td>
        }
        @if (selection()) {
          <td
            data-adapttable-part="selection-header"
            [class]="padClass(classNames()?.selectionHeader)"
            [attr.data-sticky]="stickyAttr() ? 'true' : null"
            [style]="padStyle()"
          ></td>
        }
        @if (columnSpacers(); as spacers) {
          <adapt-column-spacer [width]="spacers.start" side="start" as="th" />
        }
        @for (column of columns(); track column.key) {
          <th
            data-adapttable-part="filter-header-cell"
            [attr.data-column-key]="column.key"
            [attr.data-sticky]="stickyAttr() ? 'true' : null"
            [attr.data-pinned]="pinned(column.key)"
            [class]="cellClass()"
            [style]="styled(column)"
          >
            @if (defFor(column.key); as def) {
              <adapt-filter-header-control-chrome
                [def]="def"
                [source]="source()"
                [labels]="labels()"
                [slots]="slots()"
                [className]="classNames()?.filterHeaderInput"
                [menuClassName]="classNames()?.filterHeaderMenu"
                [registry]="registry()"
              />
            }
          </th>
        }
        @if (columnSpacers(); as spacers) {
          <adapt-column-spacer [width]="spacers.end" side="end" as="th" />
        }
        @if (showActions()) {
          <td
            data-adapttable-part="actions-header"
            [class]="padClass(classNames()?.actionsHeader)"
            [attr.data-sticky]="stickyAttr() ? 'true' : null"
            [style]="padStyle()"
          ></td>
        }
      </tr>
    }
  `,
})
export class AdaptFilterHeaderChrome<TRow> {
  /** When false the row does not render, even if definitions exist. */
  readonly enabled = input(true);
  /** Visible columns, so each filter lands under its own header. */
  readonly columns = input.required<readonly { readonly key: string }[]>();
  /** Filter definitions to render. */
  readonly defs = input.required<readonly FilterDef<TRow>[]>();
  /** Reads and writes the active filter values. */
  readonly source = input.required<FilterFormSource<TRow>>();
  /** Resolved labels, every key filled. */
  readonly labels = input.required<Required<TableLabels>>();
  /** The kit's controls for each filter shape. */
  readonly slots = input.required<FilterHeaderSlots>();
  /** Custom filter types, beyond the built-ins. */
  readonly registry = input<FilterTypeRegistry>();
  /** Whether an expansion column is injected. */
  readonly expandable = input(false);
  /** Whether a reorder column is injected. */
  readonly showReorder = input(false);
  /** Whether a selection column is injected. */
  readonly selection = input(false);
  /** Whether an actions column is injected. */
  readonly showActions = input(false);
  /** Widths standing in for columns outside the window. */
  readonly columnSpacers = input<{
    readonly start: number;
    readonly end: number;
  }>();
  /** Width and sticky offsets for a column's filter cell. */
  readonly cellStyle =
    input<
      (column: {
        readonly key: string;
      }) => Readonly<Record<string, string>> | undefined
    >();
  /** Edge a column is pinned to, absent when it floats. */
  readonly pinSide = input<(key: string) => "start" | "end" | undefined>();
  /** Style for the spacer cells at either end. */
  readonly padStyle = input<Readonly<Record<string, string>>>();
  /** Present only when the row sticks, for styling hooks. */
  readonly stickyAttr = input<true>();
  /** Per-part classes for the row. */
  readonly classNames = input<FilterHeaderClassNames>();

  /** The row is drawn only when it is enabled and has a definition. */
  protected readonly shown = computed(
    () => this.enabled() && this.defs().length > 0
  );

  /** Class for the row. */
  protected rowClass(): string | undefined {
    return this.classNames()?.filterHeaderRow;
  }

  /** Class for one filter cell. */
  protected cellClass(): string | undefined {
    return joinClass(
      this.classNames()?.headerCell,
      this.classNames()?.filterHeaderCell
    );
  }

  /** Class for a pad, sharing the header-cell class. */
  protected padClass(extra: string | undefined): string | undefined {
    return joinClass(this.classNames()?.headerCell, extra);
  }

  /** The definition under this column, if the column is filterable. */
  protected defFor(key: string): FilterDef<TRow> | undefined {
    return filterDefForColumn(this.defs(), key);
  }

  /** Pin edge for a column key. */
  protected pinned(key: string): "start" | "end" | undefined {
    return this.pinSide()?.(key);
  }

  /** Inline style for one filter cell. */
  protected styled(column: {
    readonly key: string;
  }): Readonly<Record<string, string>> | undefined {
    return this.cellStyle()?.(column);
  }
}
