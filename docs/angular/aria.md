# Angular Aria adapter

`@adapttable/angular-aria` is a private, unpublished 0.0.0 workspace preview.
It targets Angular 22 and the MIT-licensed Angular Aria/CDK 22.2.1 pair.

## Architecture and controls

The adapter fills the Angular binding's required Chrome slots. Aria toolbar
and toolbar-widget directives provide pager navigation; Aria menu/menu-item
directives serve context and row-action menus. Filter-tree choices use Aria
combobox/listbox/option directives, and advanced filters use its accordion.
CDK positions filter and choice popups; its focus trap supports the drawer.

Angular Aria supplies accessible composite behavior, not a visual theme or
standalone button, input, checkbox or dialog components. These controls and
remaining surfaces are deliberately adapter-owned, neutrally styled native
HTML. There are no Material components and no imports from another kit.
Table navigation remains in the binding; no Aria grid integration is claimed.

Import `@angular/cdk/overlay-prebuilt.css` and
`@adapttable/angular-aria/styles.css` in the host. Override `--adapt-aria-*`
tokens or use the common part attributes and class-name hooks.

## Feature surface

Compose opt-in features from the package's secondary entries, including
filters, editing, grouping, pivot, tree, selection, saved views, exports,
virtualization, row actions, command palette and assistant. Model and URL
state belong to core through the Angular binding. The adapter never owns row
data; host callbacks perform writes.

Desktop tables and mobile cards share the adapter controls. Logical CSS and
localized binding labels support RTL. Aria composites own their keyboard
interactions; the binding owns table navigation and screen-reader messages.

## Verification and release status

The source includes Angular TestBed directive fixtures and the shared adapter
behavior suite. This preview must pass the integrated Angular compiler,
coverage, package build and real-browser keyboard/overlay checks before it is
called release-ready. A workspace manifest or showcase route is not evidence
of npm publication.

See the [package README](../../packages/angular/adapter-angular-aria/README.md)
for usage, feature entries, styling hooks and the precise primitive mapping.
