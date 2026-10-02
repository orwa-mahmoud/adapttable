import { Component, Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { featureOptionsOf } from "../featureHost";
import { batchEditing, editing, rowEditing } from "../features/editing";
import {
  injectBatchEditing,
  injectCellEditing,
  injectRowEditing,
} from "./editing";

interface Task {
  id: string;
  title: string;
}

const TASK: Task = { id: "1", title: "Ship" };
const COLUMNS = [{ key: "title", editable: true as const }];

@Component({
  template: `
    <output class="active">{{ editing().active ? "yes" : "no" }}</output>
    <output class="draft">{{ editing().draft }}</output>
  `,
})
class CellHost {
  readonly onEditStart = vi.fn();
  readonly onEditCancel = vi.fn();
  readonly editing = injectCellEditing<Task>({
    onEditStart: this.onEditStart,
    onEditCancel: this.onEditCancel,
  });
}

@Component({
  template: ` <output class="row">{{ editing().activeRowId ?? "" }}</output> `,
})
class RowHost {
  readonly enabled = signal(true);
  readonly onRowEdit = vi.fn();
  readonly editing = injectRowEditing<Task>({
    enabled: this.enabled,
    columns: COLUMNS,
    onRowEdit: this.onRowEdit,
  });
}

@Component({
  template: `
    <output class="pending">{{ editing().pending ? "yes" : "no" }}</output>
  `,
})
class BatchHost {
  readonly enabled = signal(true);
  readonly onBatchEdit = vi.fn();
  readonly editing = injectBatchEditing<Task>({
    enabled: this.enabled,
    columns: COLUMNS,
    onBatchEdit: this.onBatchEdit,
  });
}

describe("editing features", () => {
  it("arms onCellEdit on the merged patch", () => {
    const onCellEdit = vi.fn();
    expect(featureOptionsOf([editing(onCellEdit)])).toMatchObject({
      onCellEdit,
    });
  });

  it("arms row editing", () => {
    const onRowEdit = vi.fn();
    expect(featureOptionsOf([rowEditing(onRowEdit)])).toMatchObject({
      rowEditing: true,
      onRowEdit,
    });
  });

  it("arms batch editing", () => {
    const onBatchEdit = vi.fn();
    expect(featureOptionsOf([batchEditing(onBatchEdit)])).toMatchObject({
      batchEditing: true,
      onBatchEdit,
    });
  });
});

describe("injectCellEditing", () => {
  it("opens, drafts, commits and cancels a cell", () => {
    const fixture = TestBed.createComponent(CellHost);
    fixture.detectChanges();
    const editing = fixture.componentInstance.editing;
    expect(editing().active).toBeNull();

    editing().begin("1", "title", "Ship", TASK);
    fixture.detectChanges();
    expect(fixture.componentInstance.onEditStart).toHaveBeenCalledOnce();
    expect(
      fixture.componentInstance.onEditStart.mock.calls[0]![0]
    ).toMatchObject({ rowId: "1", columnKey: "title" });
    expect(editing().active).toEqual({ rowId: "1", columnKey: "title" });
    expect(editing().isActive("1", "title")).toBe(true);
    expect(fixture.nativeElement.querySelector(".draft")?.textContent).toBe(
      "Ship"
    );

    editing().setDraft("Ship it");
    fixture.detectChanges();
    expect(editing().draft).toBe("Ship it");
    expect(editing().commit()).toEqual({
      rowId: "1",
      columnKey: "title",
      draft: "Ship it",
    });
    fixture.detectChanges();
    expect(editing().active).toBeNull();

    editing().begin("1", "title", "Ship", TASK);
    editing().cancel();
    fixture.detectChanges();
    expect(fixture.componentInstance.onEditCancel).toHaveBeenCalledOnce();
    expect(editing().active).toBeNull();
  });

  it("accepts an explicit injector", () => {
    const injector = TestBed.inject(Injector);
    const editing = injectCellEditing<Task>({ injector });
    editing().begin("1", "title", "Ship", TASK);
    expect(editing().isActive("1", "title")).toBe(true);
    editing().close();
    expect(editing().active).toBeNull();
  });

  it("refuses to run outside an injection context", () => {
    expect(() => injectCellEditing()).toThrow();
  });
});

describe("injectRowEditing", () => {
  it("edits a row and hands the host one patch", () => {
    const fixture = TestBed.createComponent(RowHost);
    fixture.detectChanges();
    const editing = fixture.componentInstance.editing;
    editing().begin(TASK, "1");
    fixture.detectChanges();
    expect(editing().activeRowId).toBe("1");
    expect(editing().isEditing("1")).toBe(true);
    editing().setDraft("title", "Ship it");
    editing().save();
    fixture.detectChanges();
    expect(fixture.componentInstance.onRowEdit).toHaveBeenCalledWith(TASK, {
      title: "Ship it",
    });
    expect(editing().activeRowId).toBeNull();

    editing().begin(TASK, "1");
    editing().cancel();
    fixture.detectChanges();
    expect(editing().activeRowId).toBeNull();
  });

  it("follows a columns signal: a column made editable joins the patch", () => {
    const injector = TestBed.inject(Injector);
    const onRowEdit = vi.fn();
    const columns = signal<{ key: string; editable?: boolean }[]>([
      { key: "title", editable: true },
      { key: "owner" },
    ]);
    const editing = injectRowEditing<Task & { owner?: string }>({
      injector,
      enabled: signal(true),
      columns,
      onRowEdit,
    });
    editing().begin(TASK, "1");
    editing().setDraft("owner", "Ada");
    editing().save();
    expect(onRowEdit).not.toHaveBeenCalled();
    editing().cancel();

    columns.set([
      { key: "title", editable: true },
      { key: "owner", editable: true },
    ]);
    TestBed.tick();
    editing().begin(TASK, "1");
    editing().setDraft("owner", "Ada");
    editing().save();
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(TASK, { owner: "Ada" });
  });
});

describe("injectBatchEditing", () => {
  it("collects pending rows and saves them together", () => {
    const fixture = TestBed.createComponent(BatchHost);
    fixture.detectChanges();
    const editing = fixture.componentInstance.editing;
    editing().setDraft(TASK, "1", "title", "Ship it");
    fixture.detectChanges();
    expect(editing().pending).toBe(true);
    expect(fixture.nativeElement.querySelector(".pending")?.textContent).toBe(
      "yes"
    );
    editing().saveAll();
    fixture.detectChanges();
    expect(
      fixture.componentInstance.onBatchEdit
    ).toHaveBeenCalledExactlyOnceWith([
      { row: TASK, rowId: "1", patch: { title: "Ship it" } },
    ]);
    expect(editing().pending).toBe(false);
  });

  it("accepts an explicit injector", () => {
    const injector = TestBed.inject(Injector);
    const editing = injectBatchEditing<Task>({
      injector,
      enabled: true,
      columns: COLUMNS,
      onBatchEdit: vi.fn(),
    });
    editing().setDraft(TASK, "1", "title", "Ship it");
    expect(editing().isPending("1")).toBe(true);
    editing().cancelAll();
    expect(editing().pending).toBe(false);
  });
});
