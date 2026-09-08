---
"@adapttable/react": patch
---

Enter and F2 open the cell the keyboard is on. Arrow keys moved the focus and
the editor stayed shut: the grid left those keys to whatever was inside the
cell, and the only thing that answered them was a control a keyboard reader
never reaches by arrowing. A column that is not `editable` still does nothing.
