---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/vue": minor
"@adapttable/angular": minor
---

Add `editActivation: "click"` to open a cell's editor on the first click, the way a form field does; set it on the table or in `editing(handler, { editActivation: "click" })`. The default stays a double-click, and Enter and F2 open the editor either way. The rest of a double-click that opened an editor no longer acts inside it, so it never ticks a checkbox or toggles a list.
