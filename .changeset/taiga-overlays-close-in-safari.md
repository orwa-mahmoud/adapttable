---
"@adapttable/taiga-ui": patch
---

Taiga dropdowns, selects and the filters popover close reliably in Safari. `provideAdaptTaiga()` keeps component styles in the document while Taiga's closing animation runs, so a closed overlay no longer stays on screen.
