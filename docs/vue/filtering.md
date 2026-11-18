# Vue table filtering

Compose popover and drawer filters, checklist choices and AND/OR trees with native Vue kit controls.

These examples use `@adapttable/vue-unstyled`. Import matching feature paths
from your selected adapter so its own kit renders the controls. See
[Vue installation and providers](./getting-started.md).

```ts
import { filters } from "@adapttable/vue-unstyled/filters";
import { headerFilters } from "@adapttable/vue-unstyled/header-filters";

interface Person {
  id: string;
  name: string;
  score: number;
}
const features = [
  filters<Person>(
    [
      { key: "name", type: "text", label: "Name" },
      { key: "score", type: "numberRange", label: "Score" },
    ],
    { mode: "popover", tree: true }
  ),
  headerFilters(),
];
// Pass these features with the Person columns and rows from getting started.
```

`filters<TRow>(defs?: readonly FilterDef<TRow>[], options?: FiltersOptions)`
returns a row-typed feature. `FiltersOptions` accepts `mode: "popover" | "drawer"`,
`tree: boolean` and `fields: boolean`. `fields: false` leaves only the AND/OR
tree in the panel, opened on first paint. The popover is anchored with no backdrop; the drawer uses
a native modal dialog. Escape closes an open surface and returns focus to its
trigger. Header filters are desktop-only; the toolbar filters remain available
on mobile cards.

`filterTypes(specs: readonly FilterTypeSpec[])` extends the filter registry.
Custom filter types still need a supported widget kind or an adapter field
renderer. Registering filter semantics does not create a new control.
`headerFilters()` derives controls from the resolved filter definitions and
uses the same source `extra`/filter-tree state as the toolbar.

The fallback frontend source evaluates the composed filter engine. A supplied
source owns its filtering: server/query sources receive query changes through
their normal contracts, and a separately created frontend source needs its own
filter evaluation configured. Attaching controls does not replace an external
source's filtering implementation.

Filter state composables (`useTextFilterWidget`, `useRangeFilterWidget`,
`useBooleanFilterWidget`, `useFilterOptions`, `useChecklistFilter` and
`useFilterTree`) belong to `@adapttable/vue`. Adapter presentation models,
Chrome and required control slots belong to `@adapttable/vue/adapter`:

| API                                                                                                            | Contract                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useTextFilterWidget(def, source)`, `useRangeFilterWidget(def, source)`, `useBooleanFilterWidget(def, source)` | Reactive definition/source inputs return computed neutral widget models and guarded write actions. Text/range operator selection is separate from the entered value.                                                                                                                                             |
| `useFilterOptions(def)`                                                                                        | A computed `ResolvedFilterOptions` with `options`, `loading`, optional `error`; replaced async loaders cannot publish into a newer definition.                                                                                                                                                                   |
| `useFilterField(options)`                                                                                      | `MaybeRefOrGetter<FilterFieldOptions<TRow>>` to `ComputedRef<FilterFieldModel>`. Options contain `def`, `source`, resolved `labels`, optional `registry` and `id`. Outside a component, provide `id`.                                                                                                            |
| `FilterFieldModel`, `FilterFieldControl`                                                                       | A field ID/label/loading/error and discriminated input/select/checkbox control records.                                                                                                                                                                                                                          |
| `FilterFieldChrome({ model, controls, classNames?, className? })`                                              | Render structure using all required `FilterFieldSlots`: `Input(FilterInputProps)`, `Select(FilterSelectProps)`, `Checkbox(FilterCheckboxProps)`. Props carry label, current value/checked state, semantic attrs and one `onChange` action. `FilterFieldClassNames` styles the field, label and control wrappers. |
| `useChecklistFilter(def, source)`                                                                              | Computed available choices, visible search matches, selected values and select/clear/toggle actions. The source must satisfy `ChecklistSource<TRow>`.                                                                                                                                                            |
| `useChecklistWindow(count, enabled)`                                                                           | Reactive list count/virtualization flag to `window`, element `ref` and `onScroll`; measures only while active.                                                                                                                                                                                                   |
| `useChecklistModel(props)`                                                                                     | `MaybeRefOrGetter<ChecklistFilterProps<TRow>>` to a computed `ChecklistChromeModel`, combining the filter, window and labels.                                                                                                                                                                                    |
| `ChecklistChrome({ model, controls })`                                                                         | Requires `ChecklistSlots<VNodeChild>` with Search, Button and Checkbox controls. This virtualizes long checklist choices, not table rows.                                                                                                                                                                        |
| `useFilterTree(options)`                                                                                       | `FilterTreeOptions<TRow>` supplies definitions, a source with `filterTree`/`setFilterTree`, optional registry and default disclosure state. Returns refs for expansion/tree/actions; actions add/remove/replace nodes and change combinators.                                                                    |
| `useFilterTreeModel(props)`, `FilterTreeModel<TRow>`                                                           | A computed presentation over `FilterTreeBuilderProps<TRow>` with resolved labels, registry and the tree actions.                                                                                                                                                                                                 |
| `FilterTreeChrome({ model, controls })`                                                                        | Recursive AND/OR structure requiring `FilterTreeSlots<VNodeChild>`: Select, Input, Button and Disclosure. A tree requires definitions and a source that supports tree writes.                                                                                                                                    |

`FILTER_VIEW` and `filterViewKey<TRow>()` expose the table-owned
`FilterPanelModel<TRow>`. `FilterPanelChrome({ model, controls, classNames? })`
requires `FilterPanelSlots<TRow>`: Trigger, Button, Field, Popover and Drawer;
Tree is additionally required when the model enables the builder.
`FilterTriggerProps` carries semantic attrs, count, trigger ref and pointer/click
actions. `FilterPanelButtonProps` carries label, part and click action.
`FilterPanelSurfaceProps` carries open state, label, direction, anchor, optional
fullscreen container, content and close action. The kit owns positioning,
portals and dismissal. `FilterPanelClassNames` styles the form, panel, actions
and toolbar wrappers.

`@adapttable/vue/adapter` exports
`useHeaderFilter(MaybeRefOrGetter<HeaderFilterOptions<TRow>>)` and
`HeaderFilterChrome({ model, controls })`. The options extend
`FilterHeaderControlProps` with optional `id` and `dir`; the computed model
provides trigger, field, anchor, close and reset state.
`HeaderFilterChromeSlots<TRow>` requires Trigger, Popover and Field. Pass an
explicit ID when using the composable outside component setup.

The native entries also export `NativeFilterField`, `ChecklistFilter`
and `FilterTreeBuilder` for standalone native fields/builders, and
`NativeHeaderFilter` for one column. Their inputs are respectively
`FilterFieldOptions<TRow>`, `ChecklistFilterProps<TRow>`,
`FilterTreeBuilderProps<TRow>` and `HeaderFilterOptions<TRow>`.

## Draw only the widgets you use

`filters` draws every built-in widget, because filter types are data the
table reads at runtime. When a table only ever shows some of them, compose
`filtersWith` from the same entry with those widgets, and the rest stay out of
the bundle:

```ts
import {
  filtersWith,
  rangeFilterWidget,
  textFilterWidget,
} from "@adapttable/vue-unstyled/filters";

interface Person {
  id: string;
  name: string;
  score: number;
}
const filters = filtersWith([textFilterWidget, rangeFilterWidget]);
const features = [
  filters<Person>([
    { key: "name", type: "text", label: "Name" },
    { key: "score", type: "numberRange", label: "Score" },
  ]),
];
// Pass these features with the Person columns and rows from getting started.
```

Every kit's filters entry exports `filtersWith` (an `AdapterFiltersFeature`,
taking the same definitions and options as `filters`) and the six widgets:
`textFilterWidget`, `booleanFilterWidget`, `selectFilterWidget`,
`multiSelectFilterWidget`, `checklistFilterWidget` and `rangeFilterWidget`.
A filter whose widget was not composed throws when its field draws, naming
the filter and the widget to add. Measured 2026-11-18, a table with text
filters only is 1.4–2.4 KiB (min+gzip) lighter than one with every widget.

A widget is a `FilterWidget`: the `kinds` it draws and the component that
draws them with `FilterFieldOptions` props. Adapter authors find a field's
component with `filterWidgetComponent(def, registry, widgets)`, and build a
field model with `useFilterFieldWith(input, parts)` from the field parts
that draw each kind: `textFieldPart`, `rangeFieldPart`, `booleanFieldPart`,
`selectFieldPart` and `multiSelectFieldPart`. `FILTER_FIELD_PARTS` holds all
five, which is what `useFilterField` uses. A `FilterFieldPart` sets up its
state once and adds its controls to a `FilterFieldDraft` each time the model
is read.

## Explore the implementation

Use the [Vue live demo](https://adapttable.orwamahmoud.com/vue/demo/) to switch
adapters and the [Vue Feature Lab](https://adapttable.orwamahmoud.com/vue/demo/all-options/)
to compose features. The [feature index](./features.md) lists native imports and
[API reference](./api.md) documents the binding and controlled contracts.
