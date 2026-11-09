/**
 * Shell operations are the owner's object when armed, and absent otherwise.
 */
import { describe, expect, it, vi } from "vitest";

import {
  projectShellOperations,
  SHELL_OPERATION_OWNERS,
  withShellOperations,
} from "./shellOperations";
import type { TableRuntimeView } from "./tableRuntime";

const noop = (): void => undefined;

const view = (): TableRuntimeView => ({
  rows: [],
  getRowId: () => "",
  rowLabel: () => "",
});

describe("projectShellOperations", () => {
  it("names an owner for every shell operation and nothing else", () => {
    expect(Object.keys(SHELL_OPERATION_OWNERS)).toEqual([
      "find",
      "density",
      "fullscreen",
      "contextMenu",
      "commandPalette",
      "print",
    ]);
  });

  it("returns the owner's object when the operation is armed", () => {
    const find = {
      open: true,
      query: "ada",
      setOpen: noop,
      setQuery: noop,
      openBar: noop,
    };
    const fullscreen = { supported: true, active: false, toggle: noop };
    const density = { density: "compact" as const, onDensityChange: noop };
    const contextMenu = { items: [] };
    const commandPalette = { commands: [] };
    const print = { onPrint: vi.fn() };
    const projected = projectShellOperations({
      find,
      fullscreen,
      density,
      contextMenu,
      commandPalette,
      print,
    });
    expect(projected.find).toBe(find);
    expect(projected.fullscreen).toBe(fullscreen);
    expect(projected.density).toBe(density);
    expect(projected.contextMenu).toBe(contextMenu);
    expect(projected.commandPalette).toBe(commandPalette);
    expect(projected.print).toBe(print);
  });

  it("omits find that cannot open and fullscreen the browser refuses", () => {
    const projected = projectShellOperations({
      find: { open: false, query: "", setOpen: noop, setQuery: noop },
      fullscreen: { supported: false, active: false, toggle: noop },
    });
    expect(projected.find).toBeUndefined();
    expect(projected.fullscreen).toBeUndefined();
  });

  it("clears an operation that is no longer armed", () => {
    const armed = withShellOperations(view(), {
      find: {
        open: true,
        query: "a",
        setOpen: noop,
        setQuery: noop,
        openBar: noop,
      },
    });
    expect(armed.find?.openBar).toBeTypeOf("function");
    const cleared = withShellOperations(armed, {
      find: { open: false, query: "", setOpen: noop, setQuery: noop },
    });
    expect(cleared.find).toBeUndefined();
  });
});
