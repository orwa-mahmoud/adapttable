/**
 * NG-ZORRO editable cell: focus, select options, and parsed value types.
 */
import {
  type AdaptTableFeature,
  type CellEditHandler,
  type ColumnDef,
  injectCellEditing,
} from "@adapttable/angular";
import type {
  EditableCellEditorCtrl,
  EditableCellSlotProps,
} from "@adapttable/angular/adapter";
import { editing } from "@adapttable/ng-zorro/editing";
import { Component, computed, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { editableCellTests } from "../../../angular/test/kit/suites/editableCell";
import { kit } from "../../testing/kit";
import { kitSelector } from "../../testUtils";
import { AdaptDataTable } from "../dataTable";
import { AdaptCheckboxCellEditor, AdaptEditableCell } from "./editableCell";

for (const test of editableCellTests(kit)) it(test.name, test.run);

interface Shift {
  id: string;
  name: string;
  approved: boolean;
  day: string;
  age: number;
  team: string;
}

const ROW: Shift = {
  id: "1",
  name: "Ada",
  approved: false,
  day: "2026-08-13",
  age: 36,
  team: "web",
};

const COLUMNS: ColumnDef<Shift>[] = [
  { key: "name", accessor: (row) => row.name, editable: true },
  {
    key: "approved",
    accessor: (row) => row.approved,
    editable: true,
    editor: "boolean",
  },
  {
    key: "day",
    accessor: (row) => row.day,
    editable: true,
    editor: "date",
  },
  {
    key: "age",
    accessor: (row) => row.age,
    editable: true,
    editor: "number",
  },
  {
    key: "team",
    accessor: (row) => row.team,
    editable: true,
    editor: {
      type: "select",
      options: [
        { value: "core", label: "Core" },
        { value: "web", label: "Web" },
      ],
    },
  },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="[row]"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features()"
      [urlSync]="false"
    />
  `,
})
class Host {
  readonly row = ROW;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Shift) => row.id;
  readonly features = input<readonly AdaptTableFeature[]>([]);
}

function part(name: string): HTMLElement | null {
  return document.querySelector(kitSelector(name));
}

function activates(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="edit-cell-activate"]'
    ),
  ];
}

function editor(): HTMLElement | null {
  return part("edit-cell-editor");
}

async function mount(onCellEdit: CellEditHandler<Shift>) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", [editing(onCellEdit)]);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  document.body.append(fixture.nativeElement as HTMLElement);
  return {
    fixture,
    settle: async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    },
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("AdaptEditableCell", () => {
  it("focuses the editor on open and returns focus to activate on Escape", async () => {
    const onCellEdit = vi.fn();
    const { settle } = await mount(onCellEdit as CellEditHandler<Shift>);
    const activate = activates()[0]!;
    activate.focus();
    expect(document.activeElement).toBe(activate);
    expect(activate.classList.contains("ant-btn")).toBe(true);
    activate.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await settle();
    const input = editor();
    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);
    input!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(editor()).toBeNull();
    expect(document.activeElement).toBe(activates()[0]);
  });

  it("offers only the select column's options", async () => {
    const onCellEdit = vi.fn();
    const { settle } = await mount(onCellEdit as CellEditHandler<Shift>);
    activates()[4]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await settle();
    const select = editor()!.closest<HTMLElement>("nz-select")!;
    expect(select.classList.contains("ant-select")).toBe(true);
    expect(select.querySelector("nz-select-item")?.textContent?.trim()).toBe(
      "Web"
    );
    expect(document.activeElement).toBe(editor());
    select.click();
    await settle();
    await vi.waitFor(() => {
      expect(document.querySelectorAll("nz-option-item")).toHaveLength(2);
    });
    const options = [
      ...document.querySelectorAll<HTMLElement>("nz-option-item"),
    ];
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      "Core",
      "Web",
    ]);
    expect(
      options[1]!.classList.contains("ant-select-item-option-selected")
    ).toBe(true);
    options[0]!.click();
    await settle();
    expect(select.querySelector("nz-select-item")?.textContent?.trim()).toBe(
      "Core"
    );
    editor()!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROW, "team", "core");
  });

  it("hands the host a number for a number editor", async () => {
    const onCellEdit = vi.fn();
    const { settle } = await mount(onCellEdit as CellEditHandler<Shift>);
    activates()[3]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await settle();
    const input = editor() as HTMLInputElement;
    expect(input.type).toBe("number");
    expect(input.classList.contains("ant-input")).toBe(true);
    input.value = "42";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROW, "age", 42);
  });

  it("hands the host a boolean for a checkbox editor", async () => {
    const onCellEdit = vi.fn();
    const { settle } = await mount(onCellEdit as CellEditHandler<Shift>);
    activates()[1]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await settle();
    const box = editor() as HTMLInputElement;
    expect(box.type).toBe("checkbox");
    expect(box.classList.contains("ant-checkbox-input")).toBe(true);
    expect(document.activeElement).toBe(box);
    box.click();
    await settle();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROW, "approved", true);
  });
});

interface TaggedRow {
  id: string;
  tags: string[];
}

@Component({
  imports: [AdaptEditableCell],
  template: `
    @if (checkboxes()) {
      <adapt-editable-cell [props]="props()" [editor]="editorType" />
    } @else {
      <adapt-editable-cell [props]="props()" />
    }
  `,
})
class CheckboxEditorHost {
  readonly checkboxes = input(true);
  readonly editorType = AdaptCheckboxCellEditor;
  readonly row: TaggedRow = { id: "tagged", tags: ["internal"] };
  readonly column = {
    key: "tags",
    editable: true,
    editor: {
      type: "multi-select",
      options: [
        { value: "urgent", label: "Urgent" },
        { value: "internal", label: "Internal" },
      ],
    },
  } satisfies ColumnDef<TaggedRow>;
  readonly onCellEdit = vi.fn();
  readonly onEditCancel = vi.fn();
  readonly state = injectCellEditing<TaggedRow>({
    onEditCancel: this.onEditCancel,
  });
  readonly props = computed((): EditableCellSlotProps<TaggedRow> => ({
    editing: { state: this.state(), onCellEdit: this.onCellEdit },
    row: this.row,
    column: this.column,
    rowId: this.row.id,
    rowIndex: 0,
    rows: [this.row],
    columns: [this.column],
    rowKey: (row) => row.id,
    editLabel: "Edit tags",
    display: "Internal",
  }));
}

async function mountCheckboxEditor() {
  const fixture = TestBed.createComponent(CheckboxEditorHost);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  activates()[0]!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  await fixture.whenStable();
  const root: HTMLElement = fixture.nativeElement;
  return {
    fixture,
    host: fixture.componentInstance,
    checks: [
      ...root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    ],
  };
}

describe("AdaptCheckboxCellEditor", () => {
  it("focuses the first choice and commits ordered choices only on leaving the group", async () => {
    const { fixture, host, checks } = await mountCheckboxEditor();
    expect(editor()?.getAttribute("role")).toBe("group");
    expect(editor()?.getAttribute("aria-label")).toBe("Edit tags");
    expect(
      checks.every((box) => box.classList.contains("ant-checkbox-input"))
    ).toBe(true);
    expect(checks.map((box) => [box.value, box.checked])).toEqual([
      ["urgent", false],
      ["internal", true],
    ]);
    expect(document.activeElement).toBe(checks[0]);
    checks[0]!.click();
    await fixture.whenStable();
    expect(checks[0]!.checked).toBe(true);
    checks[1]!.focus();
    expect(document.activeElement).toBe(checks[1]);
    expect(host.onCellEdit).not.toHaveBeenCalled();
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    await fixture.whenStable();
    expect(host.onCellEdit).toHaveBeenCalledExactlyOnceWith(host.row, "tags", [
      "urgent",
      "internal",
    ]);
    expect(editor()).toBeNull();
    outside.remove();
  });

  it("commits with Enter and cancels with Escape through the real cell controller", async () => {
    const { fixture, host, checks } = await mountCheckboxEditor();
    checks[0]!.click();
    await fixture.whenStable();
    checks[0]!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await fixture.whenStable();
    expect(host.onCellEdit).toHaveBeenCalledExactlyOnceWith(host.row, "tags", [
      "urgent",
      "internal",
    ]);
    expect(editor()).toBeNull();
    activates()[0]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const option = root.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    )!;
    option.click();
    await fixture.whenStable();
    option.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await fixture.whenStable();
    expect(host.onCellEdit).toHaveBeenCalledTimes(1);
    expect(host.onEditCancel).toHaveBeenCalledOnce();
    expect(editor()).toBeNull();
    expect(document.activeElement).toBe(activates()[0]);
  });

  it("uses the NG-ZORRO text input and forwards its draft", async () => {
    const fixture = TestBed.createComponent(AdaptCheckboxCellEditor);
    const props: EditableCellEditorCtrl = {
      editor: "text",
      draft: "Ada",
      setDraft: vi.fn(),
      onEditorKeyDown: vi.fn(),
      commitOnBlur: vi.fn(),
      selectOptions: [],
      label: "Edit name",
      errorId: "name-error",
      validating: false,
      focusRef: (node) => node?.focus(),
    };
    fixture.componentRef.setInput("props", props);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const field = editor() as HTMLInputElement;
    expect(field.type).toBe("text");
    expect(field.classList.contains("ant-input")).toBe(true);
    expect(field.value).toBe("Ada");
    expect(document.activeElement).toBe(field);
    field.value = "Grace";
    field.dispatchEvent(new Event("input"));
    expect(props.setDraft).toHaveBeenCalledExactlyOnceWith("Grace");
  });

  it("uses the NG-ZORRO multi-select by default and commits its ordered values", async () => {
    const fixture = TestBed.createComponent(CheckboxEditorHost);
    fixture.componentRef.setInput("checkboxes", false);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    activates()[0]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await fixture.whenStable();
    const select = editor()!.closest<HTMLElement>("nz-select")!;
    expect(select.classList.contains("ant-select-multiple")).toBe(true);
    expect(
      [...select.querySelectorAll("nz-select-item")].map((item) =>
        item.textContent?.trim()
      )
    ).toEqual(["Internal"]);
    expect(document.activeElement).toBe(editor());
    select.click();
    await fixture.whenStable();
    await vi.waitFor(() => {
      expect(document.querySelectorAll("nz-option-item")).toHaveLength(2);
    });
    const options = [
      ...document.querySelectorAll<HTMLElement>("nz-option-item"),
    ];
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      "Urgent",
      "Internal",
    ]);
    expect(
      options[1]!.classList.contains("ant-select-item-option-selected")
    ).toBe(true);
    options[0]!.click();
    await fixture.whenStable();
    expect(
      [...select.querySelectorAll("nz-select-item")].map((item) =>
        item.textContent?.trim()
      )
    ).toEqual(["Internal", "Urgent"]);
    editor()!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(document.querySelector("nz-option-container")).toBeNull();
    expect(fixture.componentInstance.onEditCancel).not.toHaveBeenCalled();
    editor()!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await fixture.whenStable();
    expect(
      fixture.componentInstance.onCellEdit
    ).toHaveBeenCalledExactlyOnceWith(fixture.componentInstance.row, "tags", [
      "internal",
      "urgent",
    ]);
    expect(editor()).toBeNull();
  });
});
