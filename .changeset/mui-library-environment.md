---
"@adapttable/mui": patch
---

MUI tables follow `theme.direction` when it is right to left, on the server and in the browser. An explicit `dir` still wins. The default left-to-right theme stays unset so the page direction still applies. MUI has no app-wide locale, size or motion switch for the table.
