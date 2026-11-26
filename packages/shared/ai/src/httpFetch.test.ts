import { afterEach, describe, expect, it, vi } from "vitest";

import { exchange } from "./httpFetch";
import { MAX_RESPONSE_BYTES } from "./httpLimits";
import type { AgentHttpClientOptions, AgentHttpRequest } from "./httpWire";
import { AGENT_SCHEMA_VERSION } from "./keys";

const REQUEST: AgentHttpRequest = {
  schemaVersion: AGENT_SCHEMA_VERSION,
  kind: "turn",
  tableId: "fetch-spec",
};

const encoder = new TextEncoder();
const CHUNK_BYTES = 64 * 1024;

/**
 * A body that hands out one chunk per read and counts what the client pulled.
 * A high-water mark of zero means nothing is read ahead of the client.
 */
function pulledBody(chunks: () => Iterator<Uint8Array>, endless = false) {
  const source = chunks();
  const seen = { pulled: 0, cancelled: false };
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const next = source.next();
        if (next.done) {
          if (!endless) controller.close();
          return endless ? new Promise<void>(() => undefined) : undefined;
        }
        seen.pulled += next.value.byteLength;
        controller.enqueue(next.value);
        return undefined;
      },
      cancel() {
        seen.cancelled = true;
      },
    },
    { highWaterMark: 0 }
  );
  return { stream, seen };
}

function* repeated(bytes: number): Iterator<Uint8Array> {
  const chunk = encoder.encode("x".repeat(CHUNK_BYTES));
  for (let sent = 0; sent < bytes; sent += CHUNK_BYTES) yield chunk;
}

function* records(lines: readonly string[]): Iterator<Uint8Array> {
  for (const line of lines) yield encoder.encode(line);
}

function options(
  response: () => Response,
  extra: Partial<AgentHttpClientOptions> = {}
): AgentHttpClientOptions {
  return {
    endpoint: "https://agent.example/turn",
    fetch: () => Promise.resolve(response()),
    ...extra,
  };
}

const json = (headers: Record<string, string> = {}) => ({
  status: 200,
  headers: { "content-type": "application/json", ...headers },
});

const DELTA = 'event: text-delta\ndata: {"text":"a"}\n\n';
const DONE = "event: done\ndata: {}\n\n";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("exchange cancellation", () => {
  it("holds no abort listener after reading a long stream", async () => {
    let outstanding = 0;
    let most = 0;
    const add = AbortSignal.prototype.addEventListener;
    const remove = AbortSignal.prototype.removeEventListener;
    vi.spyOn(AbortSignal.prototype, "addEventListener").mockImplementation(
      function (this: AbortSignal, ...args: Parameters<typeof add>) {
        if (args[0] === "abort") {
          outstanding += 1;
          most = Math.max(most, outstanding);
        }
        add.apply(this, args);
      }
    );
    vi.spyOn(AbortSignal.prototype, "removeEventListener").mockImplementation(
      function (this: AbortSignal, ...args: Parameters<typeof remove>) {
        if (args[0] === "abort") outstanding -= 1;
        remove.apply(this, args);
      }
    );
    const { stream } = pulledBody(() =>
      records([...Array.from({ length: 64 }, () => DELTA), DONE])
    );
    const reply = await exchange(
      options(
        () =>
          new Response(stream, {
            headers: { "content-type": "text/event-stream" },
          }),
        { stream: true, timeoutMs: 5000 }
      ),
      REQUEST,
      new AbortController().signal
    );
    expect(reply.text).toBe("a".repeat(64));
    expect(outstanding).toBe(0);
    expect(most).toBeLessThanOrEqual(3);
  });

  it("cancels the upstream body once the stream says it is done", async () => {
    const { stream, seen } = pulledBody(() => records([DELTA, DONE]), true);
    await exchange(
      options(
        () =>
          new Response(stream, {
            headers: { "content-type": "text/event-stream" },
          }),
        { stream: true }
      ),
      REQUEST
    );
    expect(seen.cancelled).toBe(true);
  });

  it("cancels the upstream body when a stream outgrows the limit", async () => {
    const { stream, seen } = pulledBody(() => repeated(MAX_RESPONSE_BYTES * 2));
    await expect(
      exchange(
        options(
          () =>
            new Response(stream, {
              headers: { "content-type": "text/event-stream" },
            }),
          { stream: true }
        ),
        REQUEST
      )
    ).rejects.toMatchObject({ code: "payload-too-large" });
    expect(seen.cancelled).toBe(true);
  });

  it("times out while the headers are still being resolved", async () => {
    await expect(
      exchange(
        options(() => new Response("{}", json()), {
          headers: () => new Promise<HeadersInit>(() => undefined),
          timeoutMs: 10,
        }),
        REQUEST
      )
    ).rejects.toThrow(/timed out after 10ms/);
  });

  it("stops reading a body when the caller cancels mid-read", async () => {
    const controller = new AbortController();
    const { stream } = pulledBody(() => repeated(2 * CHUNK_BYTES), true);
    const pending = exchange(
      options(() => new Response(stream, json())),
      REQUEST,
      controller.signal
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    controller.abort();
    await expect(pending).rejects.toThrow(/cancelled/);
  });
});

describe("exchange body limits", () => {
  it("stops reading an oversized reply at the limit when no length is given", async () => {
    const { stream, seen } = pulledBody(() => repeated(4 * MAX_RESPONSE_BYTES));
    await expect(
      exchange(
        options(() => new Response(stream, json())),
        REQUEST
      )
    ).rejects.toMatchObject({ code: "payload-too-large" });
    expect(seen.pulled).toBeLessThanOrEqual(MAX_RESPONSE_BYTES + CHUNK_BYTES);
    expect(seen.cancelled).toBe(true);
  });

  it("refuses an oversized reply from its length before reading it", async () => {
    const { stream, seen } = pulledBody(() => repeated(4 * MAX_RESPONSE_BYTES));
    await expect(
      exchange(
        options(
          () =>
            new Response(
              stream,
              json({ "content-length": String(4 * MAX_RESPONSE_BYTES) })
            )
        ),
        REQUEST
      )
    ).rejects.toMatchObject({ code: "payload-too-large" });
    expect(seen.pulled).toBe(0);
    expect(seen.cancelled).toBe(true);
  });

  it("reads only a short diagnostic from a failed reply", async () => {
    const { stream, seen } = pulledBody(() => repeated(1024 * 1024));
    await expect(
      exchange(
        options(
          () =>
            new Response(stream, {
              status: 500,
              headers: { "content-type": "text/plain" },
            })
        ),
        REQUEST
      )
    ).rejects.toThrow(/^agent HTTP 500: x+$/);
    expect(seen.pulled).toBeLessThanOrEqual(CHUNK_BYTES);
    expect(seen.cancelled).toBe(true);
  });

  it("keeps a short error body's details", async () => {
    await expect(
      exchange(
        options(() => new Response("backend is down", { status: 503 })),
        REQUEST
      )
    ).rejects.toThrow("agent HTTP 503: backend is down");
  });

  it("reads a valid reply under the limit, with or without a length", async () => {
    const body = JSON.stringify({
      schemaVersion: AGENT_SCHEMA_VERSION,
      text: "fine",
    });
    const lengths: Record<string, string>[] = [
      {},
      { "content-length": String(encoder.encode(body).byteLength) },
    ];
    for (const headers of lengths) {
      const reply = await exchange(
        options(() => new Response(body, json(headers))),
        REQUEST
      );
      expect(reply.text).toBe("fine");
    }
  });
});
