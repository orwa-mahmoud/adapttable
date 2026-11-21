---
"@adapttable/ai": minor
"@adapttable/ai-react": patch
"@adapttable/ai-vue": patch
"@adapttable/ai-angular": patch
---

A table agent loads the WebMCP registrar only when it sets `webmcp`. The controller is also on the new `@adapttable/ai/agent` entry, which the React, Vue and Angular bindings now use, so `tableAgent` starts 0.54–0.58 KiB smaller in each framework and the registrar arrives as a 1.1 KiB chunk the first time a table offers itself to a page agent.
