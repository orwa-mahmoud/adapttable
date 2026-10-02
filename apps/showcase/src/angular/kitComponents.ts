/**
 * Thin host-only seams: mount the selected kit's real components while sharing
 * the demos' rows, host callbacks and templates. No control or feature slot is
 * supplied here; the bootstrap-selected kit owns all rendered table UI.
 */
import type {
  AdaptTableFeature,
  ColumnInput,
  ColumnLayoutState,
  Direction,
  EditConflictPolicy,
  ExtraFilters,
  PaginationMode,
  SummaryRowFn,
  TableAssistantProps,
  TableDensity,
  TableLabels,
  TableQueryParams,
  TableSource,
} from "@adapttable/angular";
import type { PivotConfig, PivotField } from "@adapttable/angular/pivot";
import { NgComponentOutlet } from "@angular/common";
import {
  Component,
  computed,
  inject,
  input,
  inputBinding,
  type OnInit,
  output,
  outputBinding,
  type Signal,
  ViewChild,
  ViewContainerRef,
} from "@angular/core";

import { SHOWCASE_KIT } from "./showcaseKit";

/** The demo's table inputs, forwarded reactively to its actual kit table. */
@Component({
  selector: "adapt-showcase-table",
  template: `<ng-container #mount />`,
  host: { style: "display: contents" },
})
export class AdaptShowcaseTable<TRow> implements OnInit {
  private readonly kit = inject(SHOWCASE_KIT);
  @ViewChild("mount", { read: ViewContainerRef, static: true })
  private mount?: ViewContainerRef;

  readonly data = input<readonly TRow[]>();
  readonly source = input<Signal<TableSource<TRow>> | TableSource<TRow>>();
  readonly columns = input.required<readonly ColumnInput<TRow>[]>();
  readonly rowKey = input.required<(row: TRow) => string>();
  readonly tableLabel = input<string>();
  readonly dir = input<Direction>("ltr");
  readonly labels = input<TableLabels>();
  readonly urlSync = input(true);
  readonly urlKey = input<string>();
  readonly defaults = input<
    Partial<TableQueryParams> & { extra?: ExtraFilters }
  >();
  readonly paginationMode = input<PaginationMode>();
  readonly maxHeight = input<number | string>();
  readonly filtersMode = input<"popover" | "drawer">("popover");
  readonly forceMobile = input<boolean>();
  readonly selectable = input(false);
  readonly searchable = input(true);
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly onRowClick = input<(row: TRow) => void>();
  readonly density = input<TableDensity>();
  readonly summaryRow = input<SummaryRowFn<TRow>>();
  readonly editConflictPolicy = input<EditConflictPolicy>();
  readonly columnLayout = input<ColumnLayoutState>();
  readonly columnLayoutChange = output<ColumnLayoutState>();

  /** Bind before the first render, including initial column-layout emissions. */
  ngOnInit(): void {
    if (!this.mount) throw new Error("The showcase table has no mount point");
    this.mount.createComponent(this.kit.table, {
      bindings: [
        inputBinding("data", this.data),
        inputBinding("source", this.source),
        inputBinding("columns", this.columns),
        inputBinding("rowKey", this.rowKey),
        inputBinding("tableLabel", this.tableLabel),
        inputBinding("dir", this.dir),
        inputBinding("labels", this.labels),
        inputBinding("urlSync", this.urlSync),
        inputBinding("urlKey", this.urlKey),
        inputBinding("defaults", this.defaults),
        inputBinding("paginationMode", this.paginationMode),
        inputBinding("maxHeight", this.maxHeight),
        inputBinding("filtersMode", this.filtersMode),
        inputBinding("forceMobile", this.forceMobile),
        inputBinding("selectable", this.selectable),
        inputBinding("searchable", this.searchable),
        inputBinding("features", this.features),
        inputBinding("onRowClick", this.onRowClick),
        inputBinding("density", this.density),
        inputBinding("summaryRow", this.summaryRow),
        inputBinding("editConflictPolicy", this.editConflictPolicy),
        inputBinding("columnLayout", this.columnLayout),
        outputBinding<ColumnLayoutState>("columnLayoutChange", (layout) =>
          this.columnLayoutChange.emit(layout)
        ),
      ],
    });
  }
}

/** The selected kit's pivot panel, including that kit's own field controls. */
@Component({
  selector: "adapt-showcase-pivot-panel",
  imports: [NgComponentOutlet],
  template: `<ng-container
    [ngComponentOutlet]="kit.pivotPanel"
    [ngComponentOutletInputs]="panelInputs()"
  />`,
  host: { style: "display: contents" },
})
export class AdaptShowcasePivotPanel {
  protected readonly kit = inject(SHOWCASE_KIT);
  readonly fields = input.required<readonly PivotField[]>();
  readonly config = input.required<PivotConfig>();
  readonly onChange = input.required<(next: PivotConfig) => void>();
  readonly labels = input<TableLabels>();
  protected readonly panelInputs = computed(() => ({
    fields: this.fields(),
    config: this.config(),
    onChange: this.onChange(),
    labels: this.labels(),
  }));
}

/** The selected kit's complete assistant, including its approval surfaces. */
@Component({
  selector: "adapt-showcase-assistant",
  imports: [NgComponentOutlet],
  template: `<ng-container
    [ngComponentOutlet]="kit.assistant"
    [ngComponentOutletInputs]="assistantInputs()"
  />`,
  host: { style: "display: contents" },
})
export class AdaptShowcaseAssistant {
  protected readonly kit = inject(SHOWCASE_KIT);
  readonly props = input.required<TableAssistantProps>();
  protected readonly assistantInputs = computed(() => ({
    props: this.props(),
  }));
}
