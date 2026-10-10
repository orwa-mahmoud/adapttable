---
"@adapttable/core": patch
---

Restore collapsed column groups and explicitly empty layouts from saved state.
Preserve the newest URL slice when host callbacks synchronously write, flush or
dispose the binding. Earlier Saved Views loads cannot overwrite newer list edits;
read-only views cannot be overwritten, and explicit reloads remain authoritative.
