/**
 * Editable-cell gate commits through core: parseValue, validation, async
 * save failure and lifecycle observers.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import {
  type EditableCellEditing,
  rowEditingSignature,
  rowIsDirty,
} from "./editableCellController";
import {
  AdaptCellConflictNotice,
  AdaptEditableCellGate,
  commitBooleanDraft,
  type EditableCellActivateProps,
  type EditableCellButtonProps,
  type EditableCellEditorCtrl,
  type EditableCellSlots,
  multiDraftFromSelect,
} from "./editableCellGate";
import { type CellEditHandler, injectCellEditing } from "./editing";
import { injectCellSaveState } from "./saveState";
import { injectEditValidation } from "./validation";

interface Person {
  id: string;
  name: string;
  age: number;
}

const ROW: Person = { id: "1", name: "Ada", age: 36 };
const ROWS: Person[] = [ROW];

@Component({
  selector: "test-edit-activate",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      type="button"
      data-adapttable-part="edit-cell-activate"
      [attr.title]="p.title"
      [attr.data-dirty]="p.dirty ? '' : null"
      (dblclick)="p.onDoubleClick($event)"
      (click)="p.onClick($event)"
      (keydown)="p.onKeyDown($event)"
      [attr.ref]="bindRef(p)"
    >
      {{ p.display }}
    </button>
  `,
})
class TestActivate {
  readonly props = input.required<EditableCellActivateProps>();
  private bound = false;
  protected bindRef(p: EditableCellActivateProps): null {
    if (!this.bound) {
      this.bound = true;
      queueMicrotask(() => {
        const found = document.querySelector(
          '[data-adapttable-part="edit-cell-activate"]'
        );
        p.activateRef(found instanceof HTMLButtonElement ? found : null);
      });
    }
    return null;
  }
}

@Component({
  selector: "test-edit-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      type="button"
      [attr.data-adapttable-part]="p.part"
      (mousedown)="p.onMouseDown?.($event)"
      (click)="p.onClick($event)"
    >
      {{ p.label }}
    </button>
  `,
})
class TestButton {
  readonly props = input.required<EditableCellButtonProps>();
}

@Component({
  selector: "test-edit-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <input
      #el
      data-adapttable-part="edit-cell-editor"
      [attr.aria-label]="'Edit cell'"
      [attr.aria-invalid]="p.error ? true : null"
      [attr.aria-describedby]="p.error ? p.errorId : null"
      [value]="p.draft"
      (input)="p.setDraft($any($event.target).value)"
      (keydown)="p.onEditorKeyDown($event)"
      (blur)="p.commitOnBlur()"
    />
  `,
})
class TestEditor {
  readonly props = input.required<EditableCellEditorCtrl>();
  constructor() {
    // Focus on mount the way the kit's focusRef does.
    queueMicrotask(() => {
      const el = document.querySelector<HTMLInputElement>(
        '[data-adapttable-part="edit-cell-editor"]'
      );
      this.props().focusRef(el);
    });
  }
}

const SLOTS: EditableCellSlots = {
  Activate: TestActivate,
  Button: TestButton,
};

@Component({
  imports: [AdaptEditableCellGate],
  template: `
    <adapt-editable-cell-gate
      [editing]="bundle()"
      [row]="row"
      [column]="column()"
      [rowId]="'1'"
      [rows]="rows"
      [columns]="columns()"
      [rowKey]="rowKey"
      [editLabel]="'Edit cell'"
      [undoLabel]="'Undo'"
      [display]="row.name"
      [editor]="editor"
      [slots]="slots"
    />
  `,
})
class GateHost {
  readonly row = ROW;
  readonly rows = ROWS;
  readonly rowKey = (r: Person) => r.id;
  readonly editor = TestEditor;
  readonly slots = SLOTS;
  readonly onCellEdit = input.required<CellEditHandler<Person>>();
  readonly parseValue = input<(draft: string, row: Person) => unknown>();
  readonly validate = input<(value: unknown) => string | undefined>();
  readonly onEditStart = input<(event: unknown) => void>();
  readonly onEditCommit = input<(event: unknown) => void>();
  readonly onEditCancel = input<(event: unknown) => void>();
  readonly onRollback = input<(previous: Person, columnKey: string) => void>();

  readonly state = injectCellEditing<Person>({
    onEditStart: (event) => this.onEditStart()?.(event),
    onEditCancel: (event) => this.onEditCancel()?.(event),
  });
  readonly validation = injectEditValidation<Person>();
  readonly saving = injectCellSaveState<Person>({
    onRollback: (previous, columnKey) =>
      this.onRollback()?.(previous, columnKey),
  });

  readonly column = computed((): ColumnDef<Person> => ({
    key: "name",
    editable: true,
    parseValue: this.parseValue(),
    validate: this.validate(),
  }));

  readonly columns = computed(() => [this.column()]);

  readonly bundle = computed((): EditableCellEditing<Person> => ({
    onCellEdit: this.onCellEdit(),
    state: this.state(),
    validation: this.validate() ? this.validation() : undefined,
    saving: this.saving(),
    lifecycle: {
      onEditStart: (event) => this.onEditStart()?.(event),
      onEditCommit: (event) => this.onEditCommit()?.(event),
      onEditCancel: (event) => this.onEditCancel()?.(event),
    },
  }));
}

afterEach(() => {
  document.body.replaceChildren();
  TestBed.resetTestingModule();
});

async function mountGate(options: {
  onCellEdit: CellEditHandler<Person>;
  parseValue?: (draft: string, row: Person) => unknown;
  validate?: (value: unknown) => string | undefined;
  onEditStart?: (event: unknown) => void;
  onEditCommit?: (event: unknown) => void;
  onEditCancel?: (event: unknown) => void;
  onRollback?: (previous: Person, columnKey: string) => void;
}) {
  const fixture = TestBed.createComponent(GateHost);
  fixture.componentRef.setInput("onCellEdit", options.onCellEdit);
  if (options.parseValue)
    fixture.componentRef.setInput("parseValue", options.parseValue);
  if (options.validate)
    fixture.componentRef.setInput("validate", options.validate);
  if (options.onEditStart)
    fixture.componentRef.setInput("onEditStart", options.onEditStart);
  if (options.onEditCommit)
    fixture.componentRef.setInput("onEditCommit", options.onEditCommit);
  if (options.onEditCancel)
    fixture.componentRef.setInput("onEditCancel", options.onEditCancel);
  if (options.onRollback)
    fixture.componentRef.setInput("onRollback", options.onRollback);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  return {
    fixture,
    element,
    settle: async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    },
  };
}

async function openAndType(
  element: HTMLElement,
  settle: () => Promise<void>,
  value: string
) {
  const activate = element.querySelector<HTMLButtonElement>(
    '[data-adapttable-part="edit-cell-activate"]'
  );
  expect(activate).not.toBeNull();
  activate!.dispatchEvent(
    new MouseEvent("dblclick", { bubbles: true, cancelable: true })
  );
  await settle();
  const editor = element.querySelector<HTMLInputElement>(
    '[data-adapttable-part="edit-cell-editor"]'
  );
  expect(editor).not.toBeNull();
  editor!.value = value;
  editor!.dispatchEvent(new Event("input", { bubbles: true }));
  editor!.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
  );
  await settle();
  return editor!;
}

describe("editable cell helpers", () => {
  it("marks a dirty row and builds an editing signature", () => {
    const dirty = {
      isDirty: (rowId: string, _columnKey?: string) => rowId === "1",
      isRowDirty: (rowId: string) => rowId === "1",
      mark: () => undefined,
      confirm: () => undefined,
      confirmRow: () => undefined,
      confirmAll: () => undefined,
      count: 1,
      signature: "1:name",
    };
    expect(rowIsDirty({ state: {} as never, dirty }, "1")).toBe(true);
    expect(rowIsDirty(undefined, "1")).toBe(false);
    expect(
      rowEditingSignature(
        {
          state: {} as never,
          dirty,
          rowEditing: {
            isEditing: (id: string) => id === "1",
            activeRowId: "1",
          } as never,
        },
        "1"
      )
    ).not.toBeNull();
  });

  it("commits a boolean draft in one gesture", () => {
    const setDraft = vi.fn();
    const commitOnBlur = vi.fn();
    commitBooleanDraft(
      {
        draft: "false",
        setDraft,
        onEditorKeyDown: () => undefined,
        commitOnBlur,
        editor: "boolean",
        selectOptions: [],
        label: "Edit cell",
        validating: false,
        errorId: "e",
        focusRef: () => undefined,
      },
      true
    );
    expect(setDraft).toHaveBeenCalledExactlyOnceWith("true");
    expect(commitOnBlur).toHaveBeenCalledOnce();
  });

  it("reads a multi-select's draft from its options", () => {
    const select = document.createElement("select");
    select.multiple = true;
    for (const value of ["a", "b"]) {
      const option = document.createElement("option");
      option.value = value;
      option.selected = value === "b";
      select.append(option);
    }
    expect(multiDraftFromSelect(select)).toContain("b");
  });

  it("draws keep/take on a conflict notice", () => {
    const keep = vi.fn();
    const take = vi.fn();
    @Component({
      imports: [AdaptCellConflictNotice],
      template: `
        <adapt-cell-conflict-notice
          [ask]="ask"
          [labels]="labels"
          [errorId]="'err'"
          [slots]="slots"
        />
      `,
    })
    class NoticeHost {
      readonly ask = {
        incomingValue: "Ada Updated",
        keep,
        take,
      };
      readonly labels = {
        message: "This row changed",
        keepMine: "Keep mine",
        takeTheirs: "Take theirs",
        theirsValue: (value: string) => `Theirs: ${value}`,
      };
      readonly slots = SLOTS;
    }
    const fixture = TestBed.createComponent(NoticeHost);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(
      element.querySelector('[data-adapttable-part="edit-cell-conflict"]')
        ?.textContent
    ).toContain("This row changed");
    const keepBtn = element.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="edit-cell-keep-mine"]'
    );
    expect(keepBtn).not.toBeNull();
    const down = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    keepBtn!.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    keepBtn!.click();
    expect(keep).toHaveBeenCalledOnce();
    element
      .querySelector<HTMLButtonElement>(
        '[data-adapttable-part="edit-cell-take-theirs"]'
      )!
      .click();
    expect(take).toHaveBeenCalledOnce();
  });
});

describe("AdaptEditableCellGate commits", () => {
  it("passes through display when editing is omitted", () => {
    @Component({
      imports: [AdaptEditableCellGate],
      template: `
        <adapt-editable-cell-gate
          [row]="row"
          [column]="column"
          [rowId]="'1'"
          [rows]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [editLabel]="'Edit cell'"
          [display]="row.name"
          [editor]="editor"
          [slots]="slots"
        />
      `,
    })
    class DisplayHost {
      readonly row = ROW;
      readonly rows = ROWS;
      readonly columns: ColumnDef<Person>[] = [{ key: "name", editable: true }];
      readonly column = this.columns[0]!;
      readonly rowKey = (r: Person) => r.id;
      readonly editor = TestEditor;
      readonly slots = SLOTS;
    }
    const fixture = TestBed.createComponent(DisplayHost);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain("Ada");
    expect(
      element.querySelector('[data-adapttable-part="edit-cell-activate"]')
    ).toBeNull();
  });

  it("opens on Enter and F2 from the activate control", async () => {
    const onCellEdit = vi.fn();
    const { element, settle } = await mountGate({ onCellEdit });
    const activate = element.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="edit-cell-activate"]'
    );
    expect(activate).not.toBeNull();
    activate!.click();
    await settle();
    expect(
      element.querySelector('[data-adapttable-part="edit-cell-editor"]')
    ).toBeNull();
    activate!.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );
    await settle();
    expect(
      element.querySelector('[data-adapttable-part="edit-cell-editor"]')
    ).toBeNull();
    activate!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(
      element.querySelector('[data-adapttable-part="edit-cell-editor"]')
    ).not.toBeNull();
    element
      .querySelector<HTMLInputElement>(
        '[data-adapttable-part="edit-cell-editor"]'
      )!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    await settle();
    const again = element.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="edit-cell-activate"]'
    );
    expect(again).not.toBeNull();
    again!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F2", bubbles: true })
    );
    await settle();
    expect(
      element.querySelector('[data-adapttable-part="edit-cell-editor"]')
    ).not.toBeNull();
  });

  it("hands the host the value from a custom parseValue", async () => {
    const onCellEdit = vi.fn();
    const { element, settle } = await mountGate({
      onCellEdit,
      parseValue: (draft) => draft.toUpperCase(),
    });
    await openAndType(element, settle, "grace");
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROW, "name", "GRACE");
  });

  it("blocks a commit on validation error and shows its message", async () => {
    const onCellEdit = vi.fn();
    const { element, settle } = await mountGate({
      onCellEdit,
      validate: (value) => (value === "" ? "Name is required" : undefined),
    });
    await openAndType(element, settle, "");
    await new Promise((r) => setTimeout(r, 0));
    await settle();
    expect(onCellEdit).not.toHaveBeenCalled();
    const error = element.querySelector(
      '[data-adapttable-part="edit-cell-error"]'
    );
    expect(error).not.toBeNull();
    expect(error!.textContent?.trim()).toBe("Name is required");
  });

  it("rolls back a rejected save and surfaces the failure", async () => {
    const onRollback = vi.fn();
    const onCellEdit = vi.fn(() => Promise.reject(new Error("Conflict")));
    const { element, settle } = await mountGate({
      onCellEdit,
      onRollback,
    });
    await openAndType(element, settle, "Augusta");
    await settle();
    await new Promise((r) => setTimeout(r, 0));
    await settle();
    const failure = element.querySelector(
      '[data-adapttable-part="edit-cell-save-error"]'
    );
    expect(failure).not.toBeNull();
    expect(failure!.textContent).toContain("Conflict");
    const undo = element.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="edit-cell-rollback"]'
    );
    expect(undo).not.toBeNull();
    undo!.click();
    await settle();
    expect(onRollback).toHaveBeenCalledExactlyOnceWith(ROW, "name");
  });

  it("fires lifecycle observers with their arguments", async () => {
    const onEditStart = vi.fn();
    const onEditCommit = vi.fn();
    const onEditCancel = vi.fn();
    const onCellEdit = vi.fn();
    const { element, settle } = await mountGate({
      onCellEdit,
      onEditStart,
      onEditCommit,
      onEditCancel,
    });
    const activate = element.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="edit-cell-activate"]'
    );
    expect(activate).not.toBeNull();
    activate!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true, cancelable: true })
    );
    await settle();
    expect(onEditStart).toHaveBeenCalledOnce();
    expect(onEditStart.mock.calls[0]?.[0]).toMatchObject({
      row: ROW,
      rowId: "1",
      columnKey: "name",
      unit: "cell",
    });

    const editor = element.querySelector<HTMLInputElement>(
      '[data-adapttable-part="edit-cell-editor"]'
    );
    expect(editor).not.toBeNull();
    editor!.value = "Grace";
    editor!.dispatchEvent(new Event("input", { bubbles: true }));
    editor!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(onEditCommit).toHaveBeenCalledOnce();
    expect(onEditCommit.mock.calls[0]?.[0]).toMatchObject({
      row: ROW,
      rowId: "1",
      columnKey: "name",
      value: "Grace",
      unit: "cell",
    });

    const reopen = element.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="edit-cell-activate"]'
    );
    expect(reopen).not.toBeNull();
    reopen!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true, cancelable: true })
    );
    await settle();
    const again = element.querySelector<HTMLInputElement>(
      '[data-adapttable-part="edit-cell-editor"]'
    );
    expect(again).not.toBeNull();
    again!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(onEditCancel).toHaveBeenCalledOnce();
    expect(onEditCancel.mock.calls[0]?.[0]).toMatchObject({
      rowId: "1",
      columnKey: "name",
      unit: "cell",
    });
  });
});
