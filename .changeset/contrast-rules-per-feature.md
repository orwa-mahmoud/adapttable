---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/vue": minor
"@adapttable/angular": minor
"@adapttable/antd": patch
---

High-contrast rules load with the features that draw them. Every table adds the base rules (focus, validation, pinned edges) to the page's one stylesheet; cell navigation, find, the editing features, saved views, the side panel, the command palette and the grouping panel each add their own, so a plain table carries 1.2 kB of rules instead of 2.1 kB. A feature, or a host plugin, carries its rules in a `contrast` field.

`FORCED_COLORS_CSS` is removed, and `@adapttable/react/adapter` no longer exports `ForcedColorsStyle` or `ensureForcedColorsStyles`: `FeatureProviders` mounts the rules. `mountForcedColorsStyles` in the Vue and Angular bindings takes a reader of the composed features.
