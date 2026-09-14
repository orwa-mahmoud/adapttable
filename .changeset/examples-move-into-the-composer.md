---
"@adapttable/react": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/chakra": minor
"@adapttable/antd": minor
"@adapttable/radix": minor
"@adapttable/base-ui": minor
"@adapttable/unstyled": minor
---

The assistant's examples move into the composer, behind an icon. Once a
conversation has started they were a disclosure pinned under a scrolling
transcript; they now open from the composer row, where a reader looks when
they do not know what to type. The menu holds every eligible example rather
than a primary few and an overflow.

Each kit draws it with its own menu — Mantine's `Menu`, MUI's, Chakra's,
antd's `Dropdown`, Radix's `DropdownMenu`, Base UI's `Menu`, and native
`<details>` for unstyled. The new `Menu` slot takes `TableAssistantMenuProps`
with `TableAssistantMenuItem` entries; a kit that fills no menu keeps the
disclosure.
