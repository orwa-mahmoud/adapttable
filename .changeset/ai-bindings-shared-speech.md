---
"@adapttable/ai-react": patch
"@adapttable/ai-vue": patch
"@adapttable/ai-angular": patch
---

Dictation and the assistant run on the shared `@adapttable/ai` speech session and assistant helpers, so all three bindings behave the same: choosing a dictation language with voice off writes nothing, and a panel inside the table reports a write waiting on the reader as awaiting approval without the host passing `awaitingApproval`.
