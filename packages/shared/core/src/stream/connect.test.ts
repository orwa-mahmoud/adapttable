import { afterEach, describe, expect, it, vi } from "vitest";

import { openRowPatchStream } from "./connect";
import { FakeSocket } from "./fakes";

afterEach(() => {
  vi.useRealTimers();
});

/** A connector wired to fakes, plus the sockets it opened. */
function wsStream(over: Record<string, unknown> = {}) {
  const sockets: FakeSocket[] = [];
  const onMessage = vi.fn();
  const onStatus = vi.fn();
  const handle = openRowPatchStream({
    websocket: "wss://test/rows",
    createWebSocket: (url, protocols) => {
      const socket = new FakeSocket(url, protocols);
      sockets.push(socket);
      return socket;
    },
    onMessage,
    onStatus,
    ...over,
  });
  return { sockets, onMessage, onStatus, handle };
}

describe("openRowPatchStream", () => {
  it("stays idle with no url — nothing opens, nothing retries", () => {
    const onStatus = vi.fn();
    const handle = openRowPatchStream({ onMessage: vi.fn(), onStatus });
    expect(handle.status).toBe("idle");
    expect(onStatus).toHaveBeenCalledWith("idle", null);
    handle.close();
    expect(handle.status).toBe("closed");
  });

  it("opens a websocket and forwards its text frames", () => {
    const { sockets, onMessage, handle } = wsStream({ protocols: "patch-v1" });
    expect(handle.status).toBe("connecting");
    expect(sockets[0]?.url).toBe("wss://test/rows");
    expect(sockets[0]?.protocols).toBe("patch-v1");
    sockets[0]?.open();
    expect(handle.status).toBe("open");
    sockets[0]?.push('{"type":"remove","id":"a"}');
    expect(onMessage).toHaveBeenCalledWith('{"type":"remove","id":"a"}');
    handle.close();
  });

  it("ignores a frame whose data is not text", () => {
    const { sockets, onMessage, handle } = wsStream();
    sockets[0]?.open();
    sockets[0]?.push(42 as unknown as string);
    expect(onMessage).not.toHaveBeenCalled();
    handle.close();
  });

  it("reopens a dropped websocket after the delay", () => {
    vi.useFakeTimers();
    const { sockets, handle } = wsStream({ reconnect: { delayMs: 10 } });
    sockets[0]?.open();
    sockets[0]?.drop();
    expect(handle.status).toBe("reconnecting");
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(10);
    expect(sockets).toHaveLength(2);
    sockets[1]?.open();
    expect(handle.status).toBe("open");
    handle.close();
  });

  it("stops once the retry budget is spent", () => {
    vi.useFakeTimers();
    const { sockets, handle } = wsStream({
      reconnect: { delayMs: 5, maxAttempts: 1 },
    });
    sockets[0]?.open();
    sockets[0]?.drop();
    expect(handle.status).toBe("reconnecting");
    vi.advanceTimersByTime(5);
    sockets[1]?.drop();
    expect(handle.status).toBe("error");
    handle.close();
  });

  it("a host close is final — no reopen, no pending timer", () => {
    vi.useFakeTimers();
    const { sockets, handle } = wsStream({ reconnect: { delayMs: 5 } });
    sockets[0]?.open();
    sockets[0]?.drop();
    handle.close();
    expect(handle.status).toBe("closed");
    vi.advanceTimersByTime(100);
    expect(sockets).toHaveLength(1);
    handle.close();
    expect(handle.status).toBe("closed");
  });

  it("an error frame retries rather than giving up", () => {
    vi.useFakeTimers();
    const { sockets, handle } = wsStream({ reconnect: { delayMs: 5 } });
    sockets[0]?.open();
    sockets[0]?.fail();
    expect(handle.status).toBe("reconnecting");
    vi.advanceTimersByTime(5);
    expect(sockets).toHaveLength(2);
    handle.close();
  });

  it("an error and a close on the same socket retry once, not twice", () => {
    // Browsers fire both; detaching before close is what keeps that one drop.
    vi.useFakeTimers();
    const { sockets, handle } = wsStream({ reconnect: { delayMs: 5 } });
    sockets[0]?.open();
    sockets[0]?.fail();
    sockets[0]?.drop();
    expect(handle.status).toBe("reconnecting");
    vi.advanceTimersByTime(5);
    expect(sockets).toHaveLength(2);
    handle.close();
  });

  it("says so when the environment has no WebSocket", () => {
    // jsdom supplies one; an embedded webview or a Node runtime may not.
    const real = globalThis.WebSocket;
    Reflect.deleteProperty(globalThis, "WebSocket");
    const onStatus = vi.fn();
    const handle = openRowPatchStream({
      websocket: "wss://test/rows",
      onMessage: vi.fn(),
      onStatus,
    });
    expect(handle.status).toBe("error");
    expect(onStatus).toHaveBeenCalledWith("error", expect.any(Error));
    handle.close();
    globalThis.WebSocket = real;
  });
});

describe("openRowPatchStream — event source", () => {
  function sseStream(over: Record<string, unknown> = {}) {
    const sockets: FakeSocket[] = [];
    const onMessage = vi.fn();
    const handle = openRowPatchStream({
      eventSource: "https://test/rows",
      createEventSource: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
      onMessage,
      onStatus: vi.fn(),
      ...over,
    });
    return { sockets, onMessage, handle };
  }

  it("listens on the named event", () => {
    const { sockets, onMessage, handle } = sseStream({ event: "patch" });
    sockets[0]?.open();
    sockets[0]?.push("ignored", "message");
    expect(onMessage).not.toHaveBeenCalled();
    sockets[0]?.push('{"type":"remove","id":"a"}', "patch");
    expect(onMessage).toHaveBeenCalledOnce();
    handle.close();
  });

  it("leaves EventSource's own retry alone", () => {
    // It reconnects by itself while CONNECTING; opening a second one here
    // would give the server two subscriptions for one table.
    const { sockets, handle } = sseStream();
    sockets[0]?.open();
    sockets[0]?.sseConnecting();
    expect(handle.status).toBe("reconnecting");
    expect(sockets).toHaveLength(1);
    handle.close();
  });

  it("an event source that closed for good is an error", () => {
    const { sockets, handle } = sseStream({ reconnect: { maxAttempts: 0 } });
    sockets[0]?.open();
    sockets[0]?.sseClosed();
    expect(handle.status).toBe("error");
    handle.close();
  });

  it("says so when the environment has no EventSource", () => {
    const real = globalThis.EventSource;
    Reflect.deleteProperty(globalThis, "EventSource");
    const handle = openRowPatchStream({
      eventSource: "https://test/rows",
      onMessage: vi.fn(),
      onStatus: vi.fn(),
    });
    expect(handle.status).toBe("error");
    handle.close();
    if (real) globalThis.EventSource = real;
  });
});

describe("openRowPatchStream — leaving a socket clean", () => {
  it("detaches its listeners on close, so a reused socket stays quiet", () => {
    const sockets: FakeSocket[] = [];
    const onMessage = vi.fn();
    const handle = openRowPatchStream({
      websocket: "wss://test/rows",
      createWebSocket: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
      onMessage,
      onStatus: vi.fn(),
    });
    sockets[0]?.open();
    handle.close();
    // A host that kept the socket and pushes again hears nothing from us.
    sockets[0]?.push('{"type":"remove","id":"a"}');
    expect(onMessage).not.toHaveBeenCalled();
  });
});
