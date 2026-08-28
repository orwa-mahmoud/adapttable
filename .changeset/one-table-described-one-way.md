---
"@adapttable/core": patch
"@adapttable/chakra": patch
"@adapttable/antd": patch
---

Describe the table the same way in every adapter. Comparing the four levels a screen reader walks —
the table, a row, a cell, a header cell — across all eight kits turned up three differences that no
per-adapter suite could see, because each adapter was self-consistent:

- Cells inside a `role="grid"` table carried `role="cell"` in three kits. A bare `<td>` maps to
  `gridcell` when its table is a grid, and the explicit role overrode that — telling assistive
  technology the grid was an ordinary table. Cell navigation now states `gridcell` outright, so the
  cell props' `role="cell"` cannot win where it does not belong.
- Header cells carried `scope="col"` in four kits out of eight, so which cells a screen reader
  associated with their column header depended on the kit. All eight state it now.
- Ant Design's rows left `role="row"` implicit while the other seven stated it. A `<tr>` is a row
  either way; this is parity, not a fix.
