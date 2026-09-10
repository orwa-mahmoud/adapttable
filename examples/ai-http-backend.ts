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
  type AgentHttpRequest,
  type AgentHttpResponse,
  agentSystemPrompt,
  type AgentSystemPromptInput,
  parseAgentHttpRequest,
  parseAgentHttpResponse,
} from "@adapttable/ai/http";

interface ExamplePin {
  readonly tableId: string;
  readonly catalog: NonNullable<AgentHttpRequest["catalog"]>;
  readonly manifest: NonNullable<AgentHttpRequest["manifest"]>;
}

const examplePins = new Map<string, ExamplePin>();

function examplePinKey(request: AgentHttpRequest): string {
  return request.sessionId ?? `table:${request.tableId}`;
}

function pinExampleSchema(request: AgentHttpRequest): string {
  if (!request.catalog || !request.manifest) {
    throw new TypeError("hello / schema requires catalog and manifest");
  }
  const sessionId =
    request.sessionId ?? `sess_${randomBytes(8).toString("hex")}`;
  const pin: ExamplePin = {
    tableId: request.tableId,
    catalog: request.catalog,
    manifest: request.manifest,
  };
  examplePins.set(sessionId, pin);
  examplePins.set(`table:${request.tableId}`, pin);
  return sessionId;
}

function resolveExampleSchema(
  request: AgentHttpRequest
): AgentSystemPromptInput | undefined {
  if (request.catalog && request.manifest) {
    pinExampleSchema(request);
    return {
      tableId: request.tableId,
      catalog: request.catalog,
      manifest: {
        viewRevision: request.viewRevision ?? request.manifest.viewRevision,
        columns: request.manifest.columns,
      },
    };
  }
  const pin = examplePins.get(examplePinKey(request));
  if (!pin) return undefined;
  return {
    tableId: request.tableId,
    catalog: pin.catalog,
    manifest: {
      viewRevision: request.viewRevision ?? pin.manifest.viewRevision,
      columns: pin.manifest.columns,
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

export type ExampleComplete = (args: ExampleCompleteArgs) => Promise<string>;

function defaultModel(provider: string): string {
  if (provider === "anthropic") return "claude-sonnet-4-5";
  if (provider === "gemini") return "gemini-2.5-flash";
  if (provider === "deepseek") return "deepseek-chat";
  return "gpt-4.1-mini";
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

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function userPrompt(request: AgentHttpRequest): string {
  const parts = [request.message ?? ""];
  if (request.descriptions?.length) {
    parts.push(
      "Requested guides:",
      JSON.stringify(
        request.descriptions.map((guide) => ({
          key: guide.key,
          guide: guide.guide,
          input: guide.input,
        }))
      )
    );
  }
  if (request.rows?.length) {
    parts.push("Requested row windows:", JSON.stringify(request.rows));
  }
  if (request.results?.length) {
    parts.push(
      "Action receipts:",
      JSON.stringify(
        request.results.map((result) => ({
          ok: result.ok,
          error: result.error,
          idempotencyKey: result.idempotencyKey,
        }))
      )
    );
  }
  return parts.join("\n\n");
}

function asReply(raw: string, turnNonce: string): AgentHttpResponse {
  const body: unknown = JSON.parse(raw);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("provider returned a non-object");
  }
  const record = body as Record<string, unknown>;
  const actions = Array.isArray(record.actions)
    ? record.actions.map((action, index) => {
        const item =
          action && typeof action === "object" && !Array.isArray(action)
            ? (action as Record<string, unknown>)
            : {};
        const key = typeof item.key === "string" ? item.key : "unknown";
        return {
          key,
          args: item.args ?? {},
          idempotencyKey: `${turnNonce}:${String(index)}`,
          ...(typeof item.expectedRevision === "number"
            ? { expectedRevision: item.expectedRevision }
            : {}),
        };
      })
    : undefined;
  return parseAgentHttpResponse({
    schemaVersion: AGENT_HTTP_SCHEMA,
    text: typeof record.text === "string" ? record.text : "",
    actions,
    needs: record.needs,
    // The table already applied the actions. A second model call that only
    // says "done" is the confirmation loop the reader does not want.
    continueWithResults: false,
  });
}

export async function handleExampleAgentTurn(
  request: AgentHttpRequest,
  complete: ExampleComplete,
  signal: AbortSignal
): Promise<AgentHttpResponse> {
  if (request.kind === "hello" || request.kind === "schema") {
    const sessionId = pinExampleSchema(request);
    return {
      schemaVersion: AGENT_HTTP_SCHEMA,
      ok: true,
      sessionId,
      text:
        request.kind === "hello"
          ? "Connected. Messages and permitted table context go to this backend."
          : "Schema updated.",
    };
  }
  const schema = resolveExampleSchema(request);
  if (!schema) {
    return {
      schemaVersion: AGENT_HTTP_SCHEMA,
      ok: false,
      text: "schema required — send hello or schema before a question-only turn",
    };
  }
  const raw = await complete({
    system: agentSystemPrompt(schema),
    user: userPrompt(request),
    signal,
  });
  return asReply(raw, randomBytes(8).toString("hex"));
}

async function completeOpenAI(
  url: string,
  key: string,
  args: ExampleCompleteArgs
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
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(body.error?.message ?? `provider ${response.status}`);
  }
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error("provider returned no content");
  return text;
}

async function completeAnthropic(args: ExampleCompleteArgs): Promise<string> {
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
      messages: [{ role: "user", content: args.user }],
    }),
  });
  const body = (await response.json()) as {
    content?: { type: string; text?: string }[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(body.error?.message ?? `provider ${response.status}`);
  }
  const text = body.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("provider returned no content");
  return text;
}

async function completeGemini(args: ExampleCompleteArgs): Promise<string> {
  const key = process.env.GEMINI_API_KEY ?? "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
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
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(body.error?.message ?? `provider ${response.status}`);
  }
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("provider returned no content");
  return text;
}

export function completeForProvider(provider: string): ExampleComplete {
  if (provider === "anthropic") return completeAnthropic;
  if (provider === "gemini") return completeGemini;
  if (provider === "deepseek") {
    return (args) =>
      completeOpenAI(
        "https://api.deepseek.com/chat/completions",
        process.env.DEEPSEEK_API_KEY ?? "",
        args
      );
  }
  return (args) =>
    completeOpenAI(
      "https://api.openai.com/v1/chat/completions",
      process.env.OPENAI_API_KEY ?? "",
      args
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

export async function handleExampleHttp(
  req: IncomingMessage,
  res: ServerResponse,
  complete?: ExampleComplete
): Promise<void> {
  if (!cors(req, res)) return;
  if (req.method !== "POST") {
    writeJson(res, 405, { error: "POST only" });
    return;
  }
  if (!authorize(req)) {
    writeJson(res, 401, { error: "unauthorized" });
    return;
  }
  const controller = new AbortController();
  req.on("aborted", () => controller.abort());
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
    writeJson(
      res,
      200,
      await handleExampleAgentTurn(
        request,
        complete ?? completeForProvider(PROVIDER),
        controller.signal
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "bad request";
    let status = 400;
    if (message.includes("too large")) status = 413;
    else if (message.includes("cancelled")) status = 499;
    writeJson(res, status, { error: message });
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
