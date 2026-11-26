---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/cli": minor
---

React toolbar controls read the state their feature publishes. Undo/redo, export, print, density and fullscreen draw from `EDIT_HISTORY_STATE`, `EXPORT_STATE`, `FULLSCREEN_STATE` and the finished table props in `TABLE_PROPS_STATE` through `useFeatureState`, and the toolbar hands them only `ToolbarEntrySlotProps` (labels and class map). The toolbar props no longer carry the undo/redo, print, density, fullscreen and export fields, `finishShellLive` leaves the toolbar alone, and `adapttable migrate-v4` reports `ToolbarExtrasSlotProps`.
