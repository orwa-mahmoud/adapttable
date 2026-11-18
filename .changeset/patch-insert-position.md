---
"@adapttable/core": patch
---

A row insert at a position that is not a whole number (`NaN`, a fraction, `±Infinity`) lands where `Array#splice` puts it, and a later patch in the same batch updates or removes the row it names. The insert event reports that whole-number index.
