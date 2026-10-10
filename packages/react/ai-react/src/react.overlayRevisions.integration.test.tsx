/** Real shell mutations must change session observations without moving engine axes. */
import type { RowProvenanceEnvelope } from "@adapttable/ai";
import { act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "./react.overlayHarness.test-utils";

afterEach(cleanup);

describe("React's real runtime producer exposes overlay revisions", () => {
  it("advances the session for hide, order and pin while the engine stays fixed", async () => {
    const host = await mountShell();
    const { session, shell, runtime } = host.read();
    const engine = shell.chrome.source.tableEngine!;
    const engineRevision = { ...engine.snapshot().revisions };
    const neutral = runtime.view()!.neutralTable;
    let revision = session.manifest().viewRevision;
    const change = async (run: Parameters<typeof host.change>[0]) => {
      await host.change(run);
      expect(host.read().runtime.view()!.neutralTable).toBe(neutral);
      expect(engine.snapshot().revisions).toEqual(engineRevision);
      expect(session.manifest().viewRevision).toBeGreaterThan(revision);
      revision = session.manifest().viewRevision;
    };
    await change(({ shell }) =>
      shell.chrome.columnLayout.setHidden("team", true)
    );
    expect(host.read().runtime.view()!.columnLayout?.hidden).toEqual(["team"]);
    await change(({ shell }) =>
      shell.chrome.columnLayout.setOrder(["secret", "team", "name"])
    );
    expect(host.read().runtime.view()!.columnLayout?.keys).toEqual([
      "secret",
      "team",
      "name",
    ]);
    await change(({ shell }) =>
      shell.chrome.columnLayout.setPinned("name", "start")
    );
    expect(host.read().runtime.view()!.pinning?.columns).toEqual({
      name: "start",
    });

    const count = host.published.length;
    await host.change(({ shell }) =>
      shell.chrome.columnLayout.setOrder(["secret", "team", "name"])
    );
    await host.change(({ shell }) =>
      shell.chrome.columnLayout.setHidden("team", true)
    );
    await host.change(({ shell }) =>
      shell.chrome.columnLayout.setPinned("name", "start")
    );
    await act(async () => {
      host.rerender();
      await Promise.resolve();
    });
    expect(session.manifest().viewRevision).toBe(revision);
    expect(host.published).toHaveLength(count);
    expect(engine.snapshot().revisions).toEqual(engineRevision);
  });

  it("counts semantic selection changes, not Set insertion order or fresh equal arrays", async () => {
    const host = await mountShell();
    const { session, shell } = host.read();
    const engine = shell.chrome.source.tableEngine!;
    const engineRevision = { ...engine.snapshot().revisions };
    const initial = session.manifest().viewRevision;
    await host.change(({ shell }) =>
      shell.chrome.table.selection!.replace(["2", "1"])
    );
    const selected = session.manifest().viewRevision;
    expect(selected).toBeGreaterThan(initial);
    expect([...host.read().runtime.view()!.selection!.selectedIds]).toEqual([
      "2",
      "1",
    ]);
    const publications = host.published.length;
    await host.change(({ shell }) =>
      shell.chrome.table.selection!.replace(["1", "2"])
    );
    await host.change(({ shell }) =>
      shell.chrome.table.selection!.replace(["1", "2"])
    );
    expect(session.manifest().viewRevision).toBe(selected);
    expect(host.published).toHaveLength(publications);
    await host.change(({ shell }) =>
      shell.chrome.table.selection!.replace(["1"])
    );
    expect(session.manifest().viewRevision).toBeGreaterThan(selected);
    expect(engine.snapshot().revisions).toEqual(engineRevision);
  });

  it("forwards all-matching scope without granting row or column access", async () => {
    const host = await mountShell();
    await host.change(({ shell }) =>
      shell.chrome.table.selection!.replace(["1"])
    );
    const { session, shell } = host.read();
    const engine = shell.chrome.source.tableEngine!;
    const engineRevision = { ...engine.snapshot().revisions };
    const before = session.manifest();
    expect(host.read().runtime.view()!.selection).toMatchObject({
      allMatching: false,
      acrossPages: true,
    });
    const read = async (id: string) => {
      const result = await act(async () =>
        session.execute(
          "rows.read",
          { offset: 0, limit: 10, scope: "visible" },
          session.manifest().viewRevision,
          id
        )
      );
      expect(result.ok).toBe(true);
      const envelope = result.result as RowProvenanceEnvelope;
      expect(envelope.source).toBe("table-rows");
      expect(envelope.untrusted).toBe(true);
      expect(envelope.revision).toBe(session.manifest().viewRevision);
      return envelope.rows;
    };
    const beforeRows = await read("before-scope");
    await host.change(({ shell }) =>
      shell.chrome.table.selection!.selectAllMatching()
    );
    const after = session.manifest();
    expect(after.viewRevision).toBeGreaterThan(before.viewRevision);
    expect(host.read().runtime.view()!.selection).toMatchObject({
      allMatching: true,
      acrossPages: true,
    });
    expect([...host.read().runtime.view()!.selection!.selectedIds]).toEqual([
      "1",
    ]);
    expect(after.source).toEqual(before.source);
    expect(after.columns).toEqual(before.columns);
    expect(after.capabilities).toEqual(before.capabilities);
    const afterRows = await read("after-scope");
    expect(afterRows).toEqual(beforeRows);
    expect(afterRows.redacted).toContain("secret");
    expect(afterRows.rows.every((row) => !("secret" in row.cells))).toBe(true);
    const count = host.published.length;
    await host.change(({ shell }) =>
      shell.chrome.table.selection!.selectAllMatching()
    );
    expect(session.manifest().viewRevision).toBe(after.viewRevision);
    expect(host.published).toHaveLength(count);
    await host.change(({ shell }) =>
      shell.chrome.table.selection!.replace(["1"])
    );
    expect(session.manifest().viewRevision).toBeGreaterThan(after.viewRevision);
    expect(host.read().runtime.view()!.selection).toMatchObject({
      allMatching: false,
      acrossPages: true,
    });
    expect(engine.snapshot().revisions).toEqual(engineRevision);
  });
});
