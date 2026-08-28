---
"@adapttable/mui": patch
---

Name the sort control in the MUI adapter. Six other kits label theirs "Sort by: <column>"; MUI's
`TableSortLabel` took only the click handler from the header leaf, so the control was named by its own
text and read as "Person, button" — which does not say what pressing it does.
