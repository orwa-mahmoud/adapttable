# @adapttable/angular-material

## 0.1.0

### Minor Changes

- 143d5bf: Add the first public Angular Material adapter with Material controls, modal and
  anchored overlays, the complete Angular feature entrypoints, responsive cards
  and optional assistant controls. Includes scoped theme integration, documentation,
  showcase kit wiring and conformance/regression tests.

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
