---
"@adapttable/mui": patch
---

Name the command palette dialog in the MUI adapter. `aria-label` on MUI's `Dialog` lands on its
Modal root, which MUI marks `role="presentation"`, so the name was discarded and the palette opened
as a dialog with no accessible name — the browser computed no named dialog at all. The name now sits
on the paper, where `role="dialog"` is.
