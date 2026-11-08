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

`injectTableSurfaceHost` composes a lean structural table from the features it is given, with `TableSurfaceView` and `editingBundleFor` published; kit tables keep typing their view as `TableView`.
