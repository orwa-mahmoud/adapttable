/**
 * Reading a provider's stream — SSE framing, and the reply text inside it.
 *
 * Two small pieces the backend example needs and nothing else provides:
 *
 * - {@link readSseData} turns a `fetch` body into the `data:` payloads of a
 *   Server-Sent Events stream. Every provider here speaks SSE; only the JSON
 *   inside each payload differs.
 * - {@link createTextFieldReader} is the part that is easy to get wrong. The
 *   providers are asked for a JSON object, so what arrives is fragments of
 *   JSON, not fragments of the answer. Forwarding those raw would put
 *   `{"text":"Sor` in front of a reader. This decodes the growing value of one
 *   top-level string field and hands back only what is newly complete, so the
 *   pieces concatenate to exactly the value `JSON.parse` produces at the end.
 *
 * Fetch and `ReadableStream` only. No provider SDK.
 */

/** Payloads of a Server-Sent Events body, one `data:` value at a time. */
export async function* readSseData(
  body: ReadableStream<Uint8Array> | null
): AsyncGenerator<string> {
  if (!body) return;
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // An event ends at a blank line. A chunk may carry several, or half of
      // one — which is why the tail stays in the buffer.
      let split = buffer.indexOf("\n\n");
      while (split >= 0) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const data = dataOf(frame);
        if (data !== undefined) yield data;
        split = buffer.indexOf("\n\n");
      }
    }
    const last = dataOf(buffer);
    if (last !== undefined) yield last;
  } finally {
    reader.releaseLock();
  }
}

/** The `data:` value of one event frame, with its continuation lines joined. */
function dataOf(frame: string): string | undefined {
  const lines = frame.split("\n").filter((line) => line.startsWith("data:"));
  if (lines.length === 0) return undefined;
  return lines.map((line) => line.slice(5).trimStart()).join("\n");
}

/** Reads one top-level string field out of JSON as it arrives. */
export interface TextFieldReader {
  /**
   * Take the next fragment of JSON.
   *
   * @param chunk - More of the document.
   * @returns The newly decoded characters of the field, or `""` when the
   *   fragment did not complete any.
   */
  readonly push: (chunk: string) => string;
  /** Everything decoded so far. */
  readonly text: () => string;
}

/**
 * Decode one top-level string field from a JSON document as it streams.
 *
 * @param field - The key to read. Top level only: a `"text"` nested inside a
 *   tool call's arguments is not the reply, and matching it would put an
 *   argument value in front of the reader.
 * @returns A reader that hands back each newly complete run of characters.
 */
export function createTextFieldReader(field = "text"): TextFieldReader {
  let raw = "";
  // Where the field's value starts, once the key has been found.
  let cursor = -1;
  let decoded = "";
  let finished = false;

  const push = (chunk: string): string => {
    if (finished) return "";
    raw += chunk;
    if (cursor < 0) {
      cursor = locate(raw, field);
      if (cursor < 0) return "";
    }
    let out = "";
    let index = cursor;
    while (index < raw.length) {
      const ch = raw[index];
      if (ch === '"') {
        finished = true;
        break;
      }
      if (ch === "\\") {
        const escape = escapeAt(raw, index);
        // An escape split across two chunks waits for the rest rather than
        // being emitted as a backslash the reader would see.
        if (!escape) break;
        out += escape.value;
        index += escape.length;
        continue;
      }
      out += ch;
      index += 1;
    }
    cursor = index;
    decoded += out;
    return out;
  };

  return { push, text: () => decoded };
}

/** One decoded escape sequence, when all of it has arrived. */
function escapeAt(
  raw: string,
  index: number
): { value: string; length: number } | undefined {
  const next = raw[index + 1];
  if (next === undefined) return undefined;
  const length = next === "u" ? 6 : 2;
  if (index + length > raw.length) return undefined;
  try {
    return {
      value: JSON.parse(`"${raw.slice(index, index + length)}"`) as string,
      length,
    };
  } catch {
    // Not an escape JSON knows. Passing the backslash through keeps the text
    // readable rather than stalling the stream on one malformed character.
    return { value: raw.slice(index, index + 2), length: 2 };
  }
}

/** How far a scan of the document has got. */
interface Scan {
  depth: number;
  inString: boolean;
  escaped: boolean;
  /** Where the key currently being read began, or `-1`. */
  keyStart: number;
  lastKey: string;
  /** Where the wanted field's value begins, once it is known. */
  found: number;
}

/**
 * One character inside a string literal.
 *
 * Only the closing quote matters, and only because the text it closes may have
 * been a key — an escaped quote is content, not the end.
 */
function stepInString(
  scan: Scan,
  raw: string,
  index: number,
  ch: string
): void {
  if (scan.escaped) {
    scan.escaped = false;
    return;
  }
  if (ch === "\\") {
    scan.escaped = true;
    return;
  }
  if (ch !== '"') return;
  scan.inString = false;
  if (scan.keyStart >= 0) {
    scan.lastKey = raw.slice(scan.keyStart, index);
    scan.keyStart = -1;
  }
}

/**
 * One character of structure.
 *
 * A quote at depth 1 is either a key or the value the caller asked for, and
 * which one it is depends on the character before it.
 */
function stepStructure(
  scan: Scan,
  raw: string,
  index: number,
  ch: string,
  field: string
): void {
  if (ch === '"') {
    scan.inString = true;
    if (scan.depth !== 1) return;
    const previous = previousMeaningful(raw, index);
    if (previous === "{" || previous === ",") scan.keyStart = index + 1;
    else if (previous === ":" && scan.lastKey === field) scan.found = index + 1;
    return;
  }
  if (ch === "{" || ch === "[") scan.depth += 1;
  else if (ch === "}" || ch === "]") scan.depth -= 1;
}

/**
 * Where a top-level field's string value starts, or `-1`.
 *
 * A real scan rather than `indexOf`: the document contains tool-call
 * arguments, and a key of the same name inside one of those is somebody's
 * argument, not the answer.
 */
function locate(raw: string, field: string): number {
  const scan: Scan = {
    depth: 0,
    inString: false,
    escaped: false,
    keyStart: -1,
    lastKey: "",
    found: -1,
  };
  for (let index = 0; index < raw.length; index += 1) {
    const ch = raw[index];
    if (ch === undefined) continue;
    if (scan.inString) stepInString(scan, raw, index, ch);
    else stepStructure(scan, raw, index, ch, field);
    if (scan.found >= 0) return scan.found;
  }
  return -1;
}

/** The last character before `index` that is not whitespace. */
function previousMeaningful(raw: string, index: number): string {
  for (let at = index - 1; at >= 0; at -= 1) {
    const ch = raw[at];
    if (ch !== undefined && !/\s/.test(ch)) return ch;
  }
  return "";
}
