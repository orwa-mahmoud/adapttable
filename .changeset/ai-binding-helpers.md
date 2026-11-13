---
"@adapttable/ai": minor
---

New framework-binding helpers, so every binding shares one implementation:

- `createSpeechSession` (`@adapttable/ai/voice`) is dictation for one composer: it keeps the listening microphone while the mode and offered languages stand, replaces it when they change, and publishes the view a composer draws. `speechLanguages`, `speechSessionKey` and `SPEECH_UNSUPPORTED` come with it.
- `tableAssistantInputs`, `tableAssistantFields` and `assistantUndoView` (`@adapttable/ai/assistant`) map a binding's options and the table's feature state to the conversation store, and the store's snapshot to what a panel renders.
