---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/i18n": minor
"@adapttable/antd": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/chakra": minor
"@adapttable/radix": minor
"@adapttable/base-ui": minor
"@adapttable/unstyled": minor
"@adapttable/shadcn": minor
---

The grouping panel now lists every active aggregation as its own item, driven
by a column's `aggregatable` declaration. Developer defaults appear immediately;
Add aggregation column sits on its own row under the grouping chips;
Restore defaults appears only when the developer sent a baseline the reader
changed; a stale or disallowed operation is refused at execution, not only in
the picker.
