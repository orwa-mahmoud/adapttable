/**
 * Row- and batch-edit Chrome: which controls a row offers, what the batch
 * bar says, and what each control hands the host.
 */
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import type { EditableCellEditorCtrl } from "./editableCellShared";
import { injectBatchEditing, injectRowEditing } from "./editing";
import {
  AdaptBatchEditBarChrome,
  AdaptBatchEditCell,
  AdaptRowEditActionsChrome,
  AdaptRowEditCell,
} from "./rowEditGate";

interface Task {
  id: string;
  title: string;
}

const TASK: Task = { id: "1", title: "Ship" };
const COLUMN: ColumnDef<Task> = {
  key: "title",
  header: "Title",
  accessor: (r) => r.title,
  editable: true,
};
const COLUMNS = [COLUMN];

@Component({
  selector: "test-edit-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button
      type="button"
      [attr.data-adapttable-part]="props().part"
      (click)="props().onClick($event)"
    >
      {{ props().label }}
    </button>
  `,
})
class TestButton {
  readonly props = input.required<{
    part: string;
    label: string;
    onClick: (event: { stopPropagation: () => void }) => void;
  }>();
}

@Component({
  selector: "test-cell-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <input
      #field
      data-adapttable-part="edit-cell-editor"
      [attr.aria-label]="props().label"
      [value]="props().draft"
      (input)="props().setDraft(field.value)"
      (keydown)="props().onEditorKeyDown($event)"
      (blur)="props().commitOnBlur()"
    />
  `,
})
class TestEditor {
  readonly props = input.required<EditableCellEditorCtrl>();
  ngAfterViewInit(): void {
    this.props().focusRef(
      document.querySelector<HTMLInputElement>(
        '[data-adapttable-part="edit-cell-editor"]'
      )
    );
  }
}

const SLOTS = { Button: TestButton };
const CELL_SLOTS = { Button: TestButton, Activate: TestButton };

function part(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-adapttable-part="${name}"]`
  );
}

function one(name: string): HTMLElement {
  const found = part(name);
  expect(found, name).not.toBeNull();
  return found!;
}

@Component({
  imports: [AdaptRowEditActionsChrome, AdaptRowEditCell],
  template: `
    <adapt-row-edit-actions-chrome
      [rowEditing]="editing()"
      [row]="row"
      rowId="1"
      [labels]="labels"
      [showBegin]="showBegin()"
      [conflict]="conflict()"
      [slots]="slots"
    />
    @if (editing().isEditing("1")) {
      <adapt-row-edit-cell
        [rowEditing]="editing()"
        [column]="column"
        [display]="'Ship'"
        editLabel="Edit title"
        [takesFocus]="true"
        [editor]="editor"
      />
    }
  `,
})
class RowHost {
  readonly onRowEdit = vi.fn();
  readonly editing = injectRowEditing<Task>({
    enabled: true,
    columns: COLUMNS,
    onRowEdit: this.onRowEdit,
  });
  readonly row = TASK;
  readonly column = COLUMN;
  readonly labels = {
    editRow: "Edit row",
    saveRow: "Save row",
    cancel: "Cancel",
  };
  readonly showBegin = signal(true);
  readonly conflict = signal<{ asking: boolean } | undefined>(undefined);
  readonly slots = SLOTS;
  readonly editor = TestEditor;
}

const POINTS: ColumnDef<Task> = {
  key: "points",
  header: "Points",
  accessor: (r) => r.title.length,
  editable: true,
};

@Component({
  imports: [AdaptRowEditCell],
  template: `
    @if (editing().isEditing("1")) {
      @for (column of columns; track column.key; let first = $first) {
        <adapt-row-edit-cell
          [rowEditing]="editing()"
          [column]="column"
          [display]="''"
          [editLabel]="'Edit ' + column.key"
          [takesFocus]="first"
          [editor]="editor"
        />
      }
    }
  `,
})
class TwoFieldHost {
  readonly onRowEdit = vi.fn();
  readonly columns = [COLUMN, POINTS];
  readonly editing = injectRowEditing<Task>({
    enabled: true,
    columns: this.columns,
    onRowEdit: this.onRowEdit,
  });
  readonly editor = TestEditor;
}

@Component({
  imports: [AdaptBatchEditBarChrome, AdaptBatchEditCell],
  template: `
    <adapt-batch-edit-cell
      [batch]="batch()"
      [row]="row"
      rowId="1"
      [column]="column"
      [display]="'Ship'"
      editLabel="Edit title"
      [editor]="editor"
      [slots]="cellSlots"
    />
    <adapt-batch-edit-bar-chrome
      [batch]="batch()"
      [contested]="contested()"
      [labels]="labels"
      [slots]="slots"
    />
  `,
})
class BatchHost {
  readonly onBatchEdit = vi.fn();
  readonly batch = injectBatchEditing<Task>({
    enabled: true,
    columns: COLUMNS,
    onBatchEdit: this.onBatchEdit,
  });
  readonly row = TASK;
  readonly column = COLUMN;
  readonly contested = signal(false);
  readonly labels = {
    saveAll: "Save all",
    cancelAll: "Cancel all",
    editConflict: "Changed underneath",
    pendingRows: (count: number) => `${String(count)} waiting`,
  };
  readonly slots = SLOTS;
  readonly cellSlots = CELL_SLOTS;
  readonly editor = TestEditor;
}

async function mount<T>(host: new () => T) {
  const fixture = TestBed.createComponent(host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    fixture,
    host: fixture.componentInstance,
    settle: () => fixture.whenStable(),
  };
}

function type(value: string): void {
  const field = one("edit-cell-editor") as HTMLInputElement;
  field.value = value;
  field.dispatchEvent(new Event("input"));
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("AdaptRowEditActionsChrome", () => {
  it("opens the row from begin and swaps to save and cancel", async () => {
    const { settle } = await mount(RowHost);
    expect(one("row-edit-begin").textContent.trim()).toBe("Edit row");
    expect(part("row-edit-actions")).toBeNull();

    one("row-edit-begin").click();
    await settle();
    expect(part("row-edit-begin")).toBeNull();
    expect(one("row-edit-save").textContent.trim()).toBe("Save row");
    expect(one("row-edit-cancel").textContent.trim()).toBe("Cancel");
    expect(document.activeElement).toBe(part("edit-cell-editor"));
  });

  it("hands the host the row and its patch on save", async () => {
    const { host, settle } = await mount(RowHost);
    one("row-edit-begin").click();
    await settle();
    type("Ship it");
    await settle();
    one("row-edit-save").click();
    await settle();
    expect(host.onRowEdit).toHaveBeenCalledExactlyOnceWith(TASK, {
      title: "Ship it",
    });
    expect(part("edit-cell-editor")).toBeNull();
  });

  it("holds save while an incoming change waits on the row", async () => {
    const { host, settle } = await mount(RowHost);
    one("row-edit-begin").click();
    host.conflict.set({ asking: true });
    await settle();
    expect(part("row-edit-save")).toBeNull();
    expect(one("row-edit-cancel").textContent.trim()).toBe("Cancel");
  });

  it("draws nothing on a closed row whose begin a host action owns", async () => {
    const { host, settle } = await mount(RowHost);
    host.showBegin.set(false);
    await settle();
    expect(part("row-edit-begin")).toBeNull();
    expect(part("row-edit-actions")).toBeNull();
  });
});

describe("AdaptRowEditCell", () => {
  it("hands focus to the first field of an opened row, not the last", async () => {
    const { host, settle } = await mount(TwoFieldHost);
    host.editing().begin(TASK, "1");
    await settle();
    const fields = document.querySelectorAll<HTMLInputElement>(
      '[data-adapttable-part="edit-cell-editor"]'
    );
    expect(fields).toHaveLength(2);
    expect(document.activeElement).toBe(fields[0]);
  });

  it("keeps the row open when a field loses focus", async () => {
    const { host, settle } = await mount(TwoFieldHost);
    host.editing().begin(TASK, "1");
    await settle();
    type("Ship it");
    one("edit-cell-editor").dispatchEvent(new Event("blur"));
    await settle();
    expect(host.onRowEdit).not.toHaveBeenCalled();
    expect(host.editing().isEditing("1")).toBe(true);
  });
});

describe("AdaptBatchEditBarChrome", () => {
  it("appears with the pending count once a field changes", async () => {
    const { settle } = await mount(BatchHost);
    expect(part("batch-edit-bar")).toBeNull();
    expect(one("batch-edit-cell").hasAttribute("data-changed")).toBe(false);

    type("Ship it");
    await settle();
    expect(one("batch-edit-count").textContent.trim()).toBe("1 waiting");
    expect(one("batch-edit-cell").hasAttribute("data-changed")).toBe(true);
  });

  it("saves every pending row in one host call", async () => {
    const { host, settle } = await mount(BatchHost);
    type("Ship it");
    await settle();
    one("batch-edit-save").click();
    await settle();
    expect(host.onBatchEdit).toHaveBeenCalledExactlyOnceWith([
      { row: TASK, rowId: "1", patch: { title: "Ship it" } },
    ]);
    expect(part("batch-edit-bar")).toBeNull();
  });

  it("ignores Enter in a batch field: nothing saves until Save all", async () => {
    const { host, settle } = await mount(BatchHost);
    type("Ship it");
    one("edit-cell-editor").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(host.onBatchEdit).not.toHaveBeenCalled();
    expect(one("batch-edit-count").textContent.trim()).toBe("1 waiting");
  });

  it("discards the drafts on cancel", async () => {
    const { host, settle } = await mount(BatchHost);
    type("Ship it");
    await settle();
    one("batch-edit-cancel").click();
    await settle();
    expect(host.onBatchEdit).not.toHaveBeenCalled();
    expect((one("edit-cell-editor") as HTMLInputElement).value).toBe("Ship");
  });

  it("replaces save with the conflict message while a row is contested", async () => {
    const { host, settle } = await mount(BatchHost);
    type("Ship it");
    host.contested.set(true);
    await settle();
    expect(part("batch-edit-save")).toBeNull();
    expect(one("batch-edit-conflict").textContent.trim()).toBe(
      "Changed underneath"
    );
  });
});

describe("row and batch editing state", () => {
  it("stays off unless enabled", () => {
    const onRowEdit = vi.fn();
    const onBatchEdit = vi.fn();
    const rows = TestBed.runInInjectionContext(() =>
      injectRowEditing<Task>({ columns: COLUMNS, onRowEdit })
    );
    const batch = TestBed.runInInjectionContext(() =>
      injectBatchEditing<Task>({ columns: COLUMNS, onBatchEdit })
    );
    rows().begin(TASK, "1");
    expect(rows().isEditing("1")).toBe(false);
    batch().setDraft(TASK, "1", "title", "Ship it");
    expect(batch().pending).toBe(false);
  });
});
