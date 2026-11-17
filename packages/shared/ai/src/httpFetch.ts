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

function abortReason(signal: AbortSignal): Error {
  const reason: unknown = signal.reason;
  // An explicit reason — a timeout, a host's own error — is carried through.
  // A bare abort() yields a platform AbortError, which is reported in this
  // bridge's own vocabulary instead.
  if (reason instanceof Error && reason.name !== "AbortError") return reason;
  return new Error("agent HTTP cancelled");
}

function abortPromise(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const fail = () => reject(abortReason(signal));
    if (signal.aborted) {
      fail();
      return;
    }
    signal.addEventListener("abort", fail, { once: true });
  });
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
  signal: AbortSignal
): Promise<unknown> {
  // A signal that is already aborted starts no network work at all.
  if (signal.aborted) throw abortReason(signal);
  if (options.request) {
    // The callback is free to ignore the signal, so the timeout is enforced
    // out here rather than trusting it to return.
    const value = await Promise.race([
      Promise.resolve(options.request(body, signal)),
      abortPromise(signal),
    ]);
    assertResponseSize(jsonBytes(value));
    return value;
  }
  const endpoint = options.endpoint.trim();
  if (!endpoint) throw new Error("agent HTTP endpoint is required");
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError("agent HTTP requires fetch");
  }
  const headers = new Headers(await resolveHeaders(options.headers));
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
    response = await Promise.race([
      fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
      }),
      abortPromise(signal),
    ]);
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
    return readStream(response, options, signal);
  }
  const text = await Promise.race([response.text(), abortPromise(signal)]);
  if (!response.ok) throw httpError(response.status, text);
  assertResponseSize(new TextEncoder().encode(text).byteLength);
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
  const merged = mergeSignals(options.timeoutMs, signal);
  try {
    return parseAgentHttpResponse(await postJson(options, body, merged.signal));
  } finally {
    merged.cleanup();
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
  signal: AbortSignal
): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new TypeError("agent HTTP stream had no body");
  const decoder = new TextDecoder();
  const reply = createStreamReply(options.onStreamText);
  let buffer = "";
  let bytes = 0;

  try {
    for (;;) {
      const chunk = await Promise.race([reader.read(), abortPromise(signal)]);
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      assertResponseSize(bytes);
      buffer += decoder.decode(chunk.value, { stream: true });
      const split = splitRecords(buffer);
      buffer = split.rest;
      let finished = false;
      for (const record of split.records) {
        const event = parseStreamRecord(record);
        if (event && reply.absorb(event)) finished = true;
      }
      if (finished) break;
    }
  } finally {
    // Releasing rather than cancelling: an abort has already torn the request
    // down, and a cancel on a settled reader throws over the real reason.
    reader.releaseLock();
  }
  return reply.finish(AGENT_SCHEMA_VERSION);
}

function mergeSignals(
  timeoutMs: number | undefined,
  external?: AbortSignal
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timers: ReturnType<typeof setTimeout>[] = [];
  const onAbort = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener("abort", onAbort, { once: true });
  }
  if (timeoutMs !== undefined && timeoutMs > 0) {
    timers.push(
      setTimeout(() => {
        controller.abort(
          new Error(`agent HTTP request timed out after ${timeoutMs}ms`)
        );
      }, timeoutMs)
    );
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      external?.removeEventListener("abort", onAbort);
      for (const timer of timers) clearTimeout(timer);
    },
  };
}
