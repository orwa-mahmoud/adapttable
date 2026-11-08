---
"@adapttable/react": patch
---

`DesktopTableStructure` and `MobileCardsStructure` draw the same desktop table and mobile card list as `DesktopTableChrome` and `MobileCardsChrome`. A kit calls the short fields so a plain table does not carry the readable prop names. The readable functions still accept those names and forward them.
