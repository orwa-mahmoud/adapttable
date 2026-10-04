/** Vue rendering metadata over the framework-neutral column model. */
import type {
  ColumnGroupDef,
  ColumnGroupRecord,
  ColumnInput as CoreColumnInput,
  ColumnMetadata,
  SortDirection,
} from "@adapttable/core";
import {
  columnPathText,
  flattenColumnTree,
  resolveColumnDefaults,
} from "@adapttable/core/binding";
import {
  type Component,
  type FunctionalComponent,
  h,
  type VNodeChild,
} from "vue";

/** A value-aware cell renderer's input. */
export interface CellContext<TRow, TValue = unknown> {
  readonly row: TRow;
  readonly rowIndex: number;
  readonly column: ColumnDef<TRow, TValue>;
  readonly value: TValue;
}
/** Header caption and current sort controller. */
export interface HeaderContext<TRow, TValue = unknown> {
  readonly column: ColumnDef<TRow, TValue>;
  readonly label: string;
  readonly sortDir: SortDirection | undefined;
  readonly sortIndex: number | undefined;
  readonly toggleSort: (event?: { readonly shiftKey?: boolean }) => void;
}
/** The aggregate value supplied to a footer renderer. */
export interface FooterContext<TRow, TValue = unknown> {
  readonly column: ColumnDef<TRow, TValue>;
  readonly value: TValue | undefined;
}
/** Functions are renderers, never getter-normalized component declarations. */
export type RenderFunction<TContext> = {
  render(context: TContext): VNodeChild;
}["render"];
/** Explicit component descriptor; use componentRenderer to check mapped props. */
export interface ComponentRenderer<TContext> {
  readonly component: Component;
  readonly props: { map(context: TContext): object }["map"];
}
export type Renderer<TContext> =
  RenderFunction<TContext> | ComponentRenderer<TContext>;
/** Public props inferred from an SFC, defineComponent, or functional component. */
export type ComponentProps<TComponent> = TComponent extends new (
  ...args: never[]
) => { $props: infer TProps }
  ? TProps
  : TComponent extends FunctionalComponent<infer TProps>
    ? TProps
    : never;
/** Create an explicit renderer while checking its component's required props. */
export function componentRenderer<TContext, TComponent extends Component>(
  component: TComponent,
  props: (context: TContext) => ComponentProps<TComponent> & object
): ComponentRenderer<TContext> {
  return { component, props };
}
/** The text caption stays separate from rendered header content. */
export interface ColumnDef<TRow, TValue = unknown> extends Omit<
  ColumnMetadata<TRow>,
  "accessor" | "header"
> {
  readonly header?: string;
  readonly accessor?: (row: TRow) => TValue;
  readonly cell?: Renderer<CellContext<TRow, TValue>>;
  readonly headerCell?: Renderer<HeaderContext<TRow, TValue>>;
  readonly footer?: Renderer<FooterContext<TRow, TValue>>;
}
export interface ColumnGroup<TRow> extends Omit<
  ColumnGroupDef<TRow>,
  "children"
> {
  readonly children: readonly ColumnInput<TRow>[];
}
export type ColumnInput<TRow> = ColumnDef<TRow> | ColumnGroup<TRow>;
export function primitiveText(value: unknown): string | null {
  return columnPathText(value);
}
export function renderContent<TContext>(
  renderer: Renderer<TContext>,
  context: TContext
): VNodeChild {
  return typeof renderer === "function"
    ? renderer(context)
    : h(renderer.component, renderer.props(context));
}
export function renderCell<TRow, TValue>(
  context: CellContext<TRow, TValue>,
  slot?: RenderFunction<CellContext<TRow, TValue>>
): VNodeChild {
  let content: VNodeChild;
  if (context.column.cell)
    content = renderContent(context.column.cell, context);
  else if (slot) content = slot(context);
  else
    content =
      context.column.formatValue?.(context.row) ?? primitiveText(context.value);
  return content;
}
export function renderHeader<TRow, TValue>(
  context: HeaderContext<TRow, TValue>,
  slot?: RenderFunction<HeaderContext<TRow, TValue>>
): VNodeChild {
  let content: VNodeChild;
  if (context.column.headerCell)
    content = renderContent(context.column.headerCell, context);
  else if (slot) content = slot(context);
  else content = context.label;
  return content;
}
export function renderFooter<TRow, TValue>(
  context: FooterContext<TRow, TValue>,
  slot?: RenderFunction<FooterContext<TRow, TValue>>
): VNodeChild {
  let content: VNodeChild;
  if (context.column.footer)
    content = renderContent(context.column.footer, context);
  else if (slot) content = slot(context);
  else content = primitiveText(context.value);
  return content;
}
export function resolveColumns<TRow>(
  columns: readonly ColumnDef<TRow>[],
  locale?: string
): ColumnDef<TRow>[] {
  return resolveColumnDefaults<TRow, ColumnDef<TRow>>(columns, locale);
}
export function flattenColumns<TRow>(columns: readonly ColumnInput<TRow>[]): {
  readonly leaves: readonly ColumnDef<TRow>[];
  readonly groups: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
} {
  const leaves: ColumnDef<TRow>[] = [];
  const place = (input: ColumnInput<TRow>): CoreColumnInput<TRow> => {
    if ("children" in input)
      return { ...input, children: input.children.map(place) };
    leaves.push(input);
    return { key: input.key, group: input.group };
  };
  const flat = flattenColumnTree<TRow>(columns.map(place));
  return {
    leaves: leaves.map((leaf, index) => ({
      ...leaf,
      group: flat.leaves[index]?.group ?? leaf.group,
    })),
    groups: flat.groups,
  };
}
