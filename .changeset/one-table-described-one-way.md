---
"@adapttable/core": patch
"@adapttable/chakra": patch
"@adapttable/antd": patch
---

Describe the table the same way in every adapter, at all four levels a screen reader walks — the
table, a row, a cell, a header cell:

- Cells inside a `role="grid"` table now map to `gridcell`. Three kits set `role="cell"` explicitly,
  which overrode that and told assistive technology the grid was an ordinary table.
- All eight kits now set `scope="col"` on header cells. Four did, so which cells a screen reader
  associated with their column header depended on the kit.
- Ant Design's rows now state `role="row"` explicitly, as the other seven already did. A `<tr>` is a
  row either way; this is parity, not a fix.
