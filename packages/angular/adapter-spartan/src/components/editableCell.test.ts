/**
 * Kit editable cell: focus, select options, and parsed value types.
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
import { editing } from "@adapttable/spartan/editing";
import { Component, computed, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { editableCellTests } from "../../../angular/test/kit/suites/editableCell";
import { kit } from "../../testing/kit";
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
  return document.querySelector(
    `:is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
  );
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
    activate.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await settle();
    const input = editor();
    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);
    input!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 27,
        bubbles: true,
      })
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
    const select = editor() as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(document.activeElement).toBe(select);
    const texts = [...select.options].map((option) => option.text);
    expect(texts).toEqual(["Core", "Web"]);
    // The row's value, not the first option offered.
    expect(select.value).toBe("web");
    expect(select.selectedOptions[0]?.text).toBe("Web");
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
    const box = editor() as HTMLButtonElement;
    expect(box.tagName).toBe("BUTTON");
    expect(box.getAttribute("role")).toBe("checkbox");
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
      ...root.querySelectorAll<HTMLButtonElement>('button[role="checkbox"]'),
    ],
  };
}

describe("AdaptCheckboxCellEditor", () => {
  it("focuses the first choice and commits ordered choices only on leaving the group", async () => {
    const { fixture, host, checks } = await mountCheckboxEditor();
    expect(editor()?.getAttribute("role")).toBe("group");
    expect(editor()?.getAttribute("aria-label")).toBe("Edit tags");
    expect(
      checks.map((box) => [
        box.value,
        box.getAttribute("aria-checked") === "true",
      ])
    ).toEqual([
      ["urgent", false],
      ["internal", true],
    ]);
    expect(document.activeElement).toBe(checks[0]);
    checks[0]!.click();
    await fixture.whenStable();
    expect(checks[0]!.getAttribute("aria-checked")).toBe("true");
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
    const option = root.querySelector<HTMLButtonElement>(
      'button[role="checkbox"]'
    )!;
    option.click();
    await fixture.whenStable();
    option.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 27,
        bubbles: true,
      })
    );
    await fixture.whenStable();
    expect(host.onCellEdit).toHaveBeenCalledTimes(1);
    expect(host.onEditCancel).toHaveBeenCalledOnce();
    expect(editor()).toBeNull();
    expect(document.activeElement).toBe(activates()[0]);
  });

  it("keeps ordinary text editors native and forwards their draft", async () => {
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
    expect(field.value).toBe("Ada");
    expect(document.activeElement).toBe(field);
    field.value = "Grace";
    field.dispatchEvent(new Event("input"));
    expect(props.setDraft).toHaveBeenCalledExactlyOnceWith("Grace");
  });

  it("leaves native multi-select as the editable cell's default", async () => {
    const fixture = TestBed.createComponent(CheckboxEditorHost);
    fixture.componentRef.setInput("checkboxes", false);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    activates()[0]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await fixture.whenStable();
    const select = editor() as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.multiple).toBe(true);
    expect(document.activeElement).toBe(select);
    expect([...select.selectedOptions].map((option) => option.value)).toEqual([
      "internal",
    ]);
  });
});
