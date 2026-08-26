import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FakeSocket } from "./fakes";
import {
  useRowPatchStream,
  type UseRowPatchStreamOptions,
} from "./useRowPatchStream";

interface Row {
  id: string;
  name: string;
}
const ROWS: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bo" },
];

/** Mount the hook over a host-owned array, driving a fake socket. */
function mount(over: Partial<UseRowPatchStreamOptions<Row>> = {}) {
  const sockets: FakeSocket[] = [];
  let rows: readonly Row[] = ROWS;
  const view = renderHook(() =>
    useRowPatchStream<Row>({
      websocket: "ws://test/rows",
      getRowId: (row) => row.id,
      onPatch: (update) => {
        rows = update(rows);
      },
      createWebSocket: (url: string) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
      ...over,
    })
  );
  return { sockets, view, current: () => rows };
}

/**
 * The table never owns the data, and a socket does not change that: frames
 * become patches, patches go back through the host's own setter.
 */
describe("useRowPatchStream", () => {
  it("applies a frame to the host's rows", () => {
    const { sockets, view, current } = mount();
    act(() => sockets[0]?.open());
    expect(view.result.current.status).toBe("open");
    act(() => {
      sockets[0]?.push(
        '[{"type":"update","id":"a","changes":{"name":"Ada L"}}]'
      );
    });
    expect(current().find((row) => row.id === "a")?.name).toBe("Ada L");
    // The array is replaced, never mutated — the host's previous one stands.
    expect(ROWS[0]?.name).toBe("Ada");
  });

  it("reports what arrived, after it is applied", () => {
    const onPatches = vi.fn();
    const { sockets } = mount({ onPatches });
    act(() => sockets[0]?.open());
    act(() => sockets[0]?.push('{"type":"remove","id":"b"}'));
    expect(onPatches).toHaveBeenCalledWith([{ type: "remove", id: "b" }]);
  });

  it("ignores a frame that carries no usable patch", () => {
    const onPatches = vi.fn();
    const { sockets, current } = mount({ onPatches });
    act(() => sockets[0]?.open());
    act(() => sockets[0]?.push("}{ not json"));
    expect(onPatches).not.toHaveBeenCalled();
    expect(current()).toBe(ROWS);
  });

  it("takes a host's own wire format", () => {
    const { sockets, current } = mount({
      parse: (frame: string) =>
        frame === "drop-a" ? [{ type: "remove", id: "a" }] : [],
    });
    act(() => sockets[0]?.open());
    act(() => sockets[0]?.push("drop-a"));
    expect(current().map((row) => row.id)).toEqual(["b"]);
  });

  it("stays idle — and opens nothing — while disabled", () => {
    const { sockets, view } = mount({ enabled: false });
    expect(sockets).toHaveLength(0);
    expect(view.result.current.status).toBe("idle");
  });

  it("closes the socket when the component goes away", () => {
    const { sockets, view } = mount();
    act(() => sockets[0]?.open());
    view.unmount();
    expect(sockets[0]?.readyState).toBe(3);
  });

  it("surfaces the reason it gave up", () => {
    const { sockets, view } = mount({ reconnect: { maxAttempts: 0 } });
    act(() => sockets[0]?.open());
    act(() => sockets[0]?.drop());
    expect(view.result.current.status).toBe("error");
    expect(view.result.current.error).toBeInstanceOf(Error);
  });

  it("closes on request, and stays closed", () => {
    const { sockets, view } = mount();
    act(() => sockets[0]?.open());
    act(() => view.result.current.close());
    expect(view.result.current.status).toBe("closed");
  });
});

describe("useRowPatchStream — server-sent events", () => {
  it("applies patches from a named SSE event", () => {
    const sockets: FakeSocket[] = [];
    let rows: readonly Row[] = ROWS;
    const view = renderHook(() =>
      useRowPatchStream<Row>({
        eventSource: "https://test/rows",
        event: "patch",
        getRowId: (row) => row.id,
        onPatch: (update) => {
          rows = update(rows);
        },
        createEventSource: (url) => {
          const socket = new FakeSocket(url);
          sockets.push(socket);
          return socket;
        },
      })
    );
    act(() => sockets[0]?.open());
    expect(view.result.current.status).toBe("open");
    act(() => sockets[0]?.push('{"type":"remove","id":"a"}', "patch"));
    expect(rows.map((row) => row.id)).toEqual(["b"]);
  });
});
