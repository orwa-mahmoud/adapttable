---
"@adapttable/chakra": patch
"@adapttable/mantine": minor
"@adapttable/antd": patch
"@adapttable/mui": patch
"@adapttable/radix": patch
"@adapttable/base-ui": patch
---

Chakra filter chips show their remove button. Mantine body cells follow the column's `align`, including while a cell is highlighted. The Ant Design table root carries `data-adapttable-part="root"`. Filter chip remove buttons in every styled kit are named with the `removeFilter` label ("Remove filter: <chip>"), and Mantine's `ActiveFilterChips` accepts a `removeLabel` prop for it.
