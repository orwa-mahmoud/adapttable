---
"@adapttable/angular": patch
---

Every development warning in `@adapttable/angular` is guarded by `ngDevMode`, so an `ng build` production application drops the checks and their messages and a development build still prints them. A headless Angular table measures 27.1 KiB gzip instead of 27.3 and an Angular Unstyled table 86.7 instead of 87.0.
