# Angular CDK adapter

`@adapttable/angular-cdk` is a private `0.0.0` Angular 22 adapter, based on
MIT-licensed `@angular/cdk` 22.2.1. It has not been published to npm.

CDK provides accessibility and overlay primitives, not a visual component theme.
This adapter owns neutral controls, styles, table/card layouts and all required
slots over Angular binding Chrome. It does not import Angular Material or any
other adapter. FocusMonitor enhances the controls; connected overlays, CDK Menu
and focus traps power popovers, menus and modal drawers/dialogs.

Import global `@angular/cdk/overlay-prebuilt.css` before
`@adapttable/angular-cdk/styles.css`. No external assets or license key are needed.
Customize the neutral palette through `--adapt-cdk-accent`, `--adapt-cdk-border`,
`--adapt-cdk-background` and `--adapt-cdk-color`. Shared part names and class hooks
remain available on the same public elements.

The implementation includes the full 40-entry feature surface, the optional
assistant, desktop and responsive mobile cards, RTL, SSR fixtures and host-owned
writes. Filters use an anchored, backdrop-free card by default; drawer mode
blocks the background and traps focus. Individual feature imports remain opt-in.

The implementation and its focused CDK fixtures require integrated Angular 22
compiler, coverage and browser verification before any release claim.
