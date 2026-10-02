/** A retained agent follows feature replacement in the actual mounted kit. */
import type { AgentManifest, AgentSession } from "@adapttable/ai";
import {
  type AdaptTableFeature,
  type ColumnDef,
  type FeatureMountContext,
} from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { editing } from "@adapttable/angular-unstyled/editing";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { tableAgent } from "./tableAgent";

interface Row {
  id: string;
  name: string;
}

@Component({
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows()"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features()"
    [urlSync]="false"
    [forceMobile]="false"
  />`,
})
class Host {
  readonly rows = signal<readonly Row[]>([{ id: "ada", name: "Ada" }]);
  readonly columns: readonly ColumnDef<Row>[] = [
    { key: "name", header: "Name", editable: true },
  ];
  readonly rowKey = (row: Row) => row.id;
  readonly firstCommit = vi.fn((row: Row, key: string, value: unknown) => {
    this.updateRow(row, key, value);
  });
  readonly replacementCommit = vi.fn(
    (row: Row, key: string, value: unknown) => {
      this.updateRow(row, key, value);
    }
  );
  readonly restoredCommit = vi.fn((row: Row, key: string, value: unknown) => {
    this.updateRow(row, key, value);
  });
  readonly published: AgentManifest[] = [];
  session: AgentSession | undefined;
  context: FeatureMountContext | undefined;
  readonly attach = vi.fn((session: AgentSession) => {
    this.session = session;
  });
  readonly observer: AdaptTableFeature = {
    id: "observe-recomposition",
    mount: (context) => {
      this.context = context;
    },
  };
  readonly agent = tableAgent({
    tableId: "recomposed-people",
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
    columns: { name: { type: "string", writable: true } },
    bridge: {
      attach: this.attach,
      publish: (manifest) => {
        this.published.push(manifest);
      },
    },
  });
  readonly features = signal<readonly AdaptTableFeature[]>([
    this.observer,
    this.agent,
    editing<Row>(this.firstCommit),
  ]);

  private updateRow(row: Row, key: string, value: unknown): void {
    this.rows.update((rows) =>
      rows.map((current) =>
        current.id === row.id ? { ...current, [key]: value } : current
      )
    );
  }
}

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.replaceChildren();
});

describe("a mounted agent after feature recomposition", () => {
  it("keeps its session, revokes removed writes and uses each current callback until host disposal", async () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    document.body.append(root);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const session = host.session;
    const context = host.context;
    if (!session || !context)
      throw new Error("The mounted table did not attach its agent and runtime");
    const neutral = context.runtime.view()!.neutralTable!;
    const edit = (name: string, id: string) =>
      session.execute(
        "edit.cells",
        { edits: [{ rowKey: "ada", column: "name", value: name }] },
        session.manifest().viewRevision,
        id
      );
    const setFeatures = async (features: readonly AdaptTableFeature[]) => {
      host.features.set([host.observer, host.agent, ...features]);
      await fixture.whenStable();
      expect(host.session).toBe(session);
      expect(host.attach).toHaveBeenCalledOnce();
      expect(context.runtime.view()!.neutralTable).toBe(neutral);
    };
    const renderedName = () => {
      const row = root.querySelector(
        '[data-adapttable-part="row"][data-row-id="ada"]'
      );
      if (!row) throw new Error("The actual table row is missing");
      return row.textContent;
    };

    expect(neutral.operations.editCells).toBe(true);
    expect(session.manifest().capabilities).toContain("edit.cells");
    const initialResult = await edit("First edit", "initial-write");
    expect(initialResult.error).toBeUndefined();
    expect(initialResult.ok).toBe(true);
    await fixture.whenStable();
    expect(host.firstCommit).toHaveBeenCalledExactlyOnceWith(
      { id: "ada", name: "Ada" },
      "name",
      "First edit"
    );
    expect(renderedName()).toContain("First edit");

    await setFeatures([editing<Row>(host.replacementCommit)]);
    const replacementResult = await edit(
      "Replacement edit",
      "replacement-write"
    );
    expect(replacementResult.error).toBeUndefined();
    expect(replacementResult.ok).toBe(true);
    await fixture.whenStable();
    expect(host.replacementCommit).toHaveBeenCalledExactlyOnceWith(
      { id: "ada", name: "First edit" },
      "name",
      "Replacement edit"
    );
    expect(host.firstCommit).toHaveBeenCalledOnce();
    expect(renderedName()).toContain("Replacement edit");

    await setFeatures([]);
    expect(neutral.operations.editCells).toBe(false);
    expect(context.runtime.view()!.editing?.onCellEdit).toBeUndefined();
    expect(session.catalog().map((entry) => entry.key)).not.toContain(
      "edit.cells"
    );
    expect(session.manifest().capabilities).not.toContain("edit.cells");
    expect(host.published.at(-1)!.capabilities).not.toContain("edit.cells");
    expect(
      root.querySelector('[data-adapttable-part="edit-cell-activate"]')
    ).toBeNull();
    const revoked = await edit("Forbidden edit", "removed-write");
    expect(revoked.ok).toBe(false);
    expect(host.rows()).toEqual([{ id: "ada", name: "Replacement edit" }]);
    expect(host.firstCommit).toHaveBeenCalledOnce();
    expect(host.replacementCommit).toHaveBeenCalledOnce();
    expect(host.restoredCommit).not.toHaveBeenCalled();

    await setFeatures([editing<Row>(host.restoredCommit)]);
    expect(neutral.operations.editCells).toBe(true);
    expect(session.manifest().capabilities).toContain("edit.cells");
    expect(host.published.at(-1)!.capabilities).toContain("edit.cells");
    const restoredResult = await edit("Restored edit", "restored-write");
    expect(restoredResult.error).toBeUndefined();
    expect(restoredResult.ok).toBe(true);
    await fixture.whenStable();
    expect(host.restoredCommit).toHaveBeenCalledExactlyOnceWith(
      { id: "ada", name: "Replacement edit" },
      "name",
      "Restored edit"
    );
    expect(renderedName()).toContain("Restored edit");
    expect(host.firstCommit).toHaveBeenCalledOnce();
    expect(host.replacementCommit).toHaveBeenCalledOnce();

    const revision = session.manifest().viewRevision;
    fixture.destroy();
    const disposed = await session.execute(
      "edit.cells",
      {
        edits: [{ rowKey: "ada", column: "name", value: "After destruction" }],
      },
      revision,
      "destroyed-write"
    );
    expect(disposed.ok).toBe(false);
    expect(host.rows()).toEqual([{ id: "ada", name: "Restored edit" }]);
    expect(host.restoredCommit).toHaveBeenCalledOnce();
  });
});
