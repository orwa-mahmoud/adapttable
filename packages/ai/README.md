# `@adapttable/ai`

Provider-neutral capability discovery for a live AdaptTable. An agent asks
what this table can do **right now**, then `catalog` / `describe` /
`execute` against that contract. No model SDK is bundled.
`@adapttable/core`, the adapter roots and `@adapttable/server` do not
import this package.

```bash
npm install @adapttable/ai
```

```ts
import { createAgentSession } from "@adapttable/ai";
import { tableAgent } from "@adapttable/ai/react";
```

Compose `tableAgent({ tableId, bridge, writePolicy, approval, commit, columns })`
next to `agentApproval()` from the kit. `approval` defaults to `"writes"`;
`commit` defaults to `"stage"`. The root import stays React-free so a
backend worker can speak the same three calls.

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

## Integration levels

1. **Custom bridge** — map any agent action onto `session.execute(key, args)`.
2. **`AgentEnvelope`** — carry the versioned envelope on your transport,
   then `parseEnvelope` / `executeEnvelope`.
3. **JSON / OpenAI / MCP helpers** — from your own runtime. LangChain may
   consume JSON tools. It is not an AdaptTable dependency.

Execution never requires another model call. Returning `ExecuteResult` to
a model is an application choice. There is no chat-response wrapper.

```ts
import { toJsonTools, executeEnvelope } from "@adapttable/ai/json";
import { toOpenAITools } from "@adapttable/ai/openai";
import { toMcpTools, toMcpResources, mcpListChanged } from "@adapttable/ai/mcp";
```

- `@adapttable/ai/json` — plain JSON function tools + `AgentEnvelope`
- `@adapttable/ai/openai` — strict function tools with OpenAI-safe names (`view_setPage`); `{ deferred: true }` is the portable trio
- `@adapttable/ai/mcp` — tools in catalog order, per-key guide resources, list-changed
- `@adapttable/ai/http` — optional endpoint client and `agentSystemPrompt`; [connect a backend](https://orwa-mahmoud.github.io/adapttable/ai-http/)

The catalog lists only enabled features, permissions, source support and
host callbacks. A filtering + pagination table does not advertise
editing, grouping or pivoting.

Try the [interactive playground](https://orwa-mahmoud.github.io/adapttable/demo/mantine/ai/)
(no credentials). Guide:
[agent integrations](https://orwa-mahmoud.github.io/adapttable/ai-integrations/).

Docs: [capability contract](https://orwa-mahmoud.github.io/adapttable/agent-capabilities/) ·
[reference](https://orwa-mahmoud.github.io/adapttable/ai/).
