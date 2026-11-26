---
"@adapttable/angular": minor
"@adapttable/angular-aria": patch
"@adapttable/angular-cdk": patch
"@adapttable/angular-unstyled": patch
"@adapttable/angular-material": patch
"@adapttable/ng-bootstrap": patch
"@adapttable/ng-zorro": patch
"@adapttable/ngx-bootstrap": patch
"@adapttable/spartan": patch
"@adapttable/taiga-ui": patch
---

The Angular table view builds a feature's state only while that feature is composed: `commandPalette` and `contextMenu` are `undefined` unless their feature is composed, and `rowMutations` is `undefined` unless row actions wire an add, duplicate or delete handler. The palette's and the menu's props are built by code their features bring (`withCommandPaletteView` and `withContextMenuView` on `@adapttable/angular/adapter`, which every kit's `commandPalette()` and `contextMenu()` apply), so a plain table neither ships nor runs it, and every kit's template draws those regions behind the same check.
