---
"@adapttable/core": patch
---

Let the table repeat an announcement. The status region kept its last message
through a silent settle, so filtering to nothing and back — 87 rows, 0 rows, 87
rows — left the identical string in the DOM and `aria-live` had no change to
fire on: the reader heard the count once and never again. Silence now clears the
region.

It also announces when only the rendered count moves and the source reports no
limit, which is the case that decides the bounds there.
