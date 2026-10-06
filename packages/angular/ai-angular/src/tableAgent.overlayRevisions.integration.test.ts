/** The actual Angular source/table/publisher owns every tested state change. */
import type {
  AgentManifest,
  AgentSession,
  RowProvenanceEnvelope,
} from "@adapttable/ai";
import {
  type ColumnDef,
  createFeatureState,
  injectDataTable,
  injectFrontendData,
  injectRowSelection,
  mountTableFeatures,
} from "@adapttable/angular";
import { tableRuntimeFor } from "@adapttable/angular/adapter";
import {
  Component,
  computed,
  inject,
  InjectionToken,
  Injector,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { tableAgent } from "./tableAgent";

interface Row {
  id: string;
  name: string;
  team: string;
  secret: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "A", secret: "private-one" },
  { id: "2", name: "Grace", team: "B", secret: "private-two" },
];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "secret", header: "Secret", accessor: (row) => row.secret },
];
const ACROSS_PAGES = new InjectionToken<boolean>(
  "overlay test selection scope",
  { factory: () => true }
);
@Component({ standalone: true, template: "" })
class Host {
  readonly injector = inject(Injector);
  readonly state = createFeatureState();
  readonly source = injectFrontendData({
    data: ROWS,
    columns: COLUMNS,
    getRowId: (row: Row) => row.id,
    urlSync: false,
    paginationMode: "paged",
  });
  readonly selection = injectRowSelection({
    rows: computed(() => this.source().rows),
    rowKey: (row: Row) => row.id,
    acrossPages: inject(ACROSS_PAGES),
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row: Row) => row.id,
    selection: this.selection,
  });
  readonly runtime = tableRuntimeFor(
    this.table,
    this.source,
    [],
    undefined,
    computed(() => ({
      columnLayoutLive: true,
      selection: this.selection.state(),
    }))
  );
}
const cleanups = new Set<() => void>();
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups.clear();
});

async function mountTable(acrossPages = true) {
  TestBed.configureTestingModule({
    providers: [{ provide: ACROSS_PAGES, useValue: acrossPages }],
  });
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  let session: AgentSession | undefined;
  const published: AgentManifest[] = [];
  const stop = mountTableFeatures(
    [
      tableAgent({
        tableId: "angular-overlays",
        columns: { secret: { readable: false } },
        bridge: {
          attach: (next) => {
            session = next;
          },
          publish: (manifest) => published.push(manifest),
        },
      }),
    ],
    { runtime: host.runtime, state: host.state, injector: host.injector }
  );
  fixture.autoDetectChanges();
  await fixture.whenStable();
  if (!session) throw new Error("The live Angular agent did not attach");
  const liveSession = session;
  cleanups.add(() => {
    stop();
    fixture.destroy();
  });
  return {
    host,
    session: liveSession,
    published,
    change: async (run: () => void) => {
      run();
      await fixture.whenStable();
    },
    tick: async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    },
  };
}

describe("Angular's real runtime producer exposes overlay revisions", () => {
  it("advances the session for hide, order and pin while the engine stays fixed", async () => {
    const { host, session, published, change, tick } = await mountTable();
    const engine = host.source().tableEngine!;
    const engineRevision = { ...engine.snapshot().revisions };
    const neutral = host.runtime.view()!.neutralTable;
    let revision = session.manifest().viewRevision;
    const changed = async (run: () => void) => {
      await change(run);
      expect(host.runtime.view()!.neutralTable).toBe(neutral);
      expect(engine.snapshot().revisions).toEqual(engineRevision);
      expect(session.manifest().viewRevision).toBeGreaterThan(revision);
      revision = session.manifest().viewRevision;
      expect(published.at(-1)?.viewRevision).toBe(revision);
    };
    await changed(() => host.table.layout().setHidden("team", true));
    expect(host.runtime.view()!.columnLayout?.hidden).toEqual(["team"]);
    await changed(() =>
      host.table.layout().setOrder(["secret", "team", "name"])
    );
    expect(host.runtime.view()!.columnLayout?.keys).toEqual([
      "secret",
      "team",
      "name",
    ]);
    await changed(() => host.table.layout().setPinned("name", "start"));
    expect(host.runtime.view()!.pinning?.columns).toEqual({ name: "start" });
    const count = published.length;
    await change(() =>
      host.table.layout().setOrder(["secret", "team", "name"])
    );
    await change(() => host.table.layout().setHidden("team", true));
    await change(() => host.table.layout().setPinned("name", "start"));
    await tick();
    expect(session.manifest().viewRevision).toBe(revision);
    expect(published).toHaveLength(count);
    expect(engine.snapshot().revisions).toEqual(engineRevision);
  });

  it("counts semantic selection changes, not Set insertion order or fresh equal arrays", async () => {
    const { host, session, published, change } = await mountTable();
    const engine = host.source().tableEngine!;
    const engineRevision = { ...engine.snapshot().revisions };
    const initial = session.manifest().viewRevision;
    await change(() => host.selection.replace(["2", "1"]));
    const selected = session.manifest().viewRevision;
    expect(selected).toBeGreaterThan(initial);
    expect([...host.runtime.view()!.selection!.selectedIds]).toEqual([
      "2",
      "1",
    ]);
    const count = published.length;
    await change(() => host.selection.replace(["1", "2"]));
    await change(() => host.selection.replace(["1", "2"]));
    expect(session.manifest().viewRevision).toBe(selected);
    expect(published).toHaveLength(count);
    await change(() => host.selection.replace(["1"]));
    expect(session.manifest().viewRevision).toBeGreaterThan(selected);
    expect(engine.snapshot().revisions).toEqual(engineRevision);
  });

  it("forwards all-matching scope without granting row or column access", async () => {
    const { host, session, published, change } = await mountTable();
    await change(() => host.selection.replace(["1"]));
    const engine = host.source().tableEngine!;
    const engineRevision = { ...engine.snapshot().revisions };
    const before = session.manifest();
    expect(host.runtime.view()!.selection).toMatchObject({
      allMatching: false,
      acrossPages: true,
    });
    const read = async (id: string) => {
      const result = await session.execute(
        "rows.read",
        { offset: 0, limit: 10, scope: "visible" },
        session.manifest().viewRevision,
        id
      );
      expect(result.ok).toBe(true);
      const envelope = result.result as RowProvenanceEnvelope;
      expect(envelope.source).toBe("table-rows");
      expect(envelope.untrusted).toBe(true);
      expect(envelope.revision).toBe(session.manifest().viewRevision);
      return envelope.rows;
    };
    const beforeRows = await read("before-scope");
    await change(() => host.selection.selectAllMatching());
    const after = session.manifest();
    expect(after.viewRevision).toBeGreaterThan(before.viewRevision);
    expect(host.runtime.view()!.selection).toMatchObject({
      allMatching: true,
      acrossPages: true,
    });
    expect([...host.runtime.view()!.selection!.selectedIds]).toEqual(["1"]);
    expect(after.source).toEqual(before.source);
    expect(after.columns).toEqual(before.columns);
    expect(after.capabilities).toEqual(before.capabilities);
    const afterRows = await read("after-scope");
    expect(afterRows).toEqual(beforeRows);
    expect(afterRows.redacted).toContain("secret");
    expect(afterRows.rows.every((row) => !("secret" in row.cells))).toBe(true);
    const count = published.length;
    await change(() => host.selection.selectAllMatching());
    expect(session.manifest().viewRevision).toBe(after.viewRevision);
    expect(published).toHaveLength(count);
    await change(() => host.selection.replace(["1"]));
    expect(session.manifest().viewRevision).toBeGreaterThan(after.viewRevision);
    expect(host.runtime.view()!.selection).toMatchObject({
      allMatching: false,
      acrossPages: true,
    });
    expect(engine.snapshot().revisions).toEqual(engineRevision);
  });

  it("preserves a producer's false across-pages flag and refuses all-matching", async () => {
    const { host, session, published, change } = await mountTable(false);
    await change(() => host.selection.replace(["1"]));
    const before = session.manifest();
    const count = published.length;
    expect(host.runtime.view()!.selection).toMatchObject({
      allMatching: false,
      acrossPages: false,
    });
    await change(() => host.selection.selectAllMatching());
    expect(host.runtime.view()!.selection).toMatchObject({
      allMatching: false,
      acrossPages: false,
    });
    expect(session.manifest()).toEqual(before);
    expect(published).toHaveLength(count);
  });
});
