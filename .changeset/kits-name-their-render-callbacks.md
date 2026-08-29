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

Each kit now exports `MobileCardRenderer`, `RowActionsRenderer` and
`ToolbarSlots`. `renderCard`, `renderRowActions` and `toolbarSlots` are props
on the kit's own `DataTable`, so writing one of those callbacks as a named
function — rather than inline, where TypeScript infers it — meant importing its
type from `@adapttable/core`, which is the dependency importing from your kit
is meant to spare you.
