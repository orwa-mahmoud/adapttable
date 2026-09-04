# Examples

Drop-in example components for each AdaptTable adapter. Each file is a
complete, copy-pasteable React component — wrap it in your kit's provider
(`MantineProvider`, `ThemeProvider`, `ChakraProvider`) and render it.

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
| [radix-basic.tsx](./radix-basic.tsx)                       | `@adapttable/radix`    | Radix Themes: theme-driven appearance            |
| [base-ui-basic.tsx](./base-ui-basic.tsx)                   | `@adapttable/base-ui`  | Base UI primitives, self-injected styles         |
| [shadcn-basic.tsx](./shadcn-basic.tsx)                     | `@adapttable/shadcn`   | shadcn/ui tokens, no provider                    |
| [unstyled-tailwind.tsx](./unstyled-tailwind.tsx)           | `@adapttable/unstyled` | Tailwind classes + RTL/i18n                      |
| [headless.tsx](./headless.tsx)                             | `@adapttable/core`     | Fully custom markup via prop-getters             |
| [ai-custom-bridge.ts](./ai-custom-bridge.ts)               | `@adapttable/ai`       | Any agent format → `session.execute`             |
| [ai-one-call.ts](./ai-one-call.ts)                         | `@adapttable/ai/json`  | Text + actions, no model round trip              |
| [ai-result-return.ts](./ai-result-return.ts)               | `@adapttable/ai/json`  | Optional ExecuteResult return loop               |
| [ai-server-agent.ts](./ai-server-agent.ts)                 | `@adapttable/ai`       | Node session, envelope HTTP, salary idempotency  |
| [ai-mcp-host.ts](./ai-mcp-host.ts)                         | `@adapttable/ai/mcp`   | MCP tools, resources, list-changed               |
| [ai-browser-agent.tsx](./ai-browser-agent.tsx)             | `@adapttable/ai/react` | JSON tools, capability growth, stage vs commit   |
| [ai-http-backend.ts](./ai-http-backend.ts)                 | `@adapttable/ai/http`  | Runnable OpenAI/Anthropic/Gemini/DeepSeek server |

Install the packages for the example you want (see each adapter's README),
then paste the file into your app.
