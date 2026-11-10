---
"@adapttable/core": minor
"@adapttable/react": patch
"@adapttable/angular": patch
"@adapttable/vue": patch
---

Row editing and batch editing apply `validateRow` in React and Angular, as they do in Vue: a row the rule refuses is not saved, and its message shows. A batch cell shows its validation state the same way in all three. `rowEditorControl` and `batchEditorControl` are on `@adapttable/core`.
