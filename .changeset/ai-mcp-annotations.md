---
"@adapttable/ai": minor
---

MCP tools now carry annotations a host can act on: read-only, destructive,
idempotent and open-world hints, each derived from what the capability
declares. `toMcpToolList` and `toMcpResourceList` return the same lists as
cacheable responses stamped with the contract they describe, and
`mcpToolResult` keeps the provenance envelope on a row window.
