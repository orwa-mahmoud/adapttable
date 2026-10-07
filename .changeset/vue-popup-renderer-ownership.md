---
"@adapttable/vue": patch
"@adapttable/vue-unstyled": patch
"@adapttable/reka-ui": patch
"@adapttable/quasar": patch
---

Preserve popup callbacks and accepted tab focus when slot wrappers rerender with the same controls. Retire callbacks when the actual renderer or close owner changes, and keep native popup presentations stable across ordinary parent updates.
