/**
 * The nested AND/OR filter builder's Chrome: the structure — groups inside
 * groups, their conditions, the actions, the labels and the part names —
 * computed from core's filter-tree model. Every control is the kit's: the
 * kit hands its select, input, button and disclosure components in `slots`.
 */
import {
  defaultFilterRegistry,
  type FilterDef,
  filterTreeCombinatorOptions,
  filterTreeConditionModel,
  filterTreeEditorActions,
  type FilterTypeRegistry,
  isFilterGroup,
  type QueryCondition,
  type QueryFilterGroup,
  resolveLabels,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import type {
  FilterTreeButtonProps,
  FilterTreeDisclosureProps,
  FilterTreeInputProps,
  FilterTreeSelectProps,
} from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  type TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";

import { AdaptControl } from "../control";

/**
 * The kit's controls for the filter tree. Each is a standalone component
 * with one `props` input: `FilterTreeSelectProps`, `FilterTreeInputProps`,
 * `FilterTreeButtonProps`, and `FilterTreeDisclosureProps` whose `children`
 * is a template the disclosure renders when open.
 *
 * @public
 */
export interface FilterTreeSlots {
  /** A choice control. */
  readonly Select: Type<unknown>;
  /** A text, number or date field. */
  readonly Input: Type<unknown>;
  /** An action button. */
  readonly Button: Type<unknown>;
  /** The collapsible Advanced section. */
  readonly Disclosure: Type<unknown>;
}

/**
 * The disclosure's props in Angular: its content is a template.
 *
 * @public
 */
export type AngularFilterTreeDisclosureProps = FilterTreeDisclosureProps<
  TemplateRef<unknown>
>;

/** One control of a condition's value, tagged with the slot that draws it. */
type ValueControl =
  | { readonly slot: "Select"; readonly props: FilterTreeSelectProps }
  | { readonly slot: "Input"; readonly props: FilterTreeInputProps };

/** One condition row, ready to draw. */
interface ConditionView {
  readonly kind: "condition";
  readonly key: string;
  readonly field: FilterTreeSelectProps;
  readonly op: FilterTreeSelectProps | undefined;
  readonly values: readonly ValueControl[];
  readonly remove: FilterTreeButtonProps;
}

/** One AND/OR group, ready to draw. */
interface GroupView {
  readonly kind: "group";
  readonly key: string;
  readonly depth: number;
  readonly legend: string;
  readonly combinator: FilterTreeSelectProps;
  readonly remove: FilterTreeButtonProps | undefined;
  readonly children: readonly (GroupView | ConditionView)[];
  readonly addCondition: FilterTreeButtonProps;
  readonly addGroup: FilterTreeButtonProps;
}

/** What the whole builder draws. */
interface TreeView {
  readonly root: GroupView | undefined;
  readonly addCondition: FilterTreeButtonProps;
  readonly addGroup: FilterTreeButtonProps;
}

/** The value controls for one condition's editor. */
function valueControls(
  editor: NonNullable<ReturnType<typeof filterTreeConditionModel>>["value"],
  labels: Required<TableLabels>,
  onChange: (value: unknown) => void
): ValueControl[] {
  switch (editor.kind) {
    case "none":
      return [];
    case "boolean":
      return [
        {
          slot: "Select",
          props: {
            label: labels.value,
            value: editor.choice,
            part: "filter-select",
            options: editor.options,
            onChange: (next) => {
              onChange(editor.write(next));
            },
          },
        },
      ];
    case "relative": {
      const preset: ValueControl = {
        slot: "Select",
        props: {
          label: labels.opRelative,
          value: editor.preset,
          part: "filter-select",
          options: editor.options,
          onChange: (next) => {
            onChange(editor.writePreset(next));
          },
        },
      };
      if (!editor.counted) return [preset];
      return [
        preset,
        {
          slot: "Input",
          props: {
            label: "N",
            type: "number",
            value: String(editor.n),
            onChange: (next) => {
              onChange(editor.writeCount(next));
            },
          },
        },
      ];
    }
    case "between":
      return [
        {
          slot: "Input",
          props: {
            label: labels.from,
            type: editor.type,
            value: editor.a,
            onChange: (next) => {
              onChange(editor.writeA(next));
            },
          },
        },
        {
          slot: "Input",
          props: {
            label: labels.to,
            type: editor.type,
            value: editor.b,
            onChange: (next) => {
              onChange(editor.writeB(next));
            },
          },
        },
      ];
    case "single":
      return [
        {
          slot: "Input",
          props: {
            label: labels.value,
            type: editor.type,
            value: editor.text,
            onChange: (next) => {
              onChange(editor.write(next));
            },
          },
        },
      ];
  }
}

/** Everything a view builder needs. */
interface BuildContext<TRow> {
  readonly defs: readonly FilterDef<TRow>[];
  readonly labels: Required<TableLabels>;
  readonly registry: FilterTypeRegistry;
  readonly actions: ReturnType<typeof filterTreeEditorActions>;
}

function conditionView<TRow>(
  condition: QueryCondition,
  path: readonly number[],
  context: BuildContext<TRow>
): ConditionView | undefined {
  const { defs, labels, registry, actions } = context;
  const model = filterTreeConditionModel(condition, defs, registry, labels);
  if (!model) return undefined;
  return {
    kind: "condition",
    key: path.join("."),
    field: {
      label: labels.filterField,
      value: model.def.key,
      part: "filter-select",
      options: model.fieldOptions,
      onChange: (key) => {
        const next = model.withField(key);
        if (next) actions.replace(path, next);
      },
    },
    op:
      model.opOptions.length > 0
        ? {
            label: labels.operator,
            value: condition.op,
            part: "filter-operator",
            options: model.opOptions,
            onChange: (op) => {
              actions.replace(path, model.withOp(op));
            },
          }
        : undefined,
    values: valueControls(model.value, labels, (value) => {
      actions.replace(path, model.withValue(value));
    }),
    remove: {
      label: labels.filterRemoveCondition,
      part: "filter-tree-remove",
      onClick: () => {
        actions.remove(path);
      },
    },
  };
}

function groupView<TRow>(
  group: QueryFilterGroup,
  path: readonly number[],
  context: BuildContext<TRow>
): GroupView {
  const { labels, actions } = context;
  const children: (GroupView | ConditionView)[] = [];
  group.conditions.forEach((node, index) => {
    const childPath = [...path, index];
    if (isFilterGroup(node)) {
      children.push(groupView(node, childPath, context));
      return;
    }
    const view = conditionView(node, childPath, context);
    if (view) children.push(view);
  });
  return {
    kind: "group",
    key: path.join("."),
    depth: path.length,
    legend:
      group.combinator === "or"
        ? labels.filterCombinatorOr
        : labels.filterCombinatorAnd,
    combinator: {
      label: labels.filterTree,
      value: group.combinator,
      part: "filter-operator",
      options: filterTreeCombinatorOptions(labels),
      onChange: (next) => {
        actions.setCombinator(path, next);
      },
    },
    remove:
      path.length > 0
        ? {
            label: labels.filterRemoveGroup,
            part: "filter-tree-remove",
            onClick: () => {
              actions.remove(path);
            },
          }
        : undefined,
    children,
    addCondition: {
      label: labels.filterAddCondition,
      onClick: () => {
        actions.addCondition(path);
      },
    },
    addGroup: {
      label: labels.filterAddGroup,
      onClick: () => {
        actions.addGroup(path);
      },
    },
  };
}

/**
 * One AND/OR group and everything inside it, drawn recursively.
 *
 * @internal
 */
@Component({
  selector: "adapt-filter-tree-group",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let g = group();
    @let s = slots();
    <fieldset
      data-adapttable-part="filter-tree-group"
      [attr.data-depth]="g.depth"
      [style]="g.depth > 0 ? nestedStyle : rootStyle"
    >
      <legend [style]="hiddenStyle">{{ g.legend }}</legend>
      <div [style]="rowStyle">
        <ng-container
          [adaptControl]="s.Select"
          [adaptControlProps]="g.combinator"
        />
        @if (g.remove; as remove) {
          <ng-container
            [adaptControl]="s.Button"
            [adaptControlProps]="remove"
          />
        }
      </div>
      @for (child of g.children; track child.key) {
        @if (child.kind === "group") {
          <adapt-filter-tree-group [group]="child" [slots]="s" />
        } @else {
          <div data-adapttable-part="filter-tree-condition" [style]="rowStyle">
            <ng-container
              [adaptControl]="s.Select"
              [adaptControlProps]="child.field"
            />
            @if (child.op; as op) {
              <ng-container
                [adaptControl]="s.Select"
                [adaptControlProps]="op"
              />
            }
            @for (value of child.values; track $index) {
              <ng-container
                [adaptControl]="s[value.slot]"
                [adaptControlProps]="value.props"
              />
            }
            <ng-container
              [adaptControl]="s.Button"
              [adaptControlProps]="child.remove"
            />
          </div>
        }
      }
      <div data-adapttable-part="filter-tree-actions" [style]="rowStyle">
        <ng-container
          [adaptControl]="s.Button"
          [adaptControlProps]="g.addCondition"
        />
        <ng-container
          [adaptControl]="s.Button"
          [adaptControlProps]="g.addGroup"
        />
      </div>
    </fieldset>
  `,
})
export class AdaptFilterTreeGroup {
  /** The group. */
  readonly group = input.required<GroupView>();
  /** The kit's controls. */
  readonly slots = input.required<FilterTreeSlots>();

  protected readonly rowStyle = {
    display: "flex",
    "flex-wrap": "wrap",
    "align-items": "flex-end",
    gap: "8px",
    "min-width": "0",
  };
  protected readonly rootStyle = {
    display: "flex",
    "flex-direction": "column",
    gap: "8px",
    "min-width": "0",
    position: "relative",
    margin: "0",
    padding: "0",
    border: "none",
    "min-inline-size": "0",
  };
  protected readonly nestedStyle = {
    display: "flex",
    "flex-direction": "column",
    gap: "8px",
    "min-width": "0",
    position: "relative",
    "margin-block-start": "4px",
    "margin-inline-start": "16px",
    "margin-inline-end": "0",
    "padding-block": "8px",
    "padding-inline-start": "12px",
    border: "none",
    "border-inline-start":
      "2px solid color-mix(in srgb, currentColor 22%, transparent)",
    "background-color": "color-mix(in srgb, currentColor 5%, transparent)",
    "min-inline-size": "0",
  };
  protected readonly hiddenStyle = {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    padding: "0",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    "white-space": "nowrap",
    border: "0",
  };
}

/**
 * The builder's view: what {@link AdaptFilterTreeChrome} draws.
 *
 * @internal
 */
@Component({
  selector: "adapt-filter-tree-view",
  imports: [AdaptControl, AdaptFilterTreeGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #content>
      @let v = view();
      @if (v.root; as root) {
        <adapt-filter-tree-group [group]="root" [slots]="slots()" />
      } @else {
        <div
          data-adapttable-part="filter-tree-actions"
          style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; min-width: 0"
        >
          <ng-container
            [adaptControl]="slots().Button"
            [adaptControlProps]="v.addCondition"
          />
          <ng-container
            [adaptControl]="slots().Button"
            [adaptControlProps]="v.addGroup"
          />
        </div>
      }
    </ng-template>
    @if (disclosure(); as props) {
      <ng-container
        [adaptControl]="slots().Disclosure"
        [adaptControlProps]="props"
      />
    }
  `,
})
export class AdaptFilterTreeView<TRow> {
  /** The definitions the builder offers. */
  readonly defs = input.required<readonly FilterDef<TRow>[]>();
  /** Reads and writes the filter tree. */
  readonly source =
    input.required<Pick<TableSource<TRow>, "filterTree" | "setFilterTree">>();
  /** Label overrides. */
  readonly labels = input<TableLabels>();
  /** Custom filter types, beyond the built-ins. */
  readonly registry = input<FilterTypeRegistry>(defaultFilterRegistry);
  /** Open the Advanced section on first paint. */
  readonly defaultExpanded = input(false);
  /** The kit's controls. */
  readonly slots = input.required<FilterTreeSlots>();

  private readonly content =
    viewChild.required<TemplateRef<unknown>>("content");
  private readonly toggled = signal<boolean | undefined>(undefined);
  private readonly resolved = computed(() => resolveLabels(this.labels()));

  protected readonly view = computed((): TreeView => {
    const defs = this.defs();
    const { filterTree: tree, setFilterTree: commit } = this.source();
    const labels = this.resolved();
    const registry = this.registry();
    const first = defs[0];
    const actions =
      commit && first
        ? filterTreeEditorActions(tree, commit, first, registry)
        : undefined;
    return {
      root:
        tree && actions
          ? groupView(tree, [], { defs, labels, registry, actions })
          : undefined,
      addCondition: {
        label: labels.filterAddCondition,
        onClick: () => {
          actions?.addCondition([]);
        },
      },
      addGroup: {
        label: labels.filterAddGroup,
        onClick: () => {
          actions?.addGroup([]);
        },
      },
    };
  });

  protected readonly disclosure = computed(
    (): AngularFilterTreeDisclosureProps | undefined => {
      const source = this.source();
      if (!source.setFilterTree || this.defs().length === 0) return undefined;
      const expanded =
        this.toggled() ??
        (this.defaultExpanded() || source.filterTree !== undefined);
      return {
        label: this.resolved().filterTree,
        expanded,
        children: this.content(),
        onExpandedChange: (next) => {
          this.toggled.set(next);
        },
      };
    }
  );
}

/**
 * The nested AND/OR filter builder: the structure is here, every control is
 * the kit's. Renders nothing without definitions or a filter tree to write.
 *
 * @public
 */
@Component({
  selector: "adapt-filter-tree-chrome",
  imports: [AdaptFilterTreeView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <adapt-filter-tree-view
      [defs]="defs()"
      [source]="source()"
      [labels]="labels()"
      [registry]="registry()"
      [defaultExpanded]="defaultExpanded()"
      [slots]="slots()"
    />
  `,
})
export class AdaptFilterTreeChrome<TRow> {
  /** The definitions the builder offers. */
  readonly defs = input.required<readonly FilterDef<TRow>[]>();
  /** Reads and writes the filter tree. */
  readonly source =
    input.required<Pick<TableSource<TRow>, "filterTree" | "setFilterTree">>();
  /** Label overrides. */
  readonly labels = input<TableLabels>();
  /** Custom filter types, beyond the built-ins. */
  readonly registry = input<FilterTypeRegistry>(defaultFilterRegistry);
  /** Open the Advanced section on first paint. */
  readonly defaultExpanded = input(false);
  /** The kit's controls. */
  readonly slots = input.required<FilterTreeSlots>();
}
