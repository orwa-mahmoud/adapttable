import {
  type AdaptTableFeature,
  type CellEditHandler,
  type ColumnDef,
  type EditableCellEditorCtrl,
  type EditableCellSlotProps,
  formatMultiDraft,
  injectCellEditing,
} from "@adapttable/angular";
import { editing } from "@adapttable/taiga-ui/editing";
import { Component, computed, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "../dataTable";
import { clearTaigaSelection } from "../taigaTestHelpers";
import {
  AdaptCheckboxCellEditor,
  AdaptEditableCell,
  AdaptNativeCellEditor,
} from "./editableCell";

/**
 * Kit editable cell: focus, select options, and parsed value types.
 */

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
    `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
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
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(editor()).toBeNull();
    expect(document.activeElement).toBe(activates()[0]);
  });

  it("keeps arrow keys on the editor so caret moves without grid focus", async () => {
    const onCellEdit = vi.fn();
    const { settle } = await mount(onCellEdit as CellEditHandler<Shift>);
    activates()[0]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await settle();
    const input = editor() as HTMLInputElement;
    expect(input).not.toBeNull();
    input.focus();
    input.setSelectionRange(1, 1);
    const arrow = new KeyboardEvent("keydown", {
      key: "ArrowLeft",
      bubbles: true,
      cancelable: true,
    });
    const stopped = vi.spyOn(arrow, "stopPropagation");
    input.dispatchEvent(arrow);
    expect(stopped).toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("offers only the column's Taiga options and commits the selected value", async () => {
    const onCellEdit = vi.fn();
    const { settle } = await mount(onCellEdit as CellEditHandler<Shift>);
    activates()[4]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await settle();
    const select = editor() as HTMLInputElement;
    expect(select.tagName).toBe("INPUT");
    expect(select.hasAttribute("tuiSelect")).toBe(true);
    expect(select.getAttribute("role")).toBe("combobox");
    expect(select.disabled).toBe(false);
    expect(select.required).toBe(false);
    expect(select.readOnly).toBe(false);
    // Taiga displays the selected label while the controller keeps its value.
    expect(select.value).toBe("Web");
    const insert = new InputEvent("beforeinput", {
      inputType: "insertText",
      data: "Unlisted team",
      bubbles: true,
      cancelable: true,
    });
    select.dispatchEvent(insert);
    expect(insert.defaultPrevented).toBe(true);
    expect(select.value).toBe("Web");

    select.click();
    await settle();
    const options = [
      ...document.querySelectorAll<HTMLButtonElement>(
        "tui-dropdown button[tuiOption]"
      ),
    ];
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      "Core",
      "Web",
    ]);
    expect(options.map((option) => option.disabled)).toEqual([false, false]);
    options[0]!.focus();
    await settle();
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(editor()).toBe(select);
    options[0]!.click();
    await settle();
    expect(select.value).toBe("Core");
    expect(onCellEdit).not.toHaveBeenCalled();
    select.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROW, "team", "core");
    expect(editor()).toBeNull();
  });

  it("clears a native select draft without committing until the reader confirms", async () => {
    const onCellEdit = vi.fn();
    const { fixture, settle } = await mount(
      onCellEdit as CellEditHandler<Shift>
    );
    activates()[4]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await settle();
    const select = editor() as HTMLInputElement;
    expect(select.value).toBe("Web");
    await clearTaigaSelection(fixture, select);
    expect(select.value).toBe("");
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(editor()).toBe(select);
    select.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROW, "team", "");
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
    const box = editor() as HTMLInputElement;
    expect(box.type).toBe("checkbox");
    box.click();
    await settle();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROW, "approved", true);
  });

  it("hands the host the date string for a date editor", async () => {
    const onCellEdit = vi.fn();
    const { settle } = await mount(onCellEdit as CellEditHandler<Shift>);
    activates()[2]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await settle();
    const input = editor() as HTMLInputElement;
    expect(input.type).toBe("date");
    expect(input.value).toBe("2026-08-13");
    input.value = "2026-09-01";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROW,
      "day",
      "2026-09-01"
    );
  });
});

describe("AdaptNativeCellEditor validation attributes", () => {
  const choices = [
    { value: "core", label: "Core" },
    { value: "web", label: "Web" },
  ];
  const kinds: EditableCellEditorCtrl["editor"][] = [
    "text",
    "number",
    "date",
    "boolean",
    { type: "select", options: choices },
    { type: "multi-select", options: choices },
  ];

  it.each(kinds)(
    "reflects and clears busy and conflict state for %j",
    async (kind) => {
      const fixture = TestBed.createComponent(AdaptNativeCellEditor);
      const props: EditableCellEditorCtrl = {
        editor: kind,
        draft: "",
        setDraft: vi.fn(),
        onEditorKeyDown: vi.fn(),
        commitOnBlur: vi.fn(),
        selectOptions: choices,
        label: "Edit team",
        error: "Value changed",
        errorId: "team-error",
        validating: true,
        conflict: true,
        focusRef: vi.fn(),
      };
      fixture.componentRef.setInput("props", props);
      document.body.append(fixture.nativeElement as HTMLElement);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      const field = editor();
      expect(field).not.toBeNull();
      expect(field!.getAttribute("aria-label")).toBe("Edit team");
      const controls =
        field instanceof HTMLInputElement
          ? [field]
          : [...field!.querySelectorAll<HTMLInputElement>("input")];
      expect(controls.length).toBeGreaterThan(0);
      for (const control of controls) {
        // Validation notices do not prevent the user from correcting a value.
        expect(control.disabled).toBe(false);
        expect(control.required).toBe(false);
        expect(control.readOnly).toBe(false);
      }
      expect(field!.getAttribute("aria-busy")).toBe("true");
      expect(field!.getAttribute("data-conflict")).toBe("");
      expect(field!.getAttribute("aria-invalid")).toBe("true");
      expect(field!.getAttribute("aria-describedby")).toBe("team-error");
      if (field instanceof HTMLInputElement) {
        expect(field.validity.customError).toBe(true);
        expect(field.classList.contains("ng-invalid")).toBe(true);
        expect(field.classList.contains("ng-touched")).toBe(true);
      }

      fixture.componentRef.setInput("props", {
        ...props,
        error: undefined,
        validating: false,
        conflict: false,
      });
      await fixture.whenStable();
      expect(field!.hasAttribute("aria-busy")).toBe(false);
      expect(field!.hasAttribute("data-conflict")).toBe(false);
      expect(field!.getAttribute("aria-invalid")).not.toBe("true");
      expect(field!.hasAttribute("aria-describedby")).toBe(false);
      if (field instanceof HTMLInputElement) {
        expect(field.validity.customError).toBe(false);
        expect(field.classList.contains("ng-valid")).toBe(true);
      }
      expect(props.setDraft).not.toHaveBeenCalled();
      expect(props.commitOnBlur).not.toHaveBeenCalled();
    }
  );
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

  it("uses Taiga checkboxes by default and commits their toggled values", async () => {
    const fixture = TestBed.createComponent(CheckboxEditorHost);
    fixture.componentRef.setInput("checkboxes", false);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    activates()[0]!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await fixture.whenStable();
    const group = editor();
    expect(group?.tagName).toBe("FIELDSET");
    expect(group?.getAttribute("aria-label")).toBe("Edit tags");
    const choices = [
      ...group!.querySelectorAll<HTMLInputElement>("input[tuiCheckbox]"),
    ];
    expect(choices.every((choice) => !choice.disabled)).toBe(true);
    expect(choices.map((choice) => choice.checked)).toEqual([false, true]);
    choices[0]!.click();
    await fixture.whenStable();
    expect(choices.map((choice) => choice.checked)).toEqual([true, true]);
    choices[1]!.click();
    await fixture.whenStable();
    expect(choices.map((choice) => choice.checked)).toEqual([true, false]);
    expect(fixture.componentInstance.onCellEdit).not.toHaveBeenCalled();
    choices[0]!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await fixture.whenStable();
    expect(
      fixture.componentInstance.onCellEdit
    ).toHaveBeenCalledExactlyOnceWith(fixture.componentInstance.row, "tags", [
      "urgent",
    ]);
    expect(editor()).toBeNull();
  });
});

describe("AdaptNativeCellEditor multi-select drafts", () => {
  it("serializes checkbox changes as drafts and preserves commas in option values", async () => {
    const fixture = TestBed.createComponent(AdaptNativeCellEditor);
    const choices = [
      { value: "ops, research", label: "Operations and research" },
      { value: "internal", label: "Internal" },
    ];
    const props: EditableCellEditorCtrl = {
      editor: { type: "multi-select", options: choices },
      draft: formatMultiDraft(["internal"]),
      setDraft: vi.fn((draft: string) => {
        props.draft = draft;
        fixture.componentRef.setInput("props", { ...props });
      }),
      onEditorKeyDown: vi.fn(),
      commitOnBlur: vi.fn(),
      selectOptions: choices,
      label: "Edit tags",
      errorId: "tags-error",
      validating: false,
      focusRef: vi.fn(),
    };
    fixture.componentRef.setInput("props", props);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const checks = [
      ...root.querySelectorAll<HTMLInputElement>("input[tuiCheckbox]"),
    ];
    expect(checks.every((check) => !check.disabled)).toBe(true);
    expect(checks.map((check) => check.checked)).toEqual([false, true]);

    checks[0]!.click();
    await fixture.whenStable();
    expect(props.setDraft).toHaveBeenLastCalledWith(
      formatMultiDraft(["internal", "ops, research"])
    );
    expect(checks.map((check) => check.checked)).toEqual([true, true]);

    checks[1]!.click();
    await fixture.whenStable();
    expect(props.setDraft).toHaveBeenLastCalledWith(
      formatMultiDraft(["ops, research"])
    );
    expect(checks.map((check) => check.checked)).toEqual([true, false]);

    checks[0]!.click();
    await fixture.whenStable();
    expect(props.setDraft).toHaveBeenLastCalledWith("");
    expect(checks.map((check) => check.checked)).toEqual([false, false]);
    expect(props.commitOnBlur).not.toHaveBeenCalled();
  });
});
