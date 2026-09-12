---
"@adapttable/ai": minor
---

New optional subpaths. `@adapttable/ai/context` builds the permitted context a
model is given and samples column values on request; `@adapttable/ai/assistant`
runs the conversation with no framework; `@adapttable/ai/voice` handles
dictation in the browser or through a backend. Four protocol adapters speak
someone else's protocol and end in the same executor:
`@adapttable/ai/webmcp` for an agent in the page, `@adapttable/ai/ag-ui`,
`@adapttable/ai/ai-sdk` for AI SDK client tools, and
`@adapttable/ai/mcp-apps` for the table as a view an MCP host embeds. None adds
an SDK dependency.
