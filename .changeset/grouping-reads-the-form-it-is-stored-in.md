---
"@adapttable/core": patch
---

A grouping restored from its stored form groups by every key in it. Grouping
travels as one comma-separated string — `groupBy=team,status` — and the walk
read that back as a single column name: nothing matched, and every row landed
in one `(blank)` bucket under a panel still showing both chips.
