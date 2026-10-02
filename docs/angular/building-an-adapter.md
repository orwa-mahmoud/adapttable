# Build an Angular table adapter

An Angular adapter draws a UI kit's components around the headless binding.
Core owns state and behavior; `@adapttable/angular` turns that behavior into
signals, structural Chrome and required slots. The adapter owns the controls,
overlays and visual theme.

Use the implemented
[native kit](../../packages/angular/adapter-angular-unstyled/src/dataTable.ts)
and [NG-ZORRO kit](../../packages/angular/adapter-ng-zorro/src/dataTable.ts)
as complete references. A small headless table is useful, but a full adapter
also needs mobile cards, async status, focus, feature outlets and lifecycle
wiring.

## Keep the dependency boundary

A kit imports contracts only from `@adapttable/angular` and its documented
secondary entries. It does not import core or another kit. If a neutral helper
is missing from the binding, expose it there instead of bypassing the binding.

Give consumers a root `AdaptDataTable` and separate feature entries. A consumer
who does not import an optional feature should not pull its control library or
runtime through the basic table path. Use Angular-compatible package entrypoints
and declare the actual Angular and UI-kit peer dependencies.

## Fill a required Chrome slot

This native-control example shows the complete group-toggle composition. In
a themed kit, its `ExampleGroupButton` uses that kit's button component while
preserving the same label, expanded state, part and activation behavior.

```ts
import { Component, input } from "@angular/core";
import {
  AdaptColumnGroupToggleChrome,
  COLUMN_GROUP_TOGGLE,
  collapsibleColumnGroups,
  extendFeature,
  slotRender,
  type ColumnGroupToggleButtonProps,
  type ColumnGroupToggleProps,
  type ColumnGroupToggleSlots,
} from "@adapttable/angular";

@Component({
  selector: "example-group-button",
  standalone: true,
  template: `
    <button
      type="button"
      data-adapttable-part="column-group-toggle"
      [class]="props().className ?? ''"
      [attr.aria-expanded]="props().expanded"
      [attr.aria-label]="props().label"
      (click)="props().onClick()"
    >
      <span aria-hidden="true">{{ props().expanded ? "−" : "+" }}</span>
    </button>
  `,
})
export class ExampleGroupButton {
  readonly props = input.required<ColumnGroupToggleButtonProps>();
}

@Component({
  selector: "example-group-toggle",
  standalone: true,
  imports: [AdaptColumnGroupToggleChrome],
  template: `
    <adapt-column-group-toggle-chrome
      [cell]="props().cell"
      [labels]="props().labels"
      [onToggle]="props().onToggle"
      [className]="props().className"
      [slots]="slots"
    />
  `,
})
export class ExampleGroupToggle {
  readonly props = input.required<ColumnGroupToggleProps>();
  readonly slots: ColumnGroupToggleSlots = { Button: ExampleGroupButton };
}

export function exampleColumnGroups() {
  return extendFeature(collapsibleColumnGroups(), [
    slotRender(COLUMN_GROUP_TOGGLE, () => ExampleGroupToggle),
  ]);
}
```

The binding decides whether a group can collapse, derives the localized label
and supplies the action. The button is required; Chrome does not fall back to
raw HTML. Follow the same rule for every input, select, checkbox, button and
overlay surface. In particular, the command palette's Surface slot belongs to
the adapter, including the actual native or kit dialog.

## Assemble the shell

The full kit shell performs these steps once for a mounted table:

1. Resolve inherited and local features, their options and slot fills
2. Create `injectTableData`, preserving its source and filter runtime
3. Create `injectDataTable` with the source signal, column inputs, labels,
   direction and any controlled state
4. Build the live table runtime and per-table feature state, then call
   `mountTableFeatures` with the runtime, state and injector
5. Render desktop or card structure and `AdaptSlot` outlets, each carrying
   its complete props and table context

`AdaptSlot` creates a standalone slot component and updates its `props` input.
The feature's `mount` callback may return cleanup; `mountTableFeatures` runs
cleanup with table destruction and releases its child injector. Do not duplicate
stores or registrations in the kit to work around missing wiring.

Use `AdaptCell`, `AdaptHeader` and `AdaptFooter` for column renderers. Custom
mobile bodies receive real field templates; stamp each with its supplied
context so editors and formatting survive.

## Bind the actual semantic element

Apply whole `AdaptAttrs` records. If your kit wraps a native table, input or
focus target, use `adaptAttrsTarget` to reach the actual inner element. A
getter can follow view replacement; `null` defers attachment until the element
exists. This bridge preserves attributes, controlled values, classes, styles,
listeners and refs, and removes them from an old target.

Preserve `data-adapttable-part` names and documented `classNames` placement.
Use logical CSS edges for pins and overlays. NG-ZORRO demonstrates how to keep
direction on portalled controls without changing the whole document.

## Prove behavior, not only markup

A usable adapter covers its kit's real controls on desktop and cards:
search/sort/page, selection, editing and failures, grouped headers, row
structure, virtualization, menus and exports. Verify keyboard activation,
roving focus, Escape/outside dismissal, trigger focus restoration, RTL and
screen-reader announcements in a real browser. A slot that exists in the DOM
but cannot be operated is not feature parity.

Keep first-load, background-refresh, empty, error and retry states distinct.
The permanent table status live region must exist before its text changes.
Row writes go to host callbacks; an adapter never takes ownership of the data.

See [Headless rendering](./headless.md), [Features](./features.md),
[Mobile cards](./mobile.md), [Accessibility](./accessibility.md) and the
[Angular API reference](../api.md#the-angular-binding).
