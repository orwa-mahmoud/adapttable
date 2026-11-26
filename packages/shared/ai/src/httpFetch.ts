/**
 * Posting to the backend: headers, cancellation, size limits and the streamed
 * reply.
 */
import { errorMessage } from "./errorMessage";
import {
  AgentHttpError,
  jsonBytes,
  MAX_CONTEXT_BYTES,
  MAX_REQUEST_BYTES,
  MAX_RESPONSE_BYTES,
  requestBytes,
} from "./httpLimits";
import { parseAgentHttpResponse } from "./httpParse";
import {
  createStreamReply,
  parseStreamRecord,
  splitRecords,
} from "./httpStream";
import {
  type AgentHttpClientOptions,
  type AgentHttpRequest,
  type AgentHttpResponse,
} from "./httpWire";
import { AGENT_SCHEMA_VERSION } from "./keys";
import type { CapabilityGuide, RowWindow } from "./types";

async function resolveHeaders(
  headers: AgentHttpClientOptions["headers"]
): Promise<HeadersInit | undefined> {
  if (typeof headers === "function") return headers();
  return headers;
}

/** How much of a failed reply is read: enough for the diagnostic it shows. */
const ERROR_BODY_BYTES = 4096;

function abortReason(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  // An explicit reason — a timeout, a host's own error — is carried through.
  // A bare abort() yields a platform AbortError, which is reported in this
  // bridge's own vocabulary instead.
  if (reason instanceof Error && reason.name !== "AbortError") return reason;
  return new Error("agent HTTP cancelled");
}

/**
 * The one owner of an exchange's cancellation: the caller's signal and the
 * timeout, merged, for headers, fetch and every body read alike.
 */
interface Cancellation {
  readonly signal: AbortSignal;
  /**
   * Settle with `work`, or reject when the exchange is cancelled first. The
   * abort listener lives only while `work` is pending, so a stream read
   * chunk by chunk holds one listener, not one per chunk.
   */
  readonly race: <T>(work: Promise<T>) => Promise<T>;
  /** Stop the timeout and let go of the caller's signal. */
  readonly cleanup: () => void;
}

function cancellation(
  timeoutMs: number | undefined,
  external?: AbortSignal
): Cancellation {
  const controller = new AbortController();
  const { signal } = controller;
  const onAbort = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener("abort", onAbort, { once: true });
  }
  const timer =
    timeoutMs !== undefined && timeoutMs > 0
      ? setTimeout(() => {
          controller.abort(
            new Error(`agent HTTP request timed out after ${timeoutMs}ms`)
          );
        }, timeoutMs)
      : undefined;
  return {
    signal,
    race: (work) =>
      new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(abortReason(signal));
          return;
        }
        const fail = () => reject(abortReason(signal));
        signal.addEventListener("abort", fail, { once: true });
        work.then(
          (value) => {
            signal.removeEventListener("abort", fail);
            resolve(value);
          },
          (error: unknown) => {
            signal.removeEventListener("abort", fail);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        );
      }),
    cleanup: () => {
      external?.removeEventListener("abort", onAbort);
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}

/**
 * Let go of a body this exchange will not finish reading. A cancelled exchange
 * has already torn its request down, and cancelling that stream again would
 * only report the abort a second time.
 */
async function abandon(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  owner: Cancellation
): Promise<void> {
  if (!owner.signal.aborted) await reader.cancel();
}

/** The declared length of a reply, when it gives a usable one. */
function declaredLength(response: Response): number | undefined {
  const raw = response.headers.get("content-length");
  if (raw === null || !/^\d+$/.test(raw.trim())) return undefined;
  return Number(raw);
}

/**
 * Read a reply's text without holding more than `limit` bytes of it.
 *
 * A reply that declares a larger length is refused before a byte is read. One
 * that declares nothing is read until it ends or passes the limit; then the
 * reader is cancelled and the reply is either refused (`"refuse"`) or cut at
 * the limit (`"cut"`, for a failure whose diagnostic is all that is shown).
 */
async function readText(
  response: Response,
  owner: Cancellation,
  limit: number,
  past: "refuse" | "cut"
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const declared = declaredLength(response);
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    if (past === "refuse" && declared !== undefined && declared > limit) {
      await abandon(reader, owner);
      assertResponseSize(declared);
    }
    for (;;) {
      const chunk = await owner.race(reader.read());
      if (chunk.done) return text + decoder.decode();
      const room = limit - bytes;
      bytes += chunk.value.byteLength;
      if (bytes > limit) {
        await abandon(reader, owner);
        if (past === "refuse") assertResponseSize(bytes);
        return text + decoder.decode(chunk.value.subarray(0, room));
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

function assertResponseSize(bytes: number): void {
  if (bytes > MAX_RESPONSE_BYTES) {
    throw new AgentHttpError(
      "payload-too-large",
      `agent HTTP response exceeds ${MAX_RESPONSE_BYTES} bytes`
    );
  }
}

/** Guides and rows carried between rounds are bounded like the request is. */
export function assertContextSize(
  descriptions: readonly CapabilityGuide[] | undefined,
  rows: readonly RowWindow[] | undefined
): void {
  const bytes = jsonBytes({ descriptions, rows });
  if (bytes > MAX_CONTEXT_BYTES) {
    throw new AgentHttpError(
      "payload-too-large",
      `agent HTTP turn context exceeds ${MAX_CONTEXT_BYTES} bytes`
    );
  }
}

function httpError(status: number, body: string): Error {
  const snippet = body.trim().slice(0, 240);
  return new Error(
    snippet
      ? `agent HTTP ${status}: ${snippet}`
      : `agent HTTP request failed with status ${status}`
  );
}

async function postJson(
  options: AgentHttpClientOptions,
  body: AgentHttpRequest,
  owner: Cancellation
): Promise<unknown> {
  const { signal } = owner;
  // A signal that is already aborted starts no network work at all.
  if (signal.aborted) throw abortReason(signal);
  if (options.request) {
    // The callback is free to ignore the signal, so the timeout is enforced
    // out here rather than trusting it to return.
    const value = await owner.race(
      Promise.resolve(options.request(body, signal))
    );
    assertResponseSize(jsonBytes(value));
    return value;
  }
  const endpoint = options.endpoint.trim();
  if (!endpoint) throw new Error("agent HTTP endpoint is required");
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError("agent HTTP requires fetch");
  }
  const headers = new Headers(
    await owner.race(resolveHeaders(options.headers))
  );
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  // Streaming is negotiated, never assumed. A backend that answers JSON is
  // answered from its own content type rather than by trying again.
  headers.set(
    "accept",
    options.stream ? "text/event-stream, application/json" : "application/json"
  );
  let response: Response;
  try {
    response = await owner.race(
      fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
      })
    );
  } catch (error) {
    if (signal.aborted) {
      throw abortReason(signal);
    }
    throw new Error(`agent HTTP connection failed: ${errorMessage(error)}`);
  }
  if (
    options.stream &&
    response.ok &&
    response.body &&
    (response.headers.get("content-type") ?? "").includes("text/event-stream")
  ) {
    return readStream(response, options, owner);
  }
  if (!response.ok) {
    throw httpError(
      response.status,
      await readText(response, owner, ERROR_BODY_BYTES, "cut")
    );
  }
  const text = await readText(response, owner, MAX_RESPONSE_BYTES, "refuse");
  if (text.trim() === "") {
    throw new TypeError("agent HTTP response was empty");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new TypeError("agent HTTP response was not JSON");
  }
}

export async function exchange(
  options: AgentHttpClientOptions,
  body: AgentHttpRequest,
  signal?: AbortSignal
): Promise<AgentHttpResponse> {
  if (requestBytes(body) > MAX_REQUEST_BYTES) {
    throw new AgentHttpError(
      "payload-too-large",
      `agent HTTP request exceeds ${MAX_REQUEST_BYTES} bytes`
    );
  }
  const owner = cancellation(options.timeoutMs, signal);
  try {
    return parseAgentHttpResponse(await postJson(options, body, owner));
  } finally {
    owner.cleanup();
  }
}

/**
 * Read an event stream into the reply the rest of this client expects.
 *
 * The same ceilings as a JSON body: total bytes, and the caller's own signal,
 * which already carries `timeoutMs`. A stream that stops without `done` is a
 * failure rather than a shorter reply — see `createStreamReply`.
 */
async function readStream(
  response: Response,
  options: AgentHttpClientOptions,
  owner: Cancellation
): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new TypeError("agent HTTP stream had no body");
  const decoder = new TextDecoder();
  const reply = createStreamReply(options.onStreamText);
  let buffer = "";
  let bytes = 0;

  try {
    for (;;) {
      const chunk = await owner.race(reader.read());
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await abandon(reader, owner);
        assertResponseSize(bytes);
      }
      buffer += decoder.decode(chunk.value, { stream: true });
      const split = splitRecords(buffer);
      buffer = split.rest;
      let finished = false;
      for (const record of split.records) {
        const event = parseStreamRecord(record);
        if (event && reply.absorb(event)) finished = true;
      }
      if (finished) {
        // The terminal event ends the reply; whatever the backend still
        // sends after it is not read, so the upstream is told to stop.
        await abandon(reader, owner);
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return reply.finish(AGENT_SCHEMA_VERSION);
}
