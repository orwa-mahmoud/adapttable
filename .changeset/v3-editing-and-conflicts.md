---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/radix": patch
"@adapttable/shadcn": patch
"@adapttable/unstyled": patch
---

Improve row editing, keyboard access and incoming-data conflict handling.

Mark a row action `editsRow` to open the row's editing form from that action.
It replaces the built-in Edit row trigger, needs no `onClick`, and appears
only where row editing is available. `resolveRowEditTrigger` is available
from `@adapttable/react/adapter` for custom adapters.

Row-edit controls use each kit's pencil, check and cancel glyphs with
localized accessible names and hover titles. `rowEditIcons` overrides
individual glyphs; `false` uses the text label. Composing `editing()` with
`rowEditing()` does not duplicate the controls. Enter and F2 open the focused
editable cell.

Incoming changes are compared with the row a form opened against. Affected
fields show Keep mine / Take theirs, and a newer incoming update replaces the
value awaiting a decision. Unresolved conflicts block saves through keyboard,
row, batch and custom-editor routes while leaving Cancel available.
`editConflictPolicy` and `onEditConflict` also apply to row forms.

Custom editors receive `CustomCellEditorConflict` with the incoming value
and decision controls. `isRowContested` exposes the row's pending-conflict
state, and `EditConflict.previous` carries the row the editor opened against.
