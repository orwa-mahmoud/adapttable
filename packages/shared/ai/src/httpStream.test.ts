import { describe, expect, it, vi } from "vitest";

import {
  AgentStreamError,
  createStreamReply,
  MAX_STREAM_EVENTS,
  parseStreamRecord,
  splitRecords,
} from "./httpStream";
import { AGENT_SCHEMA_VERSION } from "./keys";

function record(event: string, data?: unknown): string {
  return data === undefined
    ? `event: ${event}`
    : `event: ${event}\ndata: ${JSON.stringify(data)}`;
}

/** Feed a reply the records it would have read off the wire. */
function replay(records: readonly string[], onText?: (text: string) => void) {
  const reply = createStreamReply(onText);
  for (const raw of records) {
    const event = parseStreamRecord(raw);
    if (event && reply.absorb(event)) break;
  }
  return reply;
}

describe("decoding one record", () => {
  it("reads the event name and its JSON", () => {
    const event = parseStreamRecord(record("text-delta", { text: "Hi" }));

    expect(event).toEqual({ kind: "text-delta", data: { text: "Hi" } });
  });

  it("skips a comment, a keep-alive and an event from a later version", () => {
    // A proxy injects these, and a backend may add an event we have not heard
    // of. Neither is a protocol error.
    expect(parseStreamRecord(": keep-alive")).toBeUndefined();
    expect(parseStreamRecord("data: {}")).toBeUndefined();
    expect(parseStreamRecord(record("some-future-event", {}))).toBeUndefined();
  });

  it("refuses malformed JSON on an event meant for us", () => {
    expect(() => parseStreamRecord("event: text-delta\ndata: {oops")).toThrow(
      AgentStreamError
    );
    expect(() => parseStreamRecord("event: text-delta\ndata: {oops")).toThrow(
      /invalid JSON/
    );
  });

  it("treats a bodyless event as an empty one", () => {
    expect(parseStreamRecord(record("done"))).toEqual({
      kind: "done",
      data: {},
    });
  });
});

describe("splitting a growing buffer", () => {
  it("keeps a record that is still arriving", () => {
    const split = splitRecords("event: a\ndata: 1\n\nevent: b\ndata: 2");

    expect(split.records).toHaveLength(1);
    expect(split.rest).toBe("event: b\ndata: 2");
  });

  it("handles both line endings", () => {
    const split = splitRecords("event: a\r\ndata: 1\r\n\r\n");

    expect(split.records).toHaveLength(1);
    expect(split.rest).toBe("");
  });
});

describe("accumulating a reply", () => {
  it("joins the deltas into one text", () => {
    const reply = replay([
      record("text-delta", { text: "Showing " }),
      record("text-delta", { text: "page 2." }),
      record("done", { turnId: "t", phaseId: 0 }),
    ]);

    expect(reply.finish(AGENT_SCHEMA_VERSION).text).toBe("Showing page 2.");
  });

  it("reports the text as it grows", () => {
    const onText = vi.fn();
    replay(
      [
        record("text-delta", { text: "Sho" }),
        record("text-delta", { text: "wing" }),
        record("done"),
      ],
      onText
    );

    expect(onText.mock.calls.map((call) => call[0])).toEqual([
      "Sho",
      "Showing",
    ]);
  });

  it("holds the calls until the reply is complete", () => {
    const reply = createStreamReply();
    const calls = parseStreamRecord(
      record("tool-calls", {
        toolCalls: [{ id: "c0", name: "view.setPage", args: { page: 2 } }],
      })
    );
    expect(calls && reply.absorb(calls)).toBe(false);

    // Nothing is final until `done` — a stream abandoned here has run nothing.
    expect(reply.complete()).toBe(false);
    expect(() => reply.finish(AGENT_SCHEMA_VERSION)).toThrow(
      /ended without done/
    );
  });

  it("carries the calls once the reply is complete", () => {
    const reply = replay([
      record("text-delta", { text: "Paging." }),
      record("tool-calls", {
        toolCalls: [{ id: "c0", name: "view.setPage", args: { page: 2 } }],
      }),
      record("done"),
    ]);
    const finished = reply.finish(AGENT_SCHEMA_VERSION);

    expect(finished.toolCalls).toHaveLength(1);
    expect(finished.toolCalls?.[0]?.name).toBe("view.setPage");
    expect(finished.text).toBe("Paging.");
  });

  it("carries a question and a transcript", () => {
    const reply = replay([
      record("transcript", { text: "go to page two" }),
      record("ask-user", {
        id: "q1",
        question: "Which region?",
        allowFreeText: true,
      }),
      record("done"),
    ]);
    const finished = reply.finish(AGENT_SCHEMA_VERSION);

    expect(finished.transcript).toBe("go to page two");
    expect(finished.askUser?.id).toBe("q1");
  });

  it("refuses a stream that stopped without saying so", () => {
    const reply = replay([record("text-delta", { text: "half a sen" })]);

    // Not a shorter reply — a reply whose end nobody saw.
    expect(() => reply.finish(AGENT_SCHEMA_VERSION)).toThrow(AgentStreamError);
    expect(() => reply.finish(AGENT_SCHEMA_VERSION)).toThrow(
      /ended without done/
    );
  });

  it("surfaces a failure the backend reported mid-stream", () => {
    const reply = replay([
      record("text-delta", { text: "Working" }),
      record("error", { code: "provider-down", message: "upstream refused" }),
    ]);

    expect(reply.complete()).toBe(true);
    expect(() => reply.finish(AGENT_SCHEMA_VERSION)).toThrow(
      /upstream refused/
    );
  });

  it("refuses a stream that will not stop", () => {
    const reply = createStreamReply();
    const delta = { kind: "text-delta" as const, data: { text: "x" } };

    expect(() => {
      for (let sent = 0; sent <= MAX_STREAM_EVENTS; sent += 1) {
        reply.absorb(delta);
      }
    }).toThrow(/exceeded/);
  });

  it("produces the same reply the JSON path would have", () => {
    const streamed = replay([
      record("text-delta", { text: "Showing page 2." }),
      record("tool-calls", {
        toolCalls: [{ id: "c0", name: "view.setPage", args: { page: 2 } }],
      }),
      record("done"),
    ]).finish(AGENT_SCHEMA_VERSION);

    // Parity is the whole design: everything downstream is unchanged because
    // what it receives is unchanged.
    expect(streamed).toEqual({
      schemaVersion: AGENT_SCHEMA_VERSION,
      text: "Showing page 2.",
      toolCalls: [{ id: "c0", name: "view.setPage", args: { page: 2 } }],
    });
  });
});
