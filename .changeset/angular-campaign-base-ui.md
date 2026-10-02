---
"@adapttable/base-ui": patch
---

Restore shared table/filter/chip/card styling hooks, localize “All” and make bounded mobile-card scroll regions keyboard-focusable. Reduce repeated rendering code to keep the table fixture within its existing bundle budget. Expose the shared `grid` styling hook only while cell navigation is active.
