---
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/chakra": minor
"@adapttable/antd": minor
"@adapttable/radix": minor
"@adapttable/base-ui": minor
"@adapttable/unstyled": minor
"@adapttable/shadcn": minor
---

`<kit>/features` now re-exports every type `@adapttable/core/features` publishes,
not just the feature factories. Writing a `TableFeature` of your own means naming
`Aggregator`, `Command`, `CustomCellEditorRender`, `ExportWriter`,
`FilterTypeSpec` or `SidePanelEntry` to register anything on the host, and those
were only reachable from `@adapttable/core` — so composing a feature meant
importing from two packages instead of the one you mount.
