---
"@adapttable/antd": patch
"@adapttable/react": patch
---

A paged antd table no longer remounts on every render: a batch-edit field keeps focus and its typing, and scroll position holds. The windowed row and column counts a paged table reports are now built once per table shape in every kit.
