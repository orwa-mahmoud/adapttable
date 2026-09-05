---
"@adapttable/core": major
"@adapttable/react": major
---

`DisplayValue` names what a binding can hand back — a primitive, or an object
only that binding understands — instead of aliasing `unknown`. Absence is
stated where it happens: an `Aggregator`, a `format` callback, a
`collapsedRender`, a `MobileCardRenderer` and `fillSlot` all answer
`DisplayValue | undefined`, and a group row's aggregate cells are
`Partial<Record<string, DisplayValue>>`.

`ColumnMetadata.editor` is a `ColumnModelEditor`, the same editor a column can
declare anywhere else. `EditableCellEditing` reads a cell draft and a
conflict's incoming value as strings, matching the controller that produces
them.

`@adapttable/react` and `@adapttable/react/adapter` export their own `Slot` and
`fillSlot`, typed in `ReactNode`. `@adapttable/core` keeps the neutral pair for
a non-React host.
