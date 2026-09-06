/**
 * The operations map is the agent's only honest answer to "what can this
 * table do right now?".
 *
 * It is derived from the composed view, never from a feature list: a feature
 * can be installed and still hand the table no callback, and a capability
 * advertised on that basis would fail the moment it ran.
 */
import { describe, expect, it } from "vitest";

import type { TableRuntimeView } from "../features/providers";
import { deriveRuntimeOperations } from "./deriveRuntimeOperations";

const view = (patch: Partial<TableRuntimeView> = {}): TableRuntimeView => ({
  rows: [],
  getRowId: () => "",
  rowLabel: () => "",
  ...patch,
});

describe("deriveRuntimeOperations", () => {
  it("reports nothing wired on a bare view", () => {
    const ops = deriveRuntimeOperations(view());

    expect(ops.pinColumn).toBe(false);
    expect(ops.pinRow).toBe(false);
  });

  it("reports nothing at all when there is no view yet", () => {
    expect(deriveRuntimeOperations(undefined).pinColumn).toBe(false);
  });

  it("follows the pinning setters, not the pinning bundle", () => {
    // A table that publishes its pin STATE but no setter is showing the agent
    // what is pinned while giving it no way to change it. That is not a
    // capability, and advertising it would be a promise the table breaks.
    const readOnly = deriveRuntimeOperations(
      view({ pinning: { columns: { name: "start" } } })
    );
    expect(readOnly.pinColumn).toBe(false);
    expect(readOnly.pinRow).toBe(false);

    const wired = deriveRuntimeOperations(
      view({
        pinning: {
          columns: {},
          setColumnPin: () => undefined,
          setRowPin: () => undefined,
        },
      })
    );
    expect(wired.pinColumn).toBe(true);
    expect(wired.pinRow).toBe(true);
  });

  it("reports column and row pinning independently", () => {
    const ops = deriveRuntimeOperations(
      view({ pinning: { columns: {}, setColumnPin: () => undefined } })
    );

    // Column layout is always present; row pinning is an optional feature, so
    // one being wired says nothing about the other.
    expect(ops.pinColumn).toBe(true);
    expect(ops.pinRow).toBe(false);
  });
});
