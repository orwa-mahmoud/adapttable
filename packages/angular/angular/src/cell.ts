/**
 * Cell and header content: a column's template or component when it has
 * one, its text otherwise. Structure only — the element the content lands in
 * is the host's own `<td>` or `<th>`.
 */
import { cellValue } from "@adapttable/core";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  inject,
  input,
  reflectComponentType,
  TemplateRef,
  type Type,
} from "@angular/core";

import {
  type CellContext,
  type ColumnDef,
  type FooterContext,
  type HeaderContext,
  primitiveText,
  type Renderer,
} from "./columnDef";

/**
 * A cell template declared in a component's own template:
 * `<ng-template adaptCellTemplate="status" let-row>…</ng-template>`. Collect
 * them with `viewChildren(AdaptCellTemplate)` and pass them to
 * `injectDataTable` as `cellTemplates`.
 *
 * @public
 */
@Directive({ selector: "ng-template[adaptCellTemplate]" })
export class AdaptCellTemplate {
  /** The key of the column this template renders. */
  readonly key = input.required<string>({ alias: "adaptCellTemplate" });
  /** The template. */
  readonly template = inject<TemplateRef<CellContext<unknown>>>(TemplateRef);

  /** Type the template's `let-` variables. */
  static ngTemplateContextGuard(
    _directive: AdaptCellTemplate,
    _context: unknown
  ): _context is CellContext<unknown> {
    return true;
  }
}

/**
 * A column renderer split by kind: the template to stamp, or the component
 * to create with the inputs it declares.
 *
 * @public
 */
export interface ResolvedRenderer<TContext> {
  /** The template, when the renderer is one. */
  readonly template: TemplateRef<TContext> | null;
  /** The component, when the renderer is one. */
  readonly component: Type<unknown> | null;
  /** The context fields the component declares as inputs. */
  readonly inputs: Record<string, unknown>;
}

/**
 * Split a renderer into the template to stamp or the component to create,
 * with only the context fields the component declares as inputs.
 *
 * @public
 */
export function resolveRenderer<TContext extends object>(
  renderer: Renderer<TContext> | undefined,
  context: TContext
): ResolvedRenderer<TContext> | null {
  if (!renderer) return null;
  if (renderer instanceof TemplateRef) {
    return { template: renderer, component: null, inputs: {} };
  }
  // A component is handed only the inputs it declares.
  const declared = new Set(
    (reflectComponentType(renderer)?.inputs ?? []).map(
      (entry) => entry.templateName
    )
  );
  const inputs: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(context)) {
    if (declared.has(name)) inputs[name] = value;
  }
  return { template: null, component: renderer, inputs };
}

/**
 * Renders a body cell's content into the element it sits on:
 * `<td [adaptCell]="column" [adaptCellRow]="row" [adaptCellIndex]="i">`.
 *
 * @public
 */
@Component({
  selector: "[adaptCell]",
  imports: [NgTemplateOutlet, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let content = renderer();
    @if (content?.template; as template) {
      <ng-container
        [ngTemplateOutlet]="template"
        [ngTemplateOutletContext]="context()"
      />
    } @else if (content?.component; as component) {
      <ng-container
        [ngComponentOutlet]="component"
        [ngComponentOutletInputs]="content?.inputs"
      />
    } @else {
      {{ text() }}
    }`,
})
export class AdaptCell<TRow> {
  /** The column. */
  readonly column = input.required<ColumnDef<TRow>>({ alias: "adaptCell" });
  /** The row. */
  readonly row = input.required<TRow>({ alias: "adaptCellRow" });
  /** The row's position in the rendered window. */
  readonly adaptCellIndex = input(0);
  /** The row position signal, also exposed under its established TypeScript name. */
  readonly rowIndex = this.adaptCellIndex;

  /** What the renderer receives. */
  protected readonly context = computed<CellContext<TRow>>(() => {
    const row = this.row();
    const column = this.column();
    return {
      $implicit: row,
      row,
      rowIndex: this.rowIndex(),
      column,
      // Without an accessor a column reads as core reads it: its plain text,
      // then its export or sort value, then its key's path.
      value: column.accessor ? column.accessor(row) : cellValue(row, column),
    };
  });

  /** The column's cell renderer, resolved. */
  protected readonly renderer = computed(() =>
    resolveRenderer(this.column().cell, this.context())
  );

  /** The cell's text when the column has no renderer. */
  protected readonly text = computed(() => {
    return primitiveText(this.context().value) ?? "";
  });
}

/**
 * Renders a header cell's content into the element it sits on:
 * `<th [adaptHeader]="column">`. The column's `headerCell` when it has one,
 * its `header` text otherwise.
 *
 * @public
 */
@Component({
  selector: "[adaptHeader]",
  imports: [NgTemplateOutlet, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let content = renderer();
    @if (content?.template; as template) {
      <ng-container
        [ngTemplateOutlet]="template"
        [ngTemplateOutletContext]="context()"
      />
    } @else if (content?.component; as component) {
      <ng-container
        [ngComponentOutlet]="component"
        [ngComponentOutletInputs]="content?.inputs"
      />
    } @else {
      {{ column().header ?? "" }}
    }`,
})
export class AdaptHeader<TRow> {
  /** The column. */
  readonly column = input.required<ColumnDef<TRow>>({ alias: "adaptHeader" });

  /** What the renderer receives. */
  protected readonly context = computed<HeaderContext<TRow>>(() => ({
    $implicit: this.column(),
    column: this.column(),
  }));

  /** The column's header renderer, resolved. */
  protected readonly renderer = computed(() =>
    resolveRenderer(this.column().headerCell, this.context())
  );
}

/**
 * Renders a column's extra header content into its host element:
 * `<span [adaptHeaderActions]="column">`. Kits place this after the header
 * caption, outside the sort button, so host-provided controls stay independent.
 *
 * @public
 */
@Component({
  selector: "[adaptHeaderActions]",
  imports: [NgTemplateOutlet, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let content = renderer();
    @if (content?.template; as template) {
      <ng-container
        [ngTemplateOutlet]="template"
        [ngTemplateOutletContext]="context()"
      />
    } @else if (content?.component; as component) {
      <ng-container
        [ngComponentOutlet]="component"
        [ngComponentOutletInputs]="content?.inputs"
      />
    } @else {
      {{ text() }}
    }`,
})
export class AdaptHeaderActions<TRow> {
  /** The column. */
  readonly column = input.required<ColumnDef<TRow>>({
    alias: "adaptHeaderActions",
  });

  /** What the renderer receives. */
  protected readonly context = computed<HeaderContext<TRow>>(() => ({
    $implicit: this.column(),
    column: this.column(),
  }));

  /** The column's extra header renderer, resolved. */
  protected readonly renderer = computed(() => {
    const actions = this.column().headerActions;
    return resolveRenderer(
      typeof actions === "string" ? undefined : actions,
      this.context()
    );
  });

  /** Plain text remains supported without being interpreted as markup. */
  protected readonly text = computed(() => {
    const actions = this.column().headerActions;
    return typeof actions === "string" ? actions : "";
  });
}

/**
 * Renders a footer cell's content into the element it sits on:
 * `<td [adaptFooter]="column" [adaptFooterValue]="summary[column.key]">`.
 * The column's `footer` when it has one, the summary value otherwise.
 *
 * @public
 */
@Component({
  selector: "[adaptFooter]",
  imports: [NgTemplateOutlet, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let content = renderer();
    @if (content?.template; as template) {
      <ng-container
        [ngTemplateOutlet]="template"
        [ngTemplateOutletContext]="context()"
      />
    } @else if (content?.component; as component) {
      <ng-container
        [ngComponentOutlet]="component"
        [ngComponentOutletInputs]="content?.inputs"
      />
    } @else {
      {{ text() }}
    }`,
})
export class AdaptFooter<TRow> {
  /** The column. */
  readonly column = input.required<ColumnDef<TRow>>({ alias: "adaptFooter" });
  /** The summary row's value for the column. */
  readonly value = input<unknown>(undefined, { alias: "adaptFooterValue" });

  /** What the renderer receives. */
  protected readonly context = computed<FooterContext<TRow>>(() => ({
    $implicit: this.column(),
    column: this.column(),
    value: this.value(),
  }));

  /** The column's footer renderer, resolved. */
  protected readonly renderer = computed(() =>
    resolveRenderer(this.column().footer, this.context())
  );

  /** The value as text when the column has no footer renderer. */
  protected readonly text = computed(() => primitiveText(this.value()) ?? "");
}
