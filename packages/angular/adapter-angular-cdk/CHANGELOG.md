# @adapttable/angular-cdk

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

- 143d5bf: Add the first public Angular CDK adapter with neutral CDK-backed controls,
  connected and modal overlays, all Angular feature entries, assistant integration
  and an isolated showcase kit.

### Patch Changes

- 05f9221: Polish the Angular Material and CDK table surfaces, toolbar spacing and mobile card framing. Material editable cells use table-sized native buttons and inherit the content color; CDK borders and hover states adapt to light and dark color schemes.
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
- Updated dependencies [089d5d5]
- Updated dependencies [143d5bf]
- Updated dependencies [0a9cb40]
- Updated dependencies [8d1e749]
  - @adapttable/angular@0.4.0
  - @adapttable/core@3.8.1
