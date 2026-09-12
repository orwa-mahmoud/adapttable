---
"@adapttable/ai": minor
"@adapttable/ai-react": minor
"@adapttable/cli": patch
---

Ship `tableAgent` and `useTableAssistant` from `@adapttable/ai-react`.
`@adapttable/ai` stays React-free. `adapttable migrate` rewrites the old
`@adapttable/ai/react` specifier, and moves the React hook out of
`@adapttable/ai/assistant` while leaving the neutral store there.
