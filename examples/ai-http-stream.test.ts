import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createTextFieldReader, readSseData } from "./ai-http-stream.ts";

/** An SSE body, delivered in whatever pieces the test names. */
function sseBody(chunks: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(
  stream: ReadableStream<Uint8Array> | null
): Promise<string[]> {
  const out: string[] = [];
  for await (const data of readSseData(stream)) out.push(data);
  return out;
}

/** Push a whole document through in fixed-size pieces. */
function stream(document: string, size: number): string[] {
  const reader = createTextFieldReader("text");
  const out: string[] = [];
  for (let at = 0; at < document.length; at += size) {
    const decoded = reader.push(document.slice(at, at + size));
    if (decoded) out.push(decoded);
  }
  return out;
}

describe("reading a Server-Sent Events body", () => {
  it("yields one payload per event", async () => {
    const data = await collect(
      sseBody(['data: {"a":1}\n\n', 'data: {"a":2}\n\n'])
    );

    assert.deepEqual(data, ['{"a":1}', '{"a":2}']);
  });

  it("waits for an event split across chunks", async () => {
    // A network chunk has nothing to do with an event boundary.
    const data = await collect(sseBody(['data: {"a"', ":1}\n\n"]));

    assert.deepEqual(data, ['{"a":1}']);
  });

  it("joins an event's continuation lines and ignores its other fields", async () => {
    const data = await collect(
      sseBody(["event: message\ndata: one\ndata: two\nid: 7\n\n"])
    );

    assert.deepEqual(data, ["one\ntwo"]);
  });

  it("delivers a last event that never got its blank line", async () => {
    const data = await collect(sseBody(["data: tail"]));

    assert.deepEqual(data, ["tail"]);
  });

  it("reads nothing from a body that is not there", async () => {
    assert.deepEqual(await collect(null), []);
  });
});

describe("decoding the reply out of streaming JSON", () => {
  it("hands back the answer, never the JSON around it", () => {
    const pieces = stream('{"text":"Sorted by total."}', 4);

    // The reader must never see `{"text":"Sor`.
    assert.equal(pieces.join(""), "Sorted by total.");
    for (const piece of pieces) assert.ok(!piece.includes('"text"'));
  });

  it("concatenates to exactly what JSON.parse produces, at any chunk size", () => {
    const document =
      '{"text":"Line one.\\nLine two — \\"quoted\\", \\u00e9 and \\ud83d\\ude00.","toolCalls":[]}';
    const parsed = (JSON.parse(document) as { text: string }).text;

    for (const size of [1, 2, 3, 5, 13, 64, 4096]) {
      assert.equal(stream(document, size).join(""), parsed, `size ${size}`);
    }
  });

  it("holds back an escape that is split across chunks", () => {
    const reader = createTextFieldReader("text");

    assert.equal(reader.push('{"text":"a\\'), "a");
    // Not "a\\" — the escape is not an answer until the rest of it lands.
    assert.equal(reader.push("u00e9"), "é");
  });

  it("stops at the end of the value and says nothing about the rest", () => {
    const reader = createTextFieldReader("text");
    reader.push('{"text":"done","toolCalls":[{"id":"c1"}]}');

    assert.equal(reader.text(), "done");
    assert.equal(reader.push('{"text":"again"}'), "");
  });

  it("reads the reply's own field, not one inside a tool call", () => {
    const document =
      '{"toolCalls":[{"id":"c1","name":"view.setSearch","args":{"text":"not the answer"}}],"text":"Searched."}';

    assert.equal(stream(document, 7).join(""), "Searched.");
  });

  it("says nothing until the field arrives", () => {
    const reader = createTextFieldReader("text");

    assert.equal(reader.push('{"toolCalls":[],'), "");
    assert.equal(reader.push('"text":"Here."}'), "Here.");
  });

  it("says nothing for a document that never carries the field", () => {
    assert.equal(stream('{"toolCalls":[]}', 3).join(""), "");
  });
});
