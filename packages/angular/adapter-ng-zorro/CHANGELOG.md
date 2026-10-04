# @adapttable/ng-zorro

## 0.1.1

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
- 143d5bf: Align the native search prefix and header controls, use compact text-style sort buttons, and give pinned body cells an opaque background so scrolling columns cannot bleed through them.
- Updated dependencies [089d5d5]
- Updated dependencies [143d5bf]
- Updated dependencies [0a9cb40]
- Updated dependencies [8d1e749]
  - @adapttable/angular@0.4.0
  - @adapttable/core@3.8.1

## 0.1.0

### Minor Changes

- 42a4349: Prepare the first public release of `AdaptDataTable`, `standardPreset()` and feature entry points rendered with NG-ZORRO controls, including mobile cards, localized labels, scoped RTL and optional assistant UI.
  
  Preserve requested pages during query loading, dismiss nested overlays in the correct Escape order, retain combobox focus during pointer interactions and keep fill handles visible. Host callbacks own data changes and resized widths; XLSX/PDF downloads preserve selected rows and requested visible/all-column scope. Requires Angular 22 and its Node.js range (`^22.22.3 || ^24.15.0 || >=26.0.0`), NG-ZORRO `^22.1.1` and the declared Angular/CDK peers.

### Patch Changes

- Updated dependencies [42a4349]
- Updated dependencies [6fd7108]
  - @adapttable/core@3.8.0
  - @adapttable/angular@0.3.0
