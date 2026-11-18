---
"@adapttable/core": patch
---

Built-in aggregates (`sum`, `avg`, `count`, `min`, `max`) fold each column's values as they are read instead of collecting them into lists first: a 100,000-row, five-column `aggregate()` pass needs about 15 MB of temporary memory instead of 70–85 MB, with identical results. Custom and registered aggregators still receive the column's present values as a list.
