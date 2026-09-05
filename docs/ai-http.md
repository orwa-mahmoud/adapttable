# Connect a backend — AdaptTable AI HTTP

This is the setup page for a real model behind a live table. The [interactive
playground](https://orwa-mahmoud.github.io/adapttable/demo/mantine/ai/)
defaults to **Simulated**: local scripted buttons, no credentials, no network
model call. Switch to **Connect backend**, paste an endpoint, and the same
`tableAgent` session sends compact capabilities and executes returned actions.

A recorded walkthrough of this page will land here when it exists. Absence of
that video is not a missing feature.

`@adapttable/ai` stays provider-neutral. It does not ship a model SDK, an API
key field, or a hosted AdaptTable service. Provider selection lives in your
backend, or in the example server below.

## What the table does automatically

On each request the HTTP bridge sends:

- the compact [manifest](./ai.md) (enabled keys, column permissions, revision,
  write/approval/commit policy — never the dataset)
- the live catalog (key + one-line summary)
- the user message

It does **not** preload every capability guide. If the backend responds with
`needs.describe` or `needs.read`, the bridge answers those through
`session.describe` and `rows.read` (so unreadable columns stay redacted and
`readMax` still applies), then continues the same turn.

Returned `actions` run through `session.execute`. Revision checks, permissions,
approval chrome, commit policy and idempotency stay on the session. The bridge
never retries a mutation on its own.

Text plus actions is a complete turn. A second model call is not required to
say “done.” Sending execute receipts back is optional (`continueWithResults`
on the response, `returnResults` on the client).

## Path 1 — run our example

Prerequisites: Node 22.6 or newer (the example runs TypeScript directly with
`--experimental-strip-types`) and `pnpm install` at the repository root.

From this repository:

```bash
cp -n examples/ai-http-backend.env.example examples/.env.ai-http
```

`-n` keeps an env file you already filled in — the copy is skipped rather
than overwritten.

Edit `examples/.env.ai-http`. Set `AGENT_PROVIDER` to `openai`,
`anthropic`, `gemini` or `deepseek`, and the matching API key. Never commit
the filled file.

```bash
pnpm --filter @adapttable/ai build
pnpm --filter @adapttable/examples ai-http
```

The server refuses to start on a configuration it cannot use: an
`AGENT_PORT` that is not a port, an empty `AGENT_HOST` or `AGENT_MODEL`, an
unknown `AGENT_PROVIDER`, or a provider whose API key is missing. Each of
those exits with the name of the variable to fix.

The process binds `127.0.0.1` on port `8787` by default. A non-loopback
`AGENT_HOST` requires `AGENT_HTTP_TOKEN`.

**Local showcase (reliable).** Hosted GitHub Pages cannot be assumed to reach
`localhost` — browsers treat that as a cross-origin public-site request, and
many block it. Run the showcase on the same machine:

```bash
pnpm --filter @adapttable/showcase dev
```

Open `/mantine/ai/` (or any adapter AI page). Choose **Connect backend**. The
URL defaults to `http://127.0.0.1:8787`. If the example set
`AGENT_HTTP_TOKEN`, paste that same value into **Endpoint token** (Bearer
for the HTTP endpoint — not a provider API key). Click **Connect**. A valid
hello body is required; a random 200 is a failure. Then type a message and
**Send**. Writes still go through that kit’s approval and staged-save chrome.

**Hosted showcase.** Deploy the example with HTTPS, set
`AGENT_ALLOWED_ORIGINS` to `https://orwa-mahmoud.github.io`, set
`AGENT_HTTP_TOKEN` and a non-loopback `AGENT_HOST`, then paste the public
URL and the same endpoint token into Connect backend. Do not point the
hosted page at `localhost`.

### Environment

See [ai-http-backend.env.example](../examples/ai-http-backend.env.example).

Values are read in this order, and the first one that sets a key wins:

1. the real process environment — no file overrides what the shell, the
   container or the CI runner already set;
2. the file named by `AGENT_ENV_FILE`;
3. `.env.ai-http` beside the example;
4. `.env` in the working directory.

Files are parsed by Node itself (`process.loadEnvFile`), not a bespoke
reader.

| Variable                                                                       | Role                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `AGENT_PROVIDER`                                                               | `openai` (default), `anthropic`, `gemini`, or `deepseek`           |
| `AGENT_MODEL`                                                                  | Optional override. Each provider has a default.                    |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` | Server-side only                                                   |
| `AGENT_HTTP_TOKEN`                                                             | Required when `AGENT_HOST` is not loopback. Bearer on the endpoint |
| `AGENT_HOST`                                                                   | Bind address. Default `127.0.0.1`                                  |
| `AGENT_ENV_FILE`                                                               | Optional extra env file. Existing process.env keys win             |
| `AGENT_ALLOWED_ORIGINS`                                                        | Comma-separated origins. Defaults to local showcase ports          |
| `AGENT_PORT`                                                                   | Default `8787`                                                     |
| `AGENT_MAX_BODY`                                                               | Default `65536` bytes                                              |

`AGENT_ALLOWED_ORIGINS` is a CORS list. CORS is a browser convenience, not
authentication: it tells a browser which pages may read the response, and
nothing at all to curl, a script, or any non-browser client. `AGENT_HTTP_TOKEN`
is what actually authenticates a caller — set it on every bind you do not
fully control.

The example does not log credentials or table contents. It is not an open
proxy: it only calls the configured provider.

### Add another provider

Implement a `complete({ system, user, signal })` that returns a JSON string,
then register it in `completeForProvider`. Arbitrary provider names do not
work without that adapter.

## Path 2 — connect an existing backend

Implement the protocol below, or adapt your agent runtime so it emits the
same JSON. The showcase and `createAgentHttpClient` need no custom glue
when the body matches.

```ts
import { createAgentHttpClient } from "@adapttable/ai/http";

const client = createAgentHttpClient({
  endpoint: "https://your.example/agent",
  headers: () => ({ authorization: `Bearer ${token}` }),
  timeoutMs: 20_000,
});

await client.connect(session);
const { text, results } = await client.send(session, "Filter the Core team");
```

You can still use your own transport, tool definitions and response
transform — this client is optional. See [agent integrations](./ai-integrations.md).

## Protocol

`POST` JSON. Schema family: `adapttable.agent.v1`.

**Hello** (Connect). The client sends `kind: "hello"` plus `tableId`,
`manifest` and `catalog`. The server must return the same `schemaVersion`.
`ok: false` is a rejected hello.

**Turn.** `kind: "turn"` and a `message` string. Optional `conversation`,
`descriptions`, `rows`, and `results` appear only when the host is answering
a previous `needs` or continuing with receipts.

**Response.**

```ts
{
  schemaVersion: "adapttable.agent.v1",
  text?: string,
  actions?: { key, args, idempotencyKey, expectedRevision? }[],
  needs?: { describe?: string[], read?: { offset, limit, columns?, scope? }[] },
  continueWithResults?: boolean
}
```

`idempotencyKey` is required on every action so a client retry cannot mint a
new write. `needs` is how progressive discovery works — do not preload every
guide to skip it.

Import `parseAgentHttpRequest` / `parseAgentHttpResponse` from
`@adapttable/ai/http` instead of duplicating the shape.

## Live provider test (owner)

Automated checks use mocked providers and never spend money. To try a real
model: fill `examples/.env.ai-http`, start the example with
`pnpm --filter @adapttable/examples ai-http`, run the local
showcase, Connect, and send a message. That live test is yours.
