---
"@adapttable/ai": minor
"@adapttable/ai-react": minor
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/i18n": minor
---

A backend-mode voice clip can be the assistant's turn: `useSpeechInput({ onClip: assistant.sendClip })` sends it through the HTTP transport on the turn's first round, and the backend's `transcript` becomes the reader's message, with a localized "Voice message" placeholder until it arrives. `createAgentHttpClient().send` takes `audio` and `onTranscript`, and `AssistantTransport.send` receives `audio`.
