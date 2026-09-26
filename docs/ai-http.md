# React table AI backend — HTTP protocol and local example

This is the setup page for a real model behind a live table. The [interactive
playground](https://adapttable.orwamahmoud.com/react/demo/mantine/ai/)
defaults to **Simulated demo**: local scripted buttons, no credentials, no
network model call. Switch to **Try it for real**, paste an endpoint, and the same
`tableAgent` session sends the permitted context and executes the calls that come back.

`@adapttable/ai` stays provider-neutral. It does not ship a model SDK, an API
key field, or a hosted AdaptTable service. Provider selection lives in your
backend, or in the example server below.

## What the table does automatically

On each request the HTTP bridge sends:

- the [permitted context](./ai.md#what-the-agent-is-told) — the contract
  (capabilities, column permissions, filters, limits, write/approval/commit
  policy) and the view (page, size, search, sort, grouping, filter state);
  never the dataset
- the user message, and the conversation so far

How much of each capability's guide travels is the **profile**. `compact`
names every capability and explains the ones a turn is likely to need;
anything else is asked for on demand, in one batched round rather than a
request per key, and cached per connection and contract version. `full` sends
every guide up front. Neither changes what the table permits — only how much
explaining arrives before it is asked for. `full` is the default; a client sets
`compact` with `context: { profile: "compact" }` on `createAgentHttpClient` or
`assistantHttpTransport`.

A backend that asks for a guide or a row window puts that in `toolCalls`
alongside anything it wants run; the bridge answers through `session.describe`
and `rows.read`, so an unreadable column stays redacted and `readMax` still
applies, then continues the same turn.

Returned calls run through `session.execute`. Revision checks, permissions,
approval chrome, commit policy and idempotency stay on the session, and the
replay identity is the bridge's own — a backend cannot mint a second write by
repeating one. The bridge never retries a mutation.

Text plus calls is a complete turn. A second model call is not required to say
“done.” Sending execute receipts back is optional (`continueWithResults` on the
response, `returnResults` on the client).

## Path 1 — run our example

Prerequisites: Node 22.12 or newer (the example runs TypeScript directly with
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
`AGENT_PORT` that is not a whole number between 1 and 65535, an
`AGENT_MAX_BODY` that is not a positive whole number of bytes, an empty
`AGENT_HOST` or `AGENT_MODEL`, an
unknown `AGENT_PROVIDER`, or a provider whose API key is missing. Each of
those exits with the name of the variable to fix.

The process binds `127.0.0.1` on port `8787` by default. A non-loopback
`AGENT_HOST` requires `AGENT_HTTP_TOKEN`.

**Local showcase (reliable).** The hosted site cannot be assumed to reach
`localhost` — browsers treat that as a cross-origin public-site request, and
many block it. Run the showcase on the same machine:

```bash
pnpm --filter @adapttable/showcase dev
```

Open `/mantine/ai/` (or any adapter AI page). Choose **Try it for real**. The
URL defaults to `http://127.0.0.1:8787`. If the example set
`AGENT_HTTP_TOKEN`, paste that same value into **Endpoint token** (Bearer
for the HTTP endpoint — not a provider API key). Click **Connect**. A valid
hello body is required; a random 200 is a failure. Then type a message and
**Send**. Writes still go through that kit’s approval and staged-save chrome.

**Hosted showcase.** Deploy the example with HTTPS, set
`AGENT_ALLOWED_ORIGINS` to `https://adapttable.orwamahmoud.com`, set
`AGENT_HTTP_TOKEN` and a non-loopback `AGENT_HOST`, then paste the public
URL and the same endpoint token into the connect dialog. Do not point the
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

Implement an `ExampleComplete` —
`({ system, user, history, signal }, onDelta?) => Promise<string>`, resolving
with the JSON reply and calling `onDelta` with each fragment when streaming —
then register it in `completeForProvider`. Arbitrary provider names do not
work without that adapter.

## Path 2 — connect an existing backend

Implement the protocol below, or adapt your agent runtime so it emits the
same JSON. The showcase and `createAgentHttpClient` need no custom glue
when the body matches.

Junior backends import `agentSystemPrompt` and send that string as the
model system prompt. Senior backends skip it and keep their own prompt
or tools. The example calls the export; it does not keep a private copy
of the skill text.

```ts
import { agentSystemPrompt, createAgentHttpClient } from "@adapttable/ai/http";

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

`POST` JSON. Schema family: `adapttable.agent.v1`. Import
`parseAgentHttpRequest` / `parseAgentHttpResponse` from `@adapttable/ai/http`
rather than duplicating the shape; both refuse an unknown `schemaVersion`.

### Request

| Field              | When                                              | What                                                                                       |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `schemaVersion`    | always                                            | `"adapttable.agent.v1"`                                                                    |
| `kind`             | always                                            | `"hello"`, `"schema"` or `"turn"`                                                          |
| `tableId`          | always                                            | The table's identity                                                                       |
| `context`          | hello, schema, and every turn when pinning is off | `{ contract, selection }` — what this table permits, and what was selected from it         |
| `contractVersion`  | with `context`                                    | Names everything the contract says                                                         |
| `selectionVersion` | with `context`                                    | Names what was selected from it                                                            |
| `sessionId`        | after a hello                                     | The pin the backend handed back                                                            |
| `viewRevision`     | a pinned turn                                     | The revision the contract was read at                                                      |
| `view`             | every turn                                        | Where the table is **now** — page, size, search, sort, grouping and permitted filter state |
| `message`          | a turn                                            | What the reader said                                                                       |
| `conversation`     | a turn                                            | Earlier exchanges, oldest first                                                            |
| `toolResults`      | a continuation                                    | Results for calls the client just ran                                                      |
| `audio`            | a voice turn                                      | One clip, travelling once                                                                  |
| `manifest`         | hello, schema, and every unpinned turn            | Compact capability snapshot; required on hello and schema                                  |
| `catalog`          | hello, schema, and every unpinned turn            | Enabled keys and one-line summaries; required on hello and schema                          |
| `turnId`           | a turn                                            | Stable identity of this send across its phases                                             |
| `phaseId`          | a turn                                            | Monotonic position of this phase within the turn                                           |
| `pendingCalls`     | a continuation                                    | The calls this phase has proposed so far                                                   |

The contract and the view move on different clocks, which is why they are
separate fields: pinning the contract does not pin the view, and a backend
answering a turn is always answering against the view in that request.

### Response

```ts
{
  schemaVersion: "adapttable.agent.v1",
  ok?: boolean,               // hello / health only
  sessionId?: string,
  text?: string,
  toolCalls?: { id, name, args?, expectedRevision? }[],
  askUser?: { id, question, options?, allowFreeText },
  transcript?: string,        // what the backend heard, on a voice turn
  pin?: { status, contractVersion?, ttlMs? },
  continueWithResults?: boolean
}
```

**`toolCalls`** is one list, whether a call runs a capability or asks for
something: `name` is a capability key, or `describe` / `read`. A call's `id`
is a correlation handle unique within the reply — it is **not** the replay
identity. The client issues that itself, from the table, the turn, the phase
and the call's position, so a backend cannot mint a second write by repeating
a string.

**`expectedRevision`** is optional. Omitted means the view this request
described, which is the ordinary case; a backend that names one is answering
for a revision it observed itself, and a stale call is refused with
`revision-mismatch` rather than rebased onto the live table.

**`askUser`** puts a structured question to the reader instead of asking in
prose. The turn stops at that call and resumes when they answer; the answer
returns as that call's `toolResults` entry. A client with nowhere to draw one
reports `unresolved` with code `no-reader-channel` and still says what already
ran, and a reader who declines reports code `question-unanswered` — different
facts.

**`pin`** is the backend's answer about the contract it was sent:
`acknowledged` (and only that) pins something; `expired` and `unknown` say a
pin it once held is gone, which is recoverable by resending the contract;
`unsupported` says this backend does not pin at all. A backend that echoes a
different `contractVersion`, or none, is not pinned and keeps being sent the
contract. None of these is ever the answer to a call whose outcome is unknown:
a write is never retried.

### Discovery

A turn that needs a guide asks for it in the same `toolCalls` list, and the
client answers in one batched round rather than one request per key. Guides
are cached per connection and contract version, so a second turn that needs
the same guide does not ask again. Set `context: { profile: "compact" }` on the
client and let discovery do this; keep the default `full` when you would rather
pay the bytes up front.

### Streaming

Set `stream: true` on the client and it asks for `text/event-stream`;
`onStreamText(text)` receives the text so far. A backend that answers JSON is
used as-is. The same reply arrives as events:

- `text-delta` — a piece of the answer, as it is produced
- `transcript` — what the backend heard, on a voice turn
- `ask-user` — the structured question
- `tool-calls` — the calls, whole, exactly once
- `done` — the calls are final
- `error` — the turn failed; `{ code, message }`

The calls travel whole and only before `done`: a client that loses the
connection first has run nothing. A stream that ends without `done` is
reported as `stream-incomplete` rather than treated as a short answer.

### Voice

`@adapttable/ai/voice` has two modes. In **browser** mode the browser's speech
recognizer turns speech into the composer's draft — never a send, so a
misheard word is a typo the reader corrects. In **backend** mode one clip is
recorded and released from the microphone on stop, and `onClip` hands it to
the host. The wire contract carries it: a turn may send one `audio` clip
(`mimeType`, `base64`, `durationMs`) instead of `message`, and the reply may
name what the backend heard in `transcript`. The built-in client sends a clip
on the turn's first round only: `assistantHttpTransport` takes it from the
assistant's `sendClip`, and `createAgentHttpClient().send(session, "", { audio,
onTranscript })` takes it directly. Once a reply names the `transcript`, every
later round of the turn sends those words as `message`; a turn that needs
another round and never got a transcript stops with an error. The assistant
shows the transcript as the reader's own message. See
[voice input](./ai-voice.md#backend-mode).

### Any language

The wire is a wire. [`examples/ai-http-backend.py`](https://github.com/orwa-mahmoud/adapttable/blob/main/examples/ai-http-backend.py)
is the same contract in Python with no model and no framework — standard
library only, run through `uv`:

```bash
uv run --python 3.12 examples/ai-http-backend.py
```

It listens on `http://127.0.0.1:8788`, reads the contract out of the request,
decides one call, and answers in the shape above. Swap its `decide` for a real model call and nothing else changes.

The machine-readable schema and the general rules text are generated from
`AGENT_HTTP_LIMITS` and `agentInstructions` into `schemas/agent-http.v1.json`
and `docs/agent-rules.txt` — build the package and run
`node scripts/build-agent-schema.mjs`.

## Live provider test

Automated checks use mocked providers and never spend money. To try a real
model: fill `examples/.env.ai-http`, start the example with
`pnpm --filter @adapttable/examples ai-http`, run the local
showcase, connect, and send a message.
