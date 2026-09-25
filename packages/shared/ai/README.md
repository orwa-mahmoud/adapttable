# `@adapttable/ai`

[![AdaptTable AI — ask the table to filter, group, and aggregate](https://adapttable.orwamahmoud.com/media/ai/demo.gif)](https://adapttable.orwamahmoud.com/react/demo/mantine/ai/)

Provider-neutral context and execution for a live AdaptTable. Expose what this
table can do **right now**, then execute the agent's commands against that
contract. `catalog` and `describe` support discovery when more guidance is
needed; they are not mandatory extra model calls before every action.
No model SDK is bundled.
`@adapttable/core`, the adapter roots and `@adapttable/server` do not
import this package.

```bash
npm install @adapttable/ai
```

```ts
import { createAgentSession } from "@adapttable/ai";
import { tableAgent } from "@adapttable/ai-react";
```

For React, install `@adapttable/ai-react` and compose
`tableAgent({ tableId, bridge, writePolicy, approval, commit, columns })`.
Use the kit's `agentApproval()` surface or supply your own approval handler.
`approval` defaults to `"writes"`;
`commit` defaults to `"stage"`. The root import stays React-free so a
backend worker can speak the same three calls.

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

## Integration levels

1. **Custom bridge** — map any agent action onto
   `session.execute(key, args, expectedRevision, idempotencyKey)`. Bind the
   revision to the view the agent received, not a fresh revision read when its
   command arrives. Keep the same identity when retrying the same action.
2. **`AgentEnvelope`** — carry the versioned envelope on your transport,
   then `parseEnvelope` / `executeEnvelope`.
3. **JSON / OpenAI / MCP helpers** — from your own runtime. LangChain may
   consume JSON tools. It is not an AdaptTable dependency.

Execution never requires another model call. Returning `ExecuteResult` to
a model is an application choice. No prescribed chat-response wrapper or
assistant widget is required.

`buildAgentContext` on `/context` offers compact and full context profiles.
Provide the enabled input guidance up front for ordinary actions; load further
descriptions only when needed. The same executor serves the ready assistant
and an existing agent or custom interface.

```ts
import { toJsonTools, executeEnvelope } from "@adapttable/ai/json";
import { toOpenAITools } from "@adapttable/ai/openai";
import { toMcpTools, toMcpResources, mcpListChanged } from "@adapttable/ai/mcp";
```

- `@adapttable/ai/json` — plain JSON function tools + `AgentEnvelope`
- `@adapttable/ai/openai` — strict function tools with OpenAI-safe names (`view_setPage`); `{ deferred: true }` is the portable trio
- `@adapttable/ai/mcp` — tools in catalog order with derived annotations, per-key guide resources, list-changed
- `@adapttable/ai/mcp-apps` — the table as a view an MCP host embeds
- `@adapttable/ai/http` — optional endpoint client and `agentSystemPrompt`; [connect a backend](https://adapttable.orwamahmoud.com/ai-http/)
- `@adapttable/ai/context` — the permitted context contract, and bounded column sampling
- `@adapttable/ai/assistant` — the conversation lifecycle, with no framework
- `@adapttable/ai/voice` — dictation, in the browser or through a backend
- `@adapttable/ai/webmcp` — the table as browser tools for an agent in the page
- `@adapttable/ai/ag-ui` — the table as an AG-UI run's frontend tools
- `@adapttable/ai/ai-sdk` — the table as AI SDK client tools

`tableAgent` and `useTableAssistant` are `@adapttable/ai-react`. Everything
above is React-free.

The catalog lists only enabled features, permissions, source support and
host callbacks. A filtering + pagination table does not advertise
editing, grouping or pivoting.

## See it work

Ask the live table — the assistant runs the same capabilities the page
already wired.

**Filter, sort, and page size** — active people, salary high first, then 10 rows a page

![filter-sort](https://adapttable.orwamahmoud.com/media/ai/parts/filter-sort.gif)

**Group and aggregate** — group by team, average then min salary, then only active

![group-average](https://adapttable.orwamahmoud.com/media/ai/parts/group-average.gif)

**Date range** — only rows that started between 2020 and 2022

![date-range](https://adapttable.orwamahmoud.com/media/ai/parts/date-range.gif)

**Column management** — hide Person, show it again, Status first, then pin it

![column-management](https://adapttable.orwamahmoud.com/media/ai/parts/column-management.gif)

Try the [interactive playground](https://adapttable.orwamahmoud.com/react/demo/mantine/ai/)
(no credentials). Guide:
[agent integrations](https://adapttable.orwamahmoud.com/ai-integrations/).

Docs: [capability contract](https://adapttable.orwamahmoud.com/react/agent-capabilities/) ·
[reference](https://adapttable.orwamahmoud.com/ai/).
