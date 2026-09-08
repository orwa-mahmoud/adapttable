---
"@adapttable/core": minor
---

`groupValue` is what a column buckets rows by when the table groups on it, and
the caption the group carries. Grouping falls back to the sort value, which is
right for a team or a status and wrong for anything continuous: a timestamp
column gave every row a group of its own, headed by the raw number. Return the
month, the band, whatever the reader means, and rows sharing it group under it.
