---
"@adapttable/react": major
"@adapttable/cli": minor
---

A kit draws each optional cell control with `FeatureSlot` and its slot key; `FeatureSlot` takes a `fallback` for a position the table draws without the feature. `CellContent` draws a body cell's content and replaces `OptionalEditableCell`; the other `Optional*` cell wrappers are removed, and `adapttable migrate-v4` reports each one. A header whose column can be renamed keeps its label when no column menu is composed.
