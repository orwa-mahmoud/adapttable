---
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/antd": patch
---

An active-filter chip's remove control is a button in the accessibility tree
and in the tab order: screen readers announce it as "Clear all: <chip>", and
Tab reaches it so Enter or Space removes that filter.
