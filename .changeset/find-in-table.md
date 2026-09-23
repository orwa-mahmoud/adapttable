---
"@adapttable/react": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/chakra": minor
"@adapttable/antd": minor
"@adapttable/radix": minor
"@adapttable/base-ui": minor
"@adapttable/shadcn": minor
"@adapttable/unstyled": minor
---

`standardFeatures({ findButton: true })` draws the toolbar Find control; without it the preset is unchanged. Ctrl/Cmd+F opens find after a click inside the table, even on a cell that takes no focus, and a click elsewhere hands the shortcut back to the browser. With `virtualize()`, find brings a match outside the window into view; Ant Design’s desktop table virtualizes through antd and is not covered.
