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

A row action can open the row's own form: mark it `editsRow` and it becomes
the trigger row-mode editing uses, so the pencil already in an actions column
opens the fields and the built-in "Edit row" control stands down. Such an
action carries no `onClick` — save and cancel come from the open row — and it
renders only where there is a form to open.

`RowAction.onClick` is now optional for that reason. Adapters resolve one
row's actions with `resolveRowEditTrigger` from `@adapttable/react/adapter`.
