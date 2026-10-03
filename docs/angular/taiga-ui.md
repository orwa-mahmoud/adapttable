# Taiga UI for Angular

`@adapttable/taiga-ui` is a private adapter under development. It is not published
on npm. It renders the Angular binding's table and feature slots with Taiga UI
5.26.0. Taiga UI is Apache-2.0; the adapter source is MIT.

## Setup

Use Angular 22, Taiga UI's matching 5.26.0 core/kit/cdk/i18n/styles packages,
and their published peers. Configure Taiga icon assets at
`assets/taiga-ui/icons`, or supply your application's Taiga icon resolver.
Your build must support Less.

Register `provideAdaptTaiga()` from `@adapttable/taiga-ui` in your application's
bootstrap providers. It enables Taiga's event plugins and stable options without
writing theme attributes to `document.body`, disabling scrollbars globally, or
adding document metadata. Use `AdaptTaigaRoot` for the scoped theme instead.

```ts
import { AdaptDataTable, AdaptTaigaRoot } from "@adapttable/taiga-ui";
import { filters } from "@adapttable/taiga-ui/filters";
import { editing } from "@adapttable/taiga-ui/editing";
```

The table includes a nested-safe Taiga root. Wrap a table and standalone feature
panels in `AdaptTaigaRoot` to share the same theme and portal host:

```html
<adapt-taiga-root theme="dark" dir="rtl">
  <adapt-data-table
    [data]="rows"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features"
    tableLabel="People"
  />
</adapt-taiga-root>
```

The component's `theme` and `dir` inputs also accept `light` and `ltr`.
It accepts projected children or a `content` template for dynamically mounted
applications. Only the Taiga root receives Taiga's scoped theme mixin; no
application-wide reset or global theme variables are installed.

## Controls and feature parity

The adapter supplies Taiga buttons, checkbox inputs, text fields, textarea,
select/list controls, skeletons, dropdowns, modal dialogs, and drawers. Native
hosts retain Angular refs, accessibility attributes, and shared public part
names. The headless binding continues to own state, labels, URL serialization,
announcements, feature models, and host write callbacks.

The feature-entry inventory matches Angular unstyled, including filtering,
header filters, columns, editing and history, bulk actions, grouping, pivot,
row operations, saved views, virtualized rows, mobile cards, keyboard navigation,
context menus, command palette, assistant controls, and approval prompts.

Filter popovers are nonmodal Taiga dropdowns. Drawers have Taiga's real backdrop
and trapped keyboard focus. An Escape dismissal restores the opener. Themed
controls use logical spacing and the same desktop/mobile structure as the
Angular binding. Public `classNames` hooks remain available.

## Development status

The source includes behavior, conformance, SSR, and native-control contract
fixtures. Full integration compilation, coverage, and browser acceptance are
required before release. npm publication is a separate release step.

See the [package README](https://github.com/orwa-mahmoud/adapttable/tree/main/packages/angular/adapter-taiga-ui)
for the full entry inventory and workspace setup.
