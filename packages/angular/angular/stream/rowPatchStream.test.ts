/**
 * A live patch feed bound to the host's rows: frames become patches applied
 * through the host's own signal, and the connection follows its URL.
 */
import { FakeSocket, type RowPatch } from "@adapttable/core";
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { injectRowPatchStream } from "./index";

/** A WebSocket's closed state. */
const CLOSED = 3;

interface Row {
  id: string;
  name: string;
}

const ROWS: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bo" },
];

function mount(
  over: {
    url?: ReturnType<typeof signal<string | undefined>>;
    enabled?: ReturnType<typeof signal<boolean>>;
  } = {}
) {
  const injector = createEnvironmentInjector(
    [],
    TestBed.inject(EnvironmentInjector)
  );
  const rows = signal<readonly Row[]>(ROWS);
  const sockets: FakeSocket[] = [];
  const onPatches = vi.fn<(patches: readonly RowPatch<Row>[]) => void>();
  const stream = injectRowPatchStream<Row>({
    websocket: over.url ?? "wss://test/rows",
    enabled: over.enabled,
    getRowId: (row) => row.id,
    onPatch: (update) => {
      rows.update(update);
    },
    onPatches,
    createWebSocket: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
    injector,
  });
  TestBed.tick();
  return { injector, rows, sockets, stream, onPatches };
}

describe("injectRowPatchStream", () => {
  it("applies each frame to the host's rows through its own signal", () => {
    const { rows, sockets, stream, onPatches, injector } = mount();
    expect(sockets).toHaveLength(1);
    sockets[0]!.open();
    expect(stream.status()).toBe("open");
    sockets[0]!.push('[{"type":"update","id":"a","changes":{"name":"Ada L"}}]');
    expect(rows().find((row) => row.id === "a")?.name).toBe("Ada L");
    // The array is replaced, never mutated.
    expect(ROWS[0]!.name).toBe("Ada");
    expect(onPatches).toHaveBeenCalledWith([
      { type: "update", id: "a", changes: { name: "Ada L" } },
    ]);
    injector.destroy();
  });

  it("ignores a frame that carries no patch", () => {
    const { rows, sockets, onPatches, injector } = mount();
    sockets[0]!.open();
    sockets[0]!.push("not json");
    expect(rows()).toBe(ROWS);
    expect(onPatches).not.toHaveBeenCalled();
    injector.destroy();
  });

  it("reopens on a new URL, stays idle without one, and closes when the context goes", () => {
    const url = signal<string | undefined>("wss://test/one");
    const { sockets, stream, injector } = mount({ url });
    sockets[0]!.open();
    url.set("wss://test/two");
    TestBed.tick();
    expect(sockets).toHaveLength(2);
    expect(sockets[0]!.readyState).toBe(CLOSED);
    expect(sockets[1]!.url).toBe("wss://test/two");
    url.set(undefined);
    TestBed.tick();
    expect(stream.status()).toBe("idle");
    expect(sockets[1]!.readyState).toBe(CLOSED);
    url.set("wss://test/three");
    TestBed.tick();
    injector.destroy();
    expect(sockets[2]!.readyState).toBe(CLOSED);
  });

  it("stays shut while disabled, and closes on request", () => {
    const enabled = signal(false);
    const { sockets, stream, injector } = mount({ enabled });
    expect(sockets).toHaveLength(0);
    expect(stream.status()).toBe("idle");
    enabled.set(true);
    TestBed.tick();
    sockets[0]!.open();
    stream.close();
    expect(sockets[0]!.readyState).toBe(CLOSED);
    injector.destroy();
  });
});
