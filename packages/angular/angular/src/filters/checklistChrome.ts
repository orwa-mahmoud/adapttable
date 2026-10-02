/**
 * The checklist filter's Chrome: a searchable list of every value a column
 * holds, with counts, select-all and clear, windowed once it is long — from
 * core's checklist model. The kit hands its search box, button and checkbox
 * components in `slots`.
 */
import {
  CHECKLIST_ITEM_WIDTH,
  CHECKLIST_LIST_HEIGHT,
  CHECKLIST_OPTION_GAP,
  CHECKLIST_VIRTUALIZE_AT,
  checklistActions,
  checklistItems,
  type FilterDef,
  filterLabel,
  listFilterValues,
  resolveLabels,
  searchChecklistItems,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import type {
  ChecklistButtonProps,
  ChecklistSearchProps,
} from "@adapttable/core/binding";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  signal,
  type Type,
  viewChild,
} from "@angular/core";

import { AdaptControl } from "../control";
import { checklistSlice, nextChecklistViewport } from "./checklistWindow";

/**
 * The kit's controls for the checklist. Each is a standalone component with
 * one `props` input: `ChecklistSearchProps`, `ChecklistButtonProps` and
 * `ChecklistCheckboxProps`.
 *
 * @public
 */
export interface ChecklistSlots {
  /** The search box. */
  readonly Search: Type<unknown>;
  /** An action button. */
  readonly Button: Type<unknown>;
  /** One value's checkbox. */
  readonly Checkbox: Type<unknown>;
}

/**
 * The checklist filter. Renders nothing for a definition whose values are
 * not available on this tier.
 *
 * @public
 */
@Component({
  selector: "adapt-checklist-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (model(); as m) {
      <div
        data-adapttable-part="filter-checklist"
        style="display: flex; flex-direction: column; gap: 8px; min-width: 0"
      >
        <div data-adapttable-part="filter-label">{{ m.label }}</div>
        <ng-container
          [adaptControl]="slots().Search"
          [adaptControlProps]="m.search"
        />
        <div
          data-adapttable-part="filter-checklist-actions"
          style="display: flex; flex-wrap: wrap; gap: 8px"
        >
          <ng-container
            [adaptControl]="slots().Button"
            [adaptControlProps]="m.selectAll"
          />
          <ng-container
            [adaptControl]="slots().Button"
            [adaptControlProps]="m.clear"
          />
        </div>
        <div
          #list
          data-adapttable-part="filter-checklist-list"
          [attr.data-virtualized]="m.virtualize ? 'true' : 'false'"
          [style]="m.virtualize ? windowedListStyle : listStyle"
          (scroll)="m.virtualize && read()"
        >
          @if (m.padTop > 0) {
            <div [style.flex-basis]="'100%'" [style.height.px]="m.padTop"></div>
          }
          @for (row of m.rows; track row.value) {
            <div [style]="m.virtualize ? windowedOptionStyle : optionStyle">
              <ng-container
                [adaptControl]="slots().Checkbox"
                [adaptControlProps]="row.props"
              />
            </div>
          }
          @if (m.padBottom > 0) {
            <div
              [style.flex-basis]="'100%'"
              [style.height.px]="m.padBottom"
            ></div>
          }
          @if (m.empty) {
            <span>{{ m.noValues }}</span>
          }
        </div>
      </div>
    }
  `,
})
export class AdaptChecklistChrome<TRow> {
  /** The definition. */
  readonly def = input.required<FilterDef<TRow>>();
  /** Reads the values and writes the selection. */
  readonly source =
    input.required<
      Pick<
        TableSource<TRow>,
        "allFilteredRows" | "extra" | "setExtra" | "setExtras" | "facets"
      >
    >();
  /** Label overrides. */
  readonly labels = input<TableLabels>();
  /** The kit's controls. */
  readonly slots = input.required<ChecklistSlots>();

  protected readonly listStyle = {
    "max-height": `${String(CHECKLIST_LIST_HEIGHT)}px`,
    overflow: "auto",
    display: "flex",
    "flex-wrap": "wrap",
    "align-items": "center",
    gap: `${String(CHECKLIST_OPTION_GAP)}px`,
  };
  protected readonly windowedListStyle = {
    ...this.listStyle,
    "max-height": null,
    height: `${String(CHECKLIST_LIST_HEIGHT)}px`,
    "align-items": "flex-start",
    "align-content": "flex-start",
  };
  protected readonly optionStyle = {
    flex: "0 0 auto",
    display: "inline-flex",
    "align-items": "center",
    "max-width": "100%",
  };
  protected readonly windowedOptionStyle = {
    ...this.optionStyle,
    flex: `0 0 ${String(CHECKLIST_ITEM_WIDTH)}px`,
    "min-width": "0",
  };

  private readonly list = viewChild<ElementRef<HTMLElement>>("list");
  private readonly query = signal("");
  private readonly viewport = signal({ scrollTop: 0, width: 0 });
  private readonly resolved = computed(() => resolveLabels(this.labels()));

  protected readonly model = computed(() => {
    const def = this.def();
    const source = this.source();
    const labels = this.resolved();
    const raw = source.extra[def.key];
    const facets = source.facets?.[def.key];
    const { available, items } = checklistItems(def, {
      facets: facets ? { [def.key]: facets } : undefined,
      allFilteredRows: source.allFilteredRows,
      extra: { [def.key]: raw },
    });
    if (!available) return undefined;
    const visible = searchChecklistItems(items, this.query());
    const virtualize = visible.length >= CHECKLIST_VIRTUALIZE_AT;
    const { scrollTop, width } = this.viewport();
    const window = checklistSlice(visible.length, virtualize, scrollTop, width);
    const selected = listFilterValues(raw);
    const actions = checklistActions(def, source, visible);
    const search: ChecklistSearchProps = {
      label: labels.checklistSearch,
      value: this.query(),
      onChange: (value) => {
        this.query.set(value);
      },
    };
    const selectAll: ChecklistButtonProps = {
      label: labels.selectAll,
      onClick: actions.selectAllVisible,
    };
    const clear: ChecklistButtonProps = {
      label: labels.checklistClear,
      onClick: actions.clear,
    };
    return {
      label: filterLabel(def),
      search,
      selectAll,
      clear,
      virtualize,
      padTop: window.padTop,
      padBottom: window.padBottom,
      empty: visible.length === 0,
      noValues: labels.checklistNoValues,
      rows: visible.slice(window.start, window.end).map((item) => ({
        value: item.value,
        props: {
          label: item.label,
          count: labels.groupCount(item.count),
          checked: selected.includes(item.value),
          onChange: (on: boolean) => {
            actions.toggle(item.value, on);
          },
        },
      })),
    };
  });

  constructor() {
    // A windowed list reads where it is scrolled and how wide it is.
    afterRenderEffect((onCleanup) => {
      const node = this.list()?.nativeElement;
      if (!node || !this.model()?.virtualize) return;
      this.read();
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => {
        this.read();
      });
      observer.observe(node);
      onCleanup(() => {
        observer.disconnect();
      });
    });
  }

  /** Read the list's scroll position and width. */
  protected read(): void {
    const next = nextChecklistViewport(
      this.viewport(),
      this.list()?.nativeElement
    );
    if (next !== this.viewport()) this.viewport.set(next);
  }
}
