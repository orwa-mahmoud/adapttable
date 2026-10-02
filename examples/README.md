# Examples

Drop-in example components for each AdaptTable adapter. Each file is a
complete, copy-pasteable component that renders its kit's provider
(`MantineProvider`, `ChakraProvider`, `ConfigProvider`, Radix `Theme`) where
the kit needs one — render it as it is.

| File                                                       | Adapter                | Shows                                            |
| ---------------------------------------------------------- | ---------------------- | ------------------------------------------------ |
| [mantine-basic.tsx](./mantine-basic.tsx)                   | `@adapttable/mantine`  | Zero ceremony: `data` + bare-key columns         |
| [mantine-filters.tsx](./mantine-filters.tsx)               | `@adapttable/mantine`  | Declarative filters (widget+chip+URL from one)   |
| [mantine-custom-filters.tsx](./mantine-custom-filters.tsx) | `@adapttable/mantine`  | The escape hatch: your own form + `filterFn`     |
| [mantine-columns.tsx](./mantine-columns.tsx)               | `@adapttable/mantine`  | Column menu, reorder, pin, resize                |
| [mantine-server.tsx](./mantine-server.tsx)                 | `@adapttable/mantine`  | Server data via `onQueryChange` (no library)     |
| [mantine-power.tsx](./mantine-power.tsx)                   | `@adapttable/mantine`  | Groups, row details, summary, multi-sort         |
| [mui-query-source.tsx](./mui-query-source.tsx)             | `@adapttable/mui`      | Server pagination with TanStack Query            |
| [chakra-selection.tsx](./chakra-selection.tsx)             | `@adapttable/chakra`   | Selection + bulk actions                         |
| [antd-basic.tsx](./antd-basic.tsx)                         | `@adapttable/antd`     | AntD table, dark mode, row actions               |
| [antd-server.tsx](./antd-server.tsx)                       | `@adapttable/antd`     | Server data via `onQueryChange` (no library)     |
| [radix-basic.tsx](./radix-basic.tsx)                       | `@adapttable/radix`    | Radix Themes: theme-driven appearance            |
| [base-ui-basic.tsx](./base-ui-basic.tsx)                   | `@adapttable/base-ui`  | Base UI primitives, self-injected styles         |
| [shadcn-basic.tsx](./shadcn-basic.tsx)                     | `@adapttable/shadcn`   | shadcn/ui tokens, no provider                    |
| [unstyled-tailwind.tsx](./unstyled-tailwind.tsx)           | `@adapttable/unstyled` | Tailwind classes + RTL/i18n                      |
| [headless.tsx](./headless.tsx)                             | `@adapttable/react`    | Fully custom markup via prop-getters             |
| [ai-custom-bridge.ts](./ai-custom-bridge.ts)               | `@adapttable/ai`       | Any agent format → `session.execute`             |
| [ai-one-call.ts](./ai-one-call.ts)                         | `@adapttable/ai/json`  | Text + actions, no model round trip              |
| [ai-result-return.ts](./ai-result-return.ts)               | `@adapttable/ai/json`  | Optional ExecuteResult return loop               |
| [ai-server-agent.ts](./ai-server-agent.ts)                 | `@adapttable/ai`       | Node session, envelope HTTP, salary idempotency  |
| [ai-mcp-host.ts](./ai-mcp-host.ts)                         | `@adapttable/ai/mcp`   | MCP tools, resources, list-changed               |
| [ai-browser-agent.tsx](./ai-browser-agent.tsx)             | `@adapttable/ai-react` | JSON tools, capability growth, stage vs commit   |
| [ai-http-backend.ts](./ai-http-backend.ts)                 | `@adapttable/ai/http`  | Runnable OpenAI/Anthropic/Gemini/DeepSeek server |

Install the packages for the example you want (see each adapter's README),
then paste the file into your app.

## Angular AI integrations

These standalone Angular components mount the real unstyled table through
[angular-ai-table.ts](./angular-ai-table.ts). Copy that shared component and
one example into your Angular app, import the example component, then click
**Run example**. Every transport gets the session from `tableAgent`'s live
`bridge.attach`; none creates a separate table or a synthetic session.

Install `@adapttable/angular`, `@adapttable/angular-unstyled`,
`@adapttable/ai-angular` and `@adapttable/ai`. Local recorded responses make
these examples work without API keys; replace the documented connection seam
with your own backend. Never put model-provider credentials in browser code.

| File                                                         | Integration             | Shows                                                     |
| ------------------------------------------------------------ | ----------------------- | --------------------------------------------------------- |
| [angular-ai-one-call.ts](./angular-ai-one-call.ts)           | JSON                    | One validated envelope filters the rendered rows          |
| [angular-ai-browser-agent.ts](./angular-ai-browser-agent.ts) | OpenAI + JSON discovery | Eager function tools and a real table sort                |
| [angular-ai-http-stream.ts](./angular-ai-http-stream.ts)     | HTTP streaming          | SSE text, ordered calls, abort on destroy                 |
| [angular-ai-http-pins.ts](./angular-ai-http-pins.ts)         | HTTP contract pins      | Acknowledged contract, fresh live view per turn           |
| [angular-ai-mcp-host.ts](./angular-ai-mcp-host.ts)           | MCP                     | Tools, capability resources and execution receipts        |
| [angular-ai-mcp-apps.ts](./angular-ai-mcp-apps.ts)           | MCP Apps                | View resource, origin-checked bridge and host events      |
| [angular-ai-webmcp.ts](./angular-ai-webmcp.ts)               | WebMCP                  | Register browser tools and unregister on destroy          |
| [angular-ai-agui-host.ts](./angular-ai-agui-host.ts)         | AG-UI                   | Frontend tool events and host result reporting            |
| [angular-ai-sdk-route.ts](./angular-ai-sdk-route.ts)         | AI SDK                  | Client tool declaration, execution and route continuation |
