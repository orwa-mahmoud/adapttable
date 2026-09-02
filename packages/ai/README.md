# `@adapttable/ai`

Provider-neutral capability discovery for a live AdaptTable. An agent asks
what this table can do **right now**, then `catalog` / `describe` / `execute`
against that contract. No model SDK is bundled. `@adapttable/core`, the
adapter roots and `@adapttable/server` do not import this package.

```bash
npm install @adapttable/ai
```

```ts
import { createAgentSession } from "@adapttable/ai";
import { tableAgent } from "@adapttable/ai/react";
```

Compose `tableAgent({ tableId, bridge, writePolicy, columns })` in the
table's `features` array. The root import stays React-free so a backend
worker can speak the same three calls.

## Integrations

The same session maps onto provider tools without a model SDK. Tool
`name` is the capability key. `execute` still owns validation.

```ts
import { toJsonTools, executeEnvelope } from "@adapttable/ai/json";
import { toOpenAITools } from "@adapttable/ai/openai";
import { toMcpTools, toMcpResources, mcpListChanged } from "@adapttable/ai/mcp";
```

- `@adapttable/ai/json` — plain JSON function tools + `AgentEnvelope`
- `@adapttable/ai/openai` — strict function tools; `{ deferred: true }` is the portable trio
- `@adapttable/ai/mcp` — tools in catalog order, per-key guide resources, list-changed

See [agent integrations](https://orwa-mahmoud.github.io/adapttable/ai-integrations/).

Docs: [capability contract](https://orwa-mahmoud.github.io/adapttable/agent-capabilities/) ·
[reference](https://orwa-mahmoud.github.io/adapttable/ai/).
