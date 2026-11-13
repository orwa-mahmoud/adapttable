---
"@adapttable/vue": patch
---

An edit the host writes back into `data` redraws only the edited row, with cell navigation and with selection on. A row's selection checkbox stays live while its row is drawn, so a data write no longer redraws every row of a selectable table.
