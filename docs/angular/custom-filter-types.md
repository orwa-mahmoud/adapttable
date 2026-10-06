# Custom filter types in Angular

`filterTypes(specs)` registers a type's predicate, operators, state keys,
chip labels and filter-tree projection. Use `widget` to choose the Angular
kit control that edits its values, or return an Angular template or component
from `render` to supply the field. This keeps the same custom semantics in
the frontend predicate, header filters and Advanced builder.

Here is a case-insensitive choice filter with native Angular renderers.
The definition supplies an explicit `getValue`. A host checkbox switches
between a template and a component in both the filter form and the compact
header-filter row:

```ts
import {
  Component,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import type {
  ColumnDef,
  FilterDef,
  FilterFormSource,
  FilterTypeSpec,
  TableLabels,
} from "@adapttable/angular";
import type { FilterWidgetRenderProps } from "@adapttable/angular/adapter";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { filters, filterTypes } from "@adapttable/angular-unstyled/filters";
import { headerFilters } from "@adapttable/angular-unstyled/header-filters";

const caseInsensitiveChoice: FilterTypeSpec = {
  type: "caseInsensitiveChoice",
  widget: "select",
  ops: ["eq"],
  defaultOp: "eq",
  stateKeys: (def) => [def.key],
  match: (def, extra, row) => {
    const selected = extra[def.key];
    if (selected == null || selected === "") return true;
    return (
      String(def.getValue?.(row) ?? "").toLowerCase() ===
      String(selected).toLowerCase()
    );
  },
  chips: (def) => ({
    [def.key]: (value) => `${def.label ?? def.key}: ${value}`,
  }),
  conditionToExtra: (def, condition) => ({
    [def.key]: condition.value == null ? undefined : String(condition.value),
  }),
};

interface Person {
  id: string;
  team: string;
}

@Component({
  selector: "app-team-filter",
  template: `
    <label>
      {{ def().label ?? def().key }}
      <select
        [class]="className()"
        [value]="source().extra[def().key] ?? ''"
        (change)="
          source().setExtra(def().key, $any($event.target).value || undefined)
        "
      >
        <option value="">{{ labels().filterAll }}</option>
        <option value="core">Core</option>
        <option value="platform">Platform</option>
      </select>
    </label>
  `,
})
export class TeamFilter {
  readonly def = input.required<FilterDef>();
  readonly source = input.required<FilterFormSource<unknown>>();
  readonly labels = input.required<Required<TableLabels>>();
  readonly className = input<string>();
}

@Component({
  selector: "app-custom-filter",
  imports: [AdaptDataTable],
  template: `
    <label>
      <input
        type="checkbox"
        [checked]="renderAsComponent()"
        (change)="renderAsComponent.set($any($event.target).checked)"
      />
      Use the component renderer
    </label>
    <ng-template
      #teamFilter
      let-props
      let-source="source"
      let-labels="labels"
      let-className="className"
    >
      <label>
        {{ props.def.label ?? props.def.key }}
        <select
          [class]="className"
          [value]="source.extra[props.def.key] ?? ''"
          (change)="
            source.setExtra(
              props.def.key,
              $any($event.target).value || undefined
            )
          "
        >
          <option value="">{{ labels.filterAll }}</option>
          <option value="core">Core</option>
          <option value="platform">Platform</option>
        </select>
      </label>
    </ng-template>
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      urlKey="teams"
    />
  `,
})
export class CustomFilter {
  readonly renderAsComponent = signal(false);
  readonly teamFilter =
    viewChild<TemplateRef<FilterWidgetRenderProps<Person>>>("teamFilter");
  readonly rows: Person[] = [
    { id: "a", team: "CORE" },
    { id: "b", team: "Platform" },
  ];
  readonly columns: ColumnDef<Person>[] = [{ key: "team", header: "Team" }];
  readonly defs: FilterDef<Person>[] = [
    {
      key: "team",
      type: "caseInsensitiveChoice",
      label: "Team",
      getValue: (row) => row.team,
      options: [
        { value: "core", label: "Core" },
        { value: "platform", label: "Platform" },
      ],
    },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [
    filterTypes([
      {
        ...caseInsensitiveChoice,
        render: () =>
          this.renderAsComponent() ? TeamFilter : (this.teamFilter() ?? null),
      },
    ]),
    filters(this.defs),
    headerFilters(),
  ];
}
```

Both factories also exist at `@adapttable/ng-zorro/filters`; use its root
`AdaptDataTable` together with them and its `/header-filters` feature.
The custom controls above belong to the native kit; an NG-ZORRO custom
renderer should use NG-ZORRO controls. Both kits currently require
workspace setup, as described in [getting started](./getting-started.md).

The template query is read inside `render`, after the feature is created.
While it is unavailable, the callback returns `null`, a valid empty display
value that falls back to the registered `select` widget. For only the built-in
kit control, register `filterTypes([caseInsensitiveChoice])` without a `render`
callback.

## Keep the whole contract consistent

- `type` must match the definition's type name; `widget` must name a built-in
  widget kind
- `stateKeys` lists every key the type owns, including operator or range
  keys, so clearing and persistence address the right values
- `match` should pass an inactive filter and evaluate active values
- `chips` describes the active state; `conditionToExtra` maps an Advanced
  condition into the same state `match` evaluates
- `urlArray` and `urlNumberKeys` opt into the registry's list/range-number
  parsing conventions; they do not introduce an arbitrary serialization format

Register types before the table mounts. The feature host also exposes
`registerFilterType` and `extendFilterType` for plugins; registrations follow
the feature lifecycle. A custom server must implement these semantics itself:
JavaScript predicates are not sent to an endpoint or stored in a URL.

## Component renderers and live props

`FilterWidgetRenderProps` and `renderRegisteredFilter` are public exports
from `@adapttable/angular`. The helper calls the registered renderer with
`{ def, source, labels, className }`. `source` is a `FilterFormSource`: read
current values from `source.extra` and write through `source.setExtra`.
The labels are fully resolved. The automatic form passes `className` as
`undefined`; the compact header control passes its input class hook.

Templates receive all four named fields and the entire props object as
`$implicit`, which is the example's `let-props`. A component receives only
the matching inputs it declares. The example's `TeamFilter` declares all
four as signal inputs. To always use it, replace the callback with
`render: () => TeamFilter`. Return the component class (`Type<unknown>`),
not a component instance or a factory that creates one. A renderer uses
filter props, not a column's `CellContext`.

The native and NG-ZORRO `AdaptAutoFilterForm` components and their
`AdaptFilterHeaderRow` / `AdaptFilterHeaderControl` surfaces use this same
order:

1. A `TemplateRef` is stamped with the live filter context
2. An Angular component type is mounted with its declared matching inputs
3. A truthy string or number is displayed as text
4. Anything else falls back to the registered built-in `widget`

For example, `"Choose a team"` and `3` display text; `undefined`, `null`,
`false`, `true`, `""`, `0`, plain objects and non-component functions use
the kit widget. Return `"0"` if zero should be visible text. This callback
does not accept React elements or JSX. A custom renderer takes the place
of the whole form field, so it supplies its own visible label, accessible
name, focus behavior and kit controls. Use logical spacing for RTL, and
make the control usable in the mobile filter panel as well as a compact
desktop header.

Source, definition, label and class changes update the mounted template or
component inputs. Keeping the same component type preserves its instance;
changing the type, closing the form or destroying its host tears it down
with normal Angular lifecycle handling. Rendering does not change the
predicate, chips, URL keys or Advanced tree projection: keep those in the
registered spec. See the [adapter slot contract](./building-an-adapter.md)
for building a complete custom form.

See [filtering](./filtering.md), [filter trees](./filter-tree.md) and
[URL state](./url-state.md).

## Updating predicate meaning

Replacing declarative filter definitions or registry extensions refreshes the
matching rows even when the data array and active filter value stay the same.
The table controller supplies the semantic key used by the neutral frontend
source, so unrelated feature changes and row updates do not force a predicate
reset.

For a custom `injectFrontendData` predicate whose meaning changes without new
rows or query state, update its `filterKey` value or signal. Changing a callback
reference alone keeps the existing no-restaging behavior; an explicit key
makes the intended invalidation clear.
