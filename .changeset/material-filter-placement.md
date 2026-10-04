---
"@adapttable/angular": minor
"@adapttable/angular-material": patch
---

Allow Material filter cards to use the native above-trigger fallback when there
is not enough room below. Keep headers and actions visible with an independently
scrolling body. The optional `injectPopoverSpace` `allowAbove` getter includes
above-origin space while preserving existing below-only callers and defaults.
