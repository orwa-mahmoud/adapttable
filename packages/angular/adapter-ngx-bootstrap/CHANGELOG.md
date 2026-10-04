# @adapttable/ngx-bootstrap

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
