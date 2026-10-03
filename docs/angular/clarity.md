# Clarity Angular adapter

`@adapttable/clarity` is a private `0.0.0` workspace implementation, not an
npm release. It composes the Angular binding's Chrome and required slots
with Clarity Angular 18.3.0 and scoped Clarity UI 18.3.0 styling.

## Setup

Use Angular 21.1 or 22 and matching Angular forms, animations and CDK.
The selected Clarity package declares Angular/CDK `>=21.1.0`. Angular 22
requires Node 22.22.3+, 24.15.0+, or 26+.
Import `@adapttable/clarity/styles.css` once. Do not import global Clarity
CSS for this adapter: its distribution is scoped to `.adapttable-clarity`.
Embedded upstream fonts are omitted; the host controls font loading.

## Features and composition

Import `AdaptDataTable` from the root and feature factories from their
individual subpaths, or use `/preset` for `standardPreset()`. Filtering,
saved views, column tools, grouping, editing, row actions, tree/pivot,
selection, navigation, export, virtualization and optional assistant
controls retain the Angular binding's model and host-callback contracts.
Clarity components own form controls, dropdowns, modals and the filter
drawer. Clarity UI classes style buttons and tables.

Mobile cards retain their selection, editing and row-action shell. Custom
card templates replace only the field body. The binding supplies localized
labels and RTL direction; the adapter uses logical layout properties.
`classNames` and public `data-adapttable-part` hooks retain their shared
meaning; private Clarity DOM fixtures use `data-clarity-part` separately.

## Integration status

See the package README for source-level usage. The showcase entry is
`apps/showcase/src/angular/kits/clarity.ts`. Shared registry, CLI, dependency
lockfile and docs-index registration are integrated separately. Runtime,
SSR/hydration, accessibility and browser gates must pass before any release
or verified parity claim. Package fixtures include Clarity dropdown/modal
selectors and scoped-style checks; their presence does not assert a pass.
