---
"@adapttable/angular": minor
"@adapttable/angular-aria": patch
"@adapttable/angular-cdk": patch
"@adapttable/angular-material": patch
"@adapttable/angular-unstyled": patch
"@adapttable/ng-bootstrap": patch
"@adapttable/ng-zorro": patch
"@adapttable/ngx-bootstrap": patch
"@adapttable/spartan": patch
"@adapttable/taiga-ui": patch
---

Angular kits draw the desktop table and the phone cards through one structure, `AdaptDesktopStructure` and `AdaptMobileStructure`. Each kit still supplies its own table, rows, cells, cards and controls, and `AdaptDesktopTable` and `AdaptMobileCards` keep the same inputs.

`injectTableSurfaceHost` from `@adapttable/angular/adapter` composes a lean structural table from the features it is given and returns a `TableSurfaceView`, with `editingBundleFor` and the surface tokens in `@adapttable/angular`; kit tables keep typing their view as `TableView`. `AdaptHeaderTemplate` and `AdaptHeaderTemplateSlot` let a kit declare its header cell inside its table template.

`AdaptDesktopTableHost` and `AdaptMobileCardsHost` carry a kit table's inputs and scroll box, `AdaptTableSurface` is the base the structures share, `provideAdaptTableState()` provides the find, palette and context-menu state a kit's data table needs, and `scrollBoxStyle` is the scroll box's style rule.
