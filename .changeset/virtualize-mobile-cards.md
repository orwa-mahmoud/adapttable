---
"@adapttable/core": minor
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/radix": patch
"@adapttable/unstyled": patch
---

Virtualize the mobile card list through the same `virtualize` switch as desktop rows. Cards attach the `maxHeight` scroll box, measure their own height (including nested row detail), and never dump the whole dataset while the window is empty. `bindMobileCardList` / `mobileCardListStyle` are the adapter helpers.
