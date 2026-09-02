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

Docs: [capability contract](https://orwa-mahmoud.github.io/adapttable/agent-capabilities/) ·
[reference](https://orwa-mahmoud.github.io/adapttable/ai/).
