/**
 * Runnable AdaptTable AI backend — no SDK in `@adapttable/ai`.
 *
 * Provider keys stay in process.env. The frontend only sends the HTTP
 * protocol from `@adapttable/ai/http`. This file is the supported example
 * that the showcase "Connect backend" mode talks to.
 *
 * Needs Node 22.6+ (TypeScript runs through --experimental-strip-types) and
 * `pnpm install` at the repository root.
 *
 *   cp -n examples/ai-http-backend.env.example examples/.env.ai-http
 *   # fill AGENT_PROVIDER + the matching API key
 *   pnpm --filter @adapttable/examples ai-http
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  AGENT_HTTP_SCHEMA,
  type AgentContextView,
  type AgentHttpPinAck,
  type AgentHttpRequest,
  type AgentHttpResponse,
  agentSystemPrompt,
  type AgentSystemPromptInput,
  parseAgentHttpRequest,
  parseAgentHttpResponse,
} from "@adapttable/ai/http";

import { createExamplePinStore, EXAMPLE_PIN_TTL_MS } from "./ai-http-pins.ts";
import { createTextFieldReader, readSseData } from "./ai-http-stream.ts";

const examplePins = createExamplePinStore<
  NonNullable<AgentHttpRequest["context"]>,
  NonNullable<AgentHttpRequest["manifest"]>
>();

function pinExampleSchema(request: AgentHttpRequest): string {
  if (!request.context || !request.manifest) {
    throw new TypeError("hello / schema requires the table context");
  }
  const sessionId =
    request.sessionId ?? `sess_${randomBytes(8).toString("hex")}`;
  examplePins.set(sessionId, {
    tableId: request.tableId,
    catalog: request.context,
    manifest: request.manifest,
    contractVersion: request.contractVersion,
  });
  return sessionId;
}

/**
 * The view this request describes.
 *
 * Never taken from a pin: the contract is the part that holds still, and the
 * view is the part that does not. A request that names no view is answered
 * against a view that says so, rather than one invented from a revision.
 */
function requestView(request: AgentHttpRequest): AgentContextView {
  return (
    request.view ?? {
      revision: request.viewRevision ?? 0,
      page: 1,
      limit: 10,
      search: "",
      unknown: ["page", "limit", "search"],
    }
  );
}

/**
 * The contract to answer this turn with, and what to tell the client about it.
 *
 * A request that carries the contract is answered from it and pins it. One
 * that relies on a pin is answered from that pin only when the pin is this
 * session's AND names this table — a session id for another table is as much a
 * miss as no session at all, and saying so is what lets the client resend
 * rather than guess.
 */
function resolveExampleSchema(request: AgentHttpRequest): {
  readonly schema?: AgentSystemPromptInput;
  readonly pin: AgentHttpPinAck;
} {
  if (request.context && request.manifest) {
    pinExampleSchema(request);
    return {
      // The view is never pinned: it comes from THIS request, so a turn is
      // always answered against the table as it is now.
      schema: { context: { ...request.context, view: requestView(request) } },
      pin: {
        status: "acknowledged",
        ...(request.contractVersion
          ? { contractVersion: request.contractVersion }
          : {}),
        ttlMs: EXAMPLE_PIN_TTL_MS,
      },
    };
  }
  const pin = examplePins.get(request.sessionId);
  if (pin?.tableId !== request.tableId) {
    return { pin: { status: request.sessionId ? "expired" : "unknown" } };
  }
  return {
    schema: { context: { ...pin.catalog, view: requestView(request) } },
    pin: {
      status: "acknowledged",
      ...(pin.contractVersion ? { contractVersion: pin.contractVersion } : {}),
      ttlMs: EXAMPLE_PIN_TTL_MS,
    },
  };
}

/** Drop in-memory pins. Tests call this so one case cannot leak into the next. */
export function clearExampleAgentPins(): void {
  examplePins.clear();
}

/**
 * Read one `.env` file with Node's own parser. A variable already present in
 * the real environment wins, so nothing a file says can override what the
 * shell, the container or the CI runner set.
 */
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  process.loadEnvFile(path);
}

function moduleDir(): string | undefined {
  try {
    const url = import.meta.url;
    if (!url.startsWith("file:")) return undefined;
    return fileURLToPath(new URL(".", url));
  } catch {
    return undefined;
  }
}

/**
 * Env precedence, highest first:
 *
 * 1. the real process environment — never overwritten by any file;
 * 2. `AGENT_ENV_FILE`, when it names a file;
 * 3. `.env.ai-http` beside this example;
 * 4. `.env` in the working directory.
 *
 * Earlier files win over later ones, because a key already set is kept.
 */
function loadAgentEnv(): void {
  const explicit = process.env.AGENT_ENV_FILE;
  if (explicit) loadEnvFile(resolve(explicit));
  const here = moduleDir();
  if (here) loadEnvFile(resolve(here, ".env.ai-http"));
  loadEnvFile(resolve(process.cwd(), ".env"));
}

loadAgentEnv();

const PORT = Number(process.env.AGENT_PORT ?? 8787);
const HOST = process.env.AGENT_HOST ?? "127.0.0.1";
const MAX_BODY = Number(process.env.AGENT_MAX_BODY ?? 65_536);
const PROVIDER = (process.env.AGENT_PROVIDER ?? "openai").toLowerCase();
const MODEL = process.env.AGENT_MODEL ?? defaultModel(PROVIDER);

export type ExampleProvider = "openai" | "anthropic" | "gemini" | "deepseek";

export interface ExampleCompleteArgs {
  readonly system: string;
  readonly user: string;
  readonly signal: AbortSignal;
}

/**
 * Ask the provider for one reply.
 *
 * `onDelta` is what makes it a stream. When it is given the provider is asked
 * to stream and every fragment of the JSON document is forwarded as it
 * arrives; the return value is the whole document either way, so the parsed
 * reply is identical and nothing downstream has two paths to maintain.
 */
export type ExampleComplete = (
  args: ExampleCompleteArgs,
  onDelta?: (chunk: string) => void
) => Promise<string>;

function defaultModel(provider: string): string {
  if (provider === "anthropic") return "claude-sonnet-4-5";
  if (provider === "gemini") return "gemini-2.5-flash";
  if (provider === "deepseek") return "deepseek-v4-pro";
  return "gpt-5.6-luna";
}

function allowedOrigins(): readonly string[] {
  const raw = process.env.AGENT_ALLOWED_ORIGINS ?? "";
  if (raw.trim() === "") {
    return [
      "http://localhost:4321",
      "http://127.0.0.1:4321",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ];
  }
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function cors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;
  const allowed = allowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "origin");
  }
  res.setHeader("access-control-allow-headers", "content-type, authorization");
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return false;
  }
  return true;
}

function readBearer(req: IncomingMessage): string {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function tokenMatches(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function authorize(req: IncomingMessage): boolean {
  const expected = process.env.AGENT_HTTP_TOKEN ?? "";
  if (expected === "") return true;
  return tokenMatches(readBearer(req), expected);
}

function chunkToText(chunk: unknown): string {
  if (typeof chunk === "string") return chunk;
  if (Buffer.isBuffer(chunk)) return chunk.toString("utf8");
  if (chunk instanceof Uint8Array) return Buffer.from(chunk).toString("utf8");
  throw new TypeError("unexpected request chunk");
}

async function readBody(
  req: IncomingMessage,
  signal: AbortSignal
): Promise<string> {
  if (Number(req.headers["content-length"] ?? 0) > MAX_BODY) {
    throw new Error("payload too large");
  }
  const parts: string[] = [];
  let size = 0;
  for await (const chunk of req) {
    if (signal.aborted) throw new Error("cancelled");
    const piece = chunkToText(chunk);
    size += Buffer.byteLength(piece);
    if (size > MAX_BODY) throw new Error("payload too large");
    parts.push(piece);
  }
  return parts.join("");
}

/** Whether this client negotiated a stream. */
function wantsStream(req: IncomingMessage): boolean {
  return (req.headers.accept ?? "").includes("text/event-stream");
}

/**
 * Send one reply as events.
 *
 * Text goes out in pieces so it can be read as it lands; the calls go out
 * whole, once, and `done` is what makes them final. A client that loses the
 * connection before `done` has run nothing.
 */
function openStream(
  res: ServerResponse
): (event: string, data: unknown) => void {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  return (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
}

/**
 * Close a stream that has already sent its text.
 *
 * `sent` is what the reader has seen. Anything the parsed reply carries beyond
 * it goes out now — a provider whose stream and final message disagree, or a
 * reply whose text was never streamed at all — so the client always ends up
 * with exactly `reply.text`, which is what the parity test pins.
 */
function finishStream(
  send: (event: string, data: unknown) => void,
  reply: AgentHttpResponse,
  sent: string
): void {
  const text = reply.text ?? "";
  if (text !== sent) {
    send("text-delta", {
      text: text.startsWith(sent) ? text.slice(sent.length) : text,
    });
  }
  if (reply.transcript) send("transcript", { text: reply.transcript });
  if (reply.askUser) send("ask-user", reply.askUser);
  // Whole, once, and only now: `done` is what makes the calls final, so a
  // client that loses the connection before it has run nothing.
  if (reply.toolCalls?.length)
    send("tool-calls", { toolCalls: reply.toolCalls });
  send("done", {});
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function userPrompt(request: AgentHttpRequest): string {
  // A clip arrives once. A real backend transcribes it and answers the text;
  // this one says so rather than pretending to have heard it, because a demo
  // that fakes a transcript teaches the wrong shape.
  const spoken = request.audio
    ? `[the reader spoke for ${String(Math.round(request.audio.durationMs / 1000))}s — transcribe the attached ${request.audio.mimeType} clip and answer that]`
    : "";
  const parts = [request.message ?? spoken];
  if (request.pendingCalls?.length) {
    parts.push(
      "You already proposed these calls for this phase. Send the complete",
      "plan you want run — what you send replaces this, it is not added to it:",
      JSON.stringify(
        request.pendingCalls.map((call) => ({
          name: call.name,
          args: call.args,
        }))
      )
    );
  }
  if (request.toolResults?.length) {
    parts.push("Tool results:", JSON.stringify(request.toolResults));
  }
  return parts.join("\n\n");
}

/**
 * Turn the model's JSON into a reply, and issue the call ids ourselves.
 *
 * The ids are derived from the turn and phase the frontend named, plus each
 * call's position — never minted at random per exchange, which is what used to
 * give the same repeated call a fresh identity every round and turn one
 * intention into two writes. A model that repeats itself now repeats the same
 * ids, and the frontend recognises them.
 */
/**
 * The envelope this example parses, stated to the model.
 *
 * The capability guides above it are full of JSON Schemas, and a model told
 * only "reply with JSON" will reasonably answer with an object shaped like one
 * of them — arguments for the call it wants, with no envelope around them.
 * That is a well-formed document this backend cannot use, so the shape is
 * named here rather than assumed, and the mistake it invites is named with it.
 *
 * `agentSystemPrompt` deliberately does not say this: the envelope belongs to
 * whoever wrote the backend, and a host with its own wire says something else.
 */
const REPLY_SHAPE = [
  "Reply with one JSON object and nothing else, in exactly this shape:",
  '{"text": "what the reader should see",',
  ' "toolCalls": [{"name": "<capability key>", "args": {…}}],',
  ' "askUser": {"id": "q1", "question": "…",',
  '              "options": [{"id": "a", "label": "…"}], "allowFreeText": true}}',
  "",
  "- `text` is always present, even when you are also calling something.",
  "- `toolCalls` is what the table should do. Omit it when there is nothing to do.",
  "- Each `name` is a capability key listed above, or one of the two tools that",
  "  ask this table something rather than commanding it:",
  '  `describe` takes {"keys": ["<capability key>"]} and returns the full',
  "  argument schema for a capability whose guide was not included upfront —",
  "  call it rather than guessing an argument name, and never ask the reader",
  '  what shape a call takes; and `read` takes {"offset", "limit"} and returns',
  "  a bounded window of rows.",
  "- `args` is that capability's own arguments — the schemas above describe",
  "  `args`, not this reply.",
  "- A reply carrying only `text` ends the turn. Never announce a call you are",
  "  not making in the same reply — if you are about to look something up, the",
  "  reply that says so is the reply that has to carry it in `toolCalls`.",
  "- `askUser` is for a question you cannot answer from the context. It needs an",
  "  `id` of your own choosing so the answer can be matched back to it, and each",
  "  option is an object with its own `id` and `label` — never a bare string.",
  "  Omit the whole field when you are not asking anything.",
  "- Never reply with a bare arguments object: arguments belong inside `args`.",
].join("\n");

/**
 * The calls that change the data, and so end a turn.
 *
 * A write's receipt goes to the reader, not back to the model: handing one
 * back buys a second call that only says "done". Everything else is a step
 * towards something — a lookup, or the view change that made the lookup worth
 * doing, which is how a model narrows a table before reading what is left.
 * The session ends a turn that asks for what it just ran, so continuing on
 * every non-write costs nothing when the model has finished.
 */
const WRITES = new Set([
  "edit.cells",
  "rows.add",
  "rows.delete",
  "rows.reorder",
  "export.run",
]);

/** A bounded, single-line look at what a provider sent. */
function excerpt(raw: string, limit = 300): string {
  const flat = raw.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit)}\u2026` : flat;
}

function asReply(raw: string, request: AgentHttpRequest): AgentHttpResponse {
  if (raw.trim() === "") {
    // Distinct from a malformed document: nothing came back at all, which is
    // a provider or connectivity fault rather than a model that answered
    // badly. Saying "not JSON — it sent " would quote an absence.
    throw new TypeError("provider returned an empty reply");
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    // A reply that is not JSON is the provider's fault, not the caller's, and
    // a parser's "Expected ',' at position 37" tells whoever is reading
    // nothing about which of authentication, billing, connectivity or model
    // behaviour they are looking at. Name the class and quote what came back.
    throw new TypeError(
      `provider returned a reply that is not JSON — it sent ${excerpt(raw)}`
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError(
      `provider returned a non-object — it sent ${excerpt(raw)}`
    );
  }
  const record = body as Record<string, unknown>;
  const turnId = request.turnId ?? "turn";
  const phaseId = request.phaseId ?? 0;
  const toolCalls = Array.isArray(record.toolCalls)
    ? record.toolCalls.map((call, index) => {
        const item =
          call && typeof call === "object" && !Array.isArray(call)
            ? (call as Record<string, unknown>)
            : {};
        return {
          id: `${turnId}:${String(phaseId)}:${String(index)}`,
          name: typeof item.name === "string" ? item.name : "unknown",
          args: item.args ?? {},
          ...(typeof item.expectedRevision === "number"
            ? { expectedRevision: item.expectedRevision }
            : {}),
        };
      })
    : undefined;
  const text = typeof record.text === "string" ? record.text : "";
  // A document that parses but answers nothing is a failed turn, not a reply.
  // Forwarding it as one puts an empty bubble in front of the reader beside a
  // badge that says the turn is done.
  if (
    text.trim() === "" &&
    !toolCalls?.length &&
    record.askUser === undefined
  ) {
    // The document parsed and answered nothing. Quote a bounded excerpt of it:
    // a developer running this example needs to see what the provider actually
    // said, and the sentence alone sends them looking in the wrong place.
    // Their own model's reply, never a credential.
    throw new TypeError(
      `provider returned no text, no calls and no question — it sent ${excerpt(raw)}`
    );
  }
  return parseAgentHttpResponse({
    schemaVersion: AGENT_HTTP_SCHEMA,
    text,
    toolCalls,
    askUser: record.askUser,
    continueWithResults:
      (toolCalls ?? []).length > 0 &&
      (toolCalls ?? []).every((call) => !WRITES.has(call.name)),
  });
}

export async function handleExampleAgentTurn(
  request: AgentHttpRequest,
  complete: ExampleComplete,
  signal: AbortSignal,
  onText?: (chunk: string) => void
): Promise<AgentHttpResponse> {
  if (request.kind === "hello" || request.kind === "schema") {
    const sessionId = pinExampleSchema(request);
    return {
      schemaVersion: AGENT_HTTP_SCHEMA,
      ok: true,
      sessionId,
      pin: {
        status: "acknowledged",
        ...(request.contractVersion
          ? { contractVersion: request.contractVersion }
          : {}),
        ttlMs: EXAMPLE_PIN_TTL_MS,
      },
      text:
        request.kind === "hello"
          ? "Connected. Messages and permitted table context go to this backend."
          : "Schema updated.",
    };
  }
  const resolved = resolveExampleSchema(request);
  if (!resolved.schema) {
    // Nothing ran, so saying the pin is gone is safe and the client resends
    // the contract. This is never the answer to a call whose outcome is
    // unknown, which is why it is decided before the provider is asked.
    return {
      schemaVersion: AGENT_HTTP_SCHEMA,
      pin: resolved.pin,
      text: "send the table contract — this backend no longer holds a pin for it",
    };
  }
  // The provider streams fragments of a JSON document; the reader turns those
  // into the reply text as it becomes readable. Without a sink there is
  // nothing to stream to, so the provider is asked for the document whole.
  const reader = onText ? createTextFieldReader("text") : undefined;
  const raw = await complete(
    {
      system: `${agentSystemPrompt(resolved.schema)}\n\n${REPLY_SHAPE}`,
      user: userPrompt(request),
      signal,
    },
    reader && onText
      ? (fragment) => {
          const decoded = reader.push(fragment);
          if (decoded) onText(decoded);
        }
      : undefined
  );
  // A reader pressing Stop aborts the provider call mid-document, so what
  // comes back is a truncated reply or none at all. That is a cancelled turn,
  // not a provider that answered badly, and reading it as one would report the
  // reader's own decision to them as a fault.
  if (signal.aborted) throw new Error("cancelled");
  return { ...asReply(raw, request), pin: resolved.pin };
}

/** What a provider said went wrong, or the bare status. */
async function providerError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  return new Error(body.error?.message ?? `provider ${response.status}`);
}

/**
 * Collect a provider's stream, forwarding each fragment as it lands.
 *
 * The fragments are pieces of the JSON document the provider was asked for,
 * not pieces of the answer — pulling the answer out of them is the reader's
 * job, one layer up.
 */
async function collectStream(
  response: Response,
  fragmentOf: (payload: string) => string | undefined,
  onDelta: (chunk: string) => void
): Promise<string> {
  let raw = "";
  for await (const payload of readSseData(response.body)) {
    // Every provider here ends its stream with a sentinel rather than only by
    // closing the body.
    if (payload === "[DONE]") break;
    let fragment: string | undefined;
    try {
      fragment = fragmentOf(payload);
    } catch {
      // A keep-alive or a status frame this parser does not know. Skipping it
      // is right; failing the turn over it is not.
      continue;
    }
    if (!fragment) continue;
    raw += fragment;
    onDelta(fragment);
  }
  if (!raw) throw new Error("provider returned no content");
  return raw;
}

async function completeOpenAI(
  url: string,
  key: string,
  args: ExampleCompleteArgs,
  onDelta?: (chunk: string) => void
): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    signal: args.signal,
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      ...(onDelta ? { stream: true } : {}),
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });
  if (!response.ok) throw await providerError(response);
  if (onDelta) {
    return collectStream(
      response,
      (payload) =>
        (
          JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          }
        ).choices?.[0]?.delta?.content,
      onDelta
    );
  }
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error("provider returned no content");
  return text;
}

async function completeAnthropic(
  args: ExampleCompleteArgs,
  onDelta?: (chunk: string) => void
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: args.signal,
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: `${args.system}\nRespond with a JSON object only.`,
      ...(onDelta ? { stream: true } : {}),
      messages: [{ role: "user", content: args.user }],
    }),
  });
  if (!response.ok) throw await providerError(response);
  if (onDelta) {
    return collectStream(
      response,
      (payload) => {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        // Only text deltas. `message_start`, `ping` and the stop events carry
        // no part of the document.
        return event.type === "content_block_delta" &&
          event.delta?.type === "text_delta"
          ? event.delta.text
          : undefined;
      },
      onDelta
    );
  }
  const body = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = body.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("provider returned no content");
  return text;
}

async function completeGemini(
  args: ExampleCompleteArgs,
  onDelta?: (chunk: string) => void
): Promise<string> {
  const key = process.env.GEMINI_API_KEY ?? "";
  // A different method, and `alt=sse` so the stream is framed as events
  // rather than as one growing JSON array.
  const method = onDelta
    ? "streamGenerateContent?alt=sse&"
    : "generateContent?";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:${method}key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: "POST",
    signal: args.signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: args.system }] },
      contents: [{ role: "user", parts: [{ text: args.user }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw await providerError(response);
  if (onDelta) {
    return collectStream(
      response,
      (payload) =>
        (
          JSON.parse(payload) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          }
        ).candidates?.[0]?.content?.parts?.[0]?.text,
      onDelta
    );
  }
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("provider returned no content");
  return text;
}

export function completeForProvider(provider: string): ExampleComplete {
  if (provider === "anthropic") return completeAnthropic;
  if (provider === "gemini") return completeGemini;
  if (provider === "deepseek") {
    return (args, onDelta) =>
      completeOpenAI(
        "https://api.deepseek.com/chat/completions",
        process.env.DEEPSEEK_API_KEY ?? "",
        args,
        onDelta
      );
  }
  return (args, onDelta) =>
    completeOpenAI(
      "https://api.openai.com/v1/chat/completions",
      process.env.OPENAI_API_KEY ?? "",
      args,
      onDelta
    );
}

const PROVIDER_KEY_VAR: Readonly<Record<string, string>> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

function providerReady(
  provider: string,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const keyVar = PROVIDER_KEY_VAR[provider];
  if (!keyVar) {
    return `unsupported AGENT_PROVIDER "${provider}". Add an adapter in completeForProvider.`;
  }
  if (!env[keyVar]) return `${keyVar} is missing`;
  return undefined;
}

/**
 * Whether the request was turned away before it was read.
 *
 * True means a response has already been written and there is nothing further
 * to do; the caller returns.
 */
function refused(req: IncomingMessage, res: ServerResponse): boolean {
  if (!cors(req, res)) return true;
  if (req.method !== "POST") {
    writeJson(res, 405, { error: "POST only" });
    return true;
  }
  if (!authorize(req)) {
    writeJson(res, 401, { error: "unauthorized" });
    return true;
  }
  return false;
}

/** Say a turn failed, on whichever channel the client is still reading. */
function reportFailure(
  res: ServerResponse,
  streaming: ((event: string, data: unknown) => void) | undefined,
  error: unknown
): void {
  const message = error instanceof Error ? error.message : "bad request";
  if (streaming) {
    // The client is already reading. It ends the turn on `error`, and the
    // absence of `done` means nothing this turn proposed is run.
    streaming("error", { code: "backend-failed", message });
    res.end();
    return;
  }
  writeJson(res, statusForFailure(message), { error: message });
}

/** The status a failed turn is reported with, read from what went wrong. */
function statusForFailure(message: string): number {
  if (message.includes("too large")) return 413;
  if (message.includes("cancelled")) return 499;
  // The caller sent a perfectly good request and the provider answered with
  // something unusable. Reporting that as 400 sends whoever is debugging it
  // looking at their own payload.
  if (message.startsWith("provider ")) return 502;
  return 400;
}

export async function handleExampleHttp(
  req: IncomingMessage,
  res: ServerResponse,
  complete?: ExampleComplete
): Promise<void> {
  if (refused(req, res)) return;
  const controller = new AbortController();
  req.on("aborted", () => controller.abort());
  // Held outside the try: once the stream's head is out, a failure has to be
  // reported as an event rather than as a status nobody can still receive.
  let streaming: ((event: string, data: unknown) => void) | undefined;
  try {
    const raw = await readBody(req, controller.signal);
    const request = parseAgentHttpRequest(JSON.parse(raw) as unknown);
    if (request.kind === "turn" && !complete) {
      const missing = providerReady(PROVIDER);
      if (missing) {
        writeJson(res, 503, { error: missing });
        return;
      }
    }
    // The client asked for a stream, so the head goes out before the provider
    // is called and each piece of the answer is forwarded as it is decoded.
    // The calls still travel whole, after `done`-worthy parsing — a client
    // that loses the connection first has run nothing.
    streaming = wantsStream(req) ? openStream(res) : undefined;
    const send = streaming;
    let sent = "";
    const reply = await handleExampleAgentTurn(
      request,
      complete ?? completeForProvider(PROVIDER),
      controller.signal,
      send
        ? (chunk) => {
            sent += chunk;
            send("text-delta", { text: chunk });
          }
        : undefined
    );
    if (send) {
      finishStream(send, reply, sent);
      res.end();
    } else writeJson(res, 200, reply);
  } catch (error) {
    reportFailure(res, streaming, error);
  }
}

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

/** Non-loopback binds require an endpoint token. @public */
export function exampleRequiresToken(host: string, token: string): boolean {
  return !isLoopbackHost(host) && token === "";
}

/**
 * Check the numbers and names this server was configured with, so a typo
 * fails at startup with the variable's name instead of a random port or a
 * provider call that never had a key.
 *
 * @public
 */
export function exampleConfigError(env: NodeJS.ProcessEnv): string | undefined {
  const port = env.AGENT_PORT;
  if (port !== undefined && !isPort(port)) {
    return `AGENT_PORT must be a whole number between 1 and 65535, got "${port}"`;
  }
  const maxBody = env.AGENT_MAX_BODY;
  if (maxBody !== undefined && !isPositiveInt(maxBody)) {
    return `AGENT_MAX_BODY must be a positive whole number of bytes, got "${maxBody}"`;
  }
  if (env.AGENT_HOST?.trim() === "") {
    return "AGENT_HOST is empty. Remove it to bind 127.0.0.1, or name a host.";
  }
  if (env.AGENT_MODEL?.trim() === "") {
    return `AGENT_MODEL is empty. Remove it to use this provider's default.`;
  }
  return providerReady((env.AGENT_PROVIDER ?? "openai").toLowerCase(), env);
}

function isPort(value: string): boolean {
  return isPositiveInt(value) && Number(value) <= 65_535;
}

function isPositiveInt(value: string): boolean {
  return /^\d+$/.test(value.trim()) && Number(value) > 0;
}

function start(): void {
  const configError = exampleConfigError(process.env);
  if (configError) {
    console.error(configError);
    process.exit(1);
  }
  const token = process.env.AGENT_HTTP_TOKEN ?? "";
  if (exampleRequiresToken(HOST, token)) {
    console.error(
      "AGENT_HOST is not loopback. Set AGENT_HTTP_TOKEN before binding externally."
    );
    process.exit(1);
  }
  const server = createServer((req, res) => {
    void handleExampleHttp(req, res);
  });
  server.listen(PORT, HOST, () => {
    console.log(
      `AdaptTable AI example listening on http://${HOST}:${String(PORT)}`
    );
    console.log(
      `Provider: ${PROVIDER} (model ${MODEL}). Keys stay on this process.`
    );
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  start();
}
