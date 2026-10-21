# @adapttable/ngx-bootstrap

## 0.2.7

### Patch Changes

- Updated dependencies [e3e40e7]
- Updated dependencies [ffc8540]
  - @adapttable/core@3.12.0
  - @adapttable/angular@0.7.0

## 0.2.6

### Patch Changes

- Updated dependencies [0f1df5a]
  - @adapttable/angular@0.6.2

## 0.2.5

### Patch Changes

- 07b4440: Improve mobile cards with responsive field tiles, clearer identity and action sections, native kit surfaces, larger mobile action targets, and readable light and dark theme labels. Preserve automatic mobile cards and the explicit horizontal table option. Fix horizontal table scrolling in Reka UI and mobile action contrast in Taiga UI. Mobile selection, Save/Cancel and hierarchy controls also receive comfortable native touch surfaces. Restore visible loading placeholders and shared loading parts across Angular kits.
- Updated dependencies [b33a9ee]
- Updated dependencies [426d44f]
  - @adapttable/core@3.11.0
  - @adapttable/angular@0.6.1

## 0.2.4

### Patch Changes

- 66aa1f8: Make descending sorting reachable from mobile cards with each kit's native direction button. Preserve the selected column, localized labels, keyboard activation and shared URL/Saved Views state.
  
  The Angular binding adds the protected `AdaptDataTableShell.sortDirection()` transition for native adapter templates.
- c7d999d: Reopen the native column menu reliably after Escape, including rapid keyboard activation before the close/open input values render separately. Render prepared placement inputs before the native popup opens so short-screen menus open above their trigger, and cancel a second activation while opening is pending. Apply the height and scrolling budget to the complete native popup, including its border and padding, so the outer edge stays on screen.
- Updated dependencies [019364c]
- Updated dependencies [753873b]
- Updated dependencies [66aa1f8]
- Updated dependencies [c201ffb]
- Updated dependencies [330566b]
- Updated dependencies [d35c348]
- Updated dependencies [d7ddec5]
  - @adapttable/angular@0.6.0
  - @adapttable/core@3.10.0

## 0.2.3

### Patch Changes

- c8d10ab: Align assistant headers, composers, conversation alignment and viewport placement with the Mantine reference while retaining each adapter's native controls. Correct native dialog offsets, mobile focus handoff and nested shortcuts dismissal.
- Updated dependencies [c8d10ab]
  - @adapttable/angular@0.5.2

## 0.2.2

### Patch Changes

- eaac515: Give column resize handles visible, focusable targets at their header's inline edge. Kit theme tokens provide the grip and focus colors, while logical positioning supports both text directions.
- e940dc7: Reset native dialog start offsets so floating assistants follow their logical trailing-edge placement. Keep native example menus above the composer without browser list markers or changes to the composer layout.
- 62c9b3f: Keep editable Vue cell values as their accessible names, with editing instructions provided as descriptions. Reduce button chrome on Vue Unstyled, Element Plus, Reka UI and Nuxt UI cell activation controls, and align the native Vue search icon with its input.
  
  Give unlabeled mobile card values the full row width and clear heading emphasis in all eight Vue adapters.
  
  Restore visible keyboard focus on Angular editable cells without resetting the focus styles supplied by their native controls.
  
  Arrange Vue grouping and aggregation controls in compact, responsive rows with visible section labels, bounded selects, and borderless aggregation pickers. Preserve each kit's own controls and consumer class hooks. Give Element Plus column-menu icon buttons usable hit areas and keep Quasar resize handles visually light without reducing their drag targets.
  
  Keep Angular aggregation labels, operations and removal controls aligned, and add spacing and a visible grouping label across all nine adapters.
  
  Expose stable, visible grouping insertion targets during pointer drags and a clearly marked removal target in Vue and Angular adapters. Respect kit theme colors and highlight the current destination without shifting the chips. Restore native pointer dragging from Naive UI buttons, including grouping handles and sortable headers.
  
  Style active Vue filters as wrapping chips instead of browser-default lists, preserve native remove/clear controls, and provide phone-sized touch targets. Separate group labels from counts, and reduce the chrome on Naive UI sort and group-toggle buttons.
- Updated dependencies [7bedef1]
- Updated dependencies [29ff08e]
- Updated dependencies [9213f9a]
  - @adapttable/angular@0.5.1
  - @adapttable/core@3.9.1

## 0.2.1

### Patch Changes

- 00df62b: Constrain native Bootstrap and NG-ZORRO column menus to the available room beside their triggers and keep the complete menu scrollable on short viewports. Keep NG-ZORRO's native filter popover host aligned with CDK viewport coordinates across scrollbar gutters and viewport resizing.
- 2098049: Keep Angular selection, row-reorder and expand columns compact in wide tables and both reading directions. Preserve native control targets and give unused width to data columns instead of auxiliary controls.
  
  Give NG-ZORRO, CDK and Taiga UI column menus aligned rows, readable column names and native control targets.
  
  Keep Vuetify's filter trigger accessible name stable when its native menu adds an owned dialog to the accessibility tree.

## 0.2.0

### Minor Changes

- f7f62c6: Allow Angular column `headerActions` to render host templates or components,
  alongside plain text. All nine native kits pass the current header context and
  place the action outside the sortable caption. Export `AdaptHeaderActions` for
  custom adapter structure. Header actions appear in desktop headers; mobile cards
  keep their existing presentation.

### Patch Changes

- 7e33aa2: Organize the Angular 0.5 binding around canonical public entries: application
  hooks, column/rendering contracts, composition and `AdaptCellTemplate` at the
  root; headless factories/options under `/features`; structural Chrome, kit models,
  directives and controllers under `/adapter`. Specialized formula, pivot, router,
  sparkline and stream entries retain their declaration and DI-token identities.
  
  All nine native kits and Angular AI consume those entries; kit feature imports
  remain unchanged. Custom renderers/adapters must update binding imports using
  the migration guide. Each entry re-exports the public types its signatures return.
- 32e1255: Keep Angular native filter cards and toolbar menus within the viewport on phones
  and in RTL layouts. Material filters can flip above a low trigger, retain native
  placement on rendered-size changes and scrollbar gutters, and scroll their body
  while headers/actions remain visible. The optional `injectPopoverSpace`
  `allowAbove` getter preserves existing below-only defaults.
  
  Material Clear all labels fit a text button; resize handles keep their 48px
  native targets inside the header. Aria, CDK and Unstyled menus cap/flip within the
  viewport, and Taiga UI menus preserve readable name fields and a viewport gutter.
  NG-ZORRO, ngx-bootstrap and Taiga UI restore name-field focus after saving.
  Palettes handle Escape and Tab from command buttons; rename focus work retires
  with its owner. Spartan header filters follow live inherited writing direction.
- Updated dependencies [7e33aa2]
- Updated dependencies [f7f62c6]
- Updated dependencies [f81d849]
- Updated dependencies [32e1255]
- Updated dependencies [0120bd4]
- Updated dependencies [f3240c8]
- Updated dependencies [19da962]
- Updated dependencies [d32983f]
- Updated dependencies [da5d11b]
- Updated dependencies [1946b61]
- Updated dependencies [05b436c]
- Updated dependencies [88840eb]
- Updated dependencies [d32983f]
- Updated dependencies [aebbd39]
  - @adapttable/angular@0.5.0
  - @adapttable/core@3.9.0

## 0.1.0

### Minor Changes

- 143d5bf: Add the first public Angular 22 zoneless ngx-bootstrap adapter with scoped
  Bootstrap styles, native overlays, feature entries and assistant controls.
  
  With ngx-bootstrap 22.0.0 and Angular 22.2, early pagination-anchor clicks queued
  before hydration can fail during event replay. Ordinary hydration and paging
  after hydration work. Users must click again after hydration; the adapter does
  not automatically retry the lost early click.

### Patch Changes

- 089d5d5: Share Angular table orchestration and desktop, mobile, filter, column-menu and group models through the binding. All nine adapters inherit the shared signals while retaining their native controls, templates, overlays, styling hooks and public table inputs and outputs. Export the shared model bases and view contracts for adapter authors, and preserve existing adapter type imports as re-exports.
- 0a9cb40: Keep native Angular filter cards beneath their triggers with readable fields,
  scrolling bodies and reachable dismissal. Correct native portal coordinates
  and RTL alignment, preserve each kit's controls and themes, and refine table
  toolbars and Material fields through the supported kit tokens. Export
  `injectPopoverSpace` so adapters share viewport measurement without sharing
  surfaces, positioning or controls.
  
  Keep Angular assistants in floating native windows with usable phone sheets,
  readable titles, growing composers and nonblocking tooltip overlays. Preserve
  native search groups and icons, drawer geometry, and accessible filter counts.
  
  Keep Unstyled and Aria text filter controls paired without relying on
  platform-specific native input widths.
- 8d1e749: Correct native control labels, separator and list-item semantics, and keyboard scroll-region metadata. Preserve established Angular binding names and signal access while removing alias declarations. Share live bulk-action coordination, consolidate CSS rules, and simplify re-exports and controller code without changing subscription snapshots or filter memo invalidation.
- d57e69c: Keep native header-filter menus open while choosing multiple checkbox values. Let ngx-bootstrap handle outside presses for its portaled menus, while preserving Escape dismissal and configured single-choice completion.
- Updated dependencies [089d5d5]
- Updated dependencies [143d5bf]
- Updated dependencies [0a9cb40]
- Updated dependencies [8d1e749]
  - @adapttable/angular@0.4.0
  - @adapttable/core@3.8.1
