---
"@adapttable/angular": minor
"@adapttable/angular-aria": minor
"@adapttable/angular-cdk": minor
"@adapttable/angular-unstyled": minor
"@adapttable/angular-material": minor
"@adapttable/ng-bootstrap": minor
"@adapttable/ng-zorro": minor
"@adapttable/ngx-bootstrap": minor
"@adapttable/spartan": minor
"@adapttable/taiga-ui": minor
---

Angular kits ship the feature families: `editingFamily(save)` from `/editing`, `filteringFamily(defs)` from `/filtering` and `columnLayoutFamily()` from `/column-layout`, each passed to `features` as one entry and each on its own entry, so a member imported alone still loads alone. The kit preset is `standardFeatures` with `StandardFeatureOptions`, the same members and options as the React and Vue kits: columns menu, resizing, fitting, density, CSV export, keyboard Find (`findButton: true` adds its toolbar control), fullscreen, multi-sort, header filters and status bar. `standardPreset` and `StandardPresetOptions` are removed.
