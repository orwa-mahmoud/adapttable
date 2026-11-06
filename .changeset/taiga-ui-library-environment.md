---
"@adapttable/angular": patch
"@adapttable/taiga-ui": patch
---

Taiga UI tables follow `TUI_LANGUAGE` when it is not the default English pack, and they turn animation off when `TUI_REDUCED_MOTION` is set or `TUI_ANIMATIONS_SPEED` is `0`. An explicit `labels` still wins. A language AdaptTable has no labels for keeps the current copy. Taiga has no direction or size provider; it follows the page `dir`. The motion token is exported from the Angular adapter entry so a kit and the table shell share one token.
