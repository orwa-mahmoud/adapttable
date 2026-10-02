/**
 * Mounted cell save feedback: pending work, rejection wording and host-owned
 * rollback on desktop rows and mobile cards.
 */
import type {
  AdaptTableFeature,
  CellEditHandler,
  ColumnDef,
} from "@adapttable/angular";
import { editing } from "@adapttable/angular-unstyled/editing";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "./dataTable";

interface Row {
  id: string;
  name: string;
}

const ROW: Row = { id: "1", name: "Ada" };
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name, editable: true },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="[row]"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features()"
      [forceMobile]="mobile()"
      [urlSync]="false"
    />
  `,
})
class Host {
  readonly row = ROW;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Row) => row.id;
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly mobile = input(false);
}

function part(name: string): HTMLElement | null {
  return document.querySelector(`[data-adapttable-part="${name}"]`);
}

function requiredPart(name: string): HTMLElement {
  const element = part(name);
  expect(element, name).not.toBeNull();
  return element!;
}

async function mount(
  mobile: boolean,
  onCellEdit: CellEditHandler<Row>,
  extras: Record<string, unknown> = {}
) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", [editing(onCellEdit, extras)]);
  fixture.componentRef.setInput("mobile", mobile);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const settle = async () => {
    // Let the host promise reach the save store before waiting for the
    // render it schedules; an already-stable fixture has nothing to await.
    await Promise.resolve();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return {
    settle,
    edit: async (value: string) => {
      requiredPart("edit-cell-activate").dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true })
      );
      await settle();
      const editor = requiredPart("edit-cell-editor") as HTMLInputElement;
      editor.value = value;
      editor.dispatchEvent(new Event("input"));
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
      await settle();
    },
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe.each([false, true])("cell save feedback with mobile=%s", (mobile) => {
  it("marks a pending save busy, then announces and reports the host-formatted failure", async () => {
    let rejectSave!: (reason: unknown) => void;
    const pending = new Promise<void>((_resolve, reject) => {
      rejectSave = reject;
    });
    const onCellEdit = vi.fn(() => pending);
    const rejection = new Error("Conflict from server");
    const formatEditError = vi.fn(() => "Reload before saving this name");
    const onEditError = vi.fn();
    const { edit, settle } = await mount(mobile, onCellEdit, {
      formatEditError,
      onEditError,
    });
    await edit("Augusta");
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROW, "name", "Augusta");
    expect(requiredPart("edit-cell-activate").getAttribute("aria-busy")).toBe(
      "true"
    );
    expect(requiredPart("edit-cell-activate").getAttribute("data-save")).toBe(
      "saving"
    );
    expect(part("edit-cell-save-error")).toBeNull();
    expect(onEditError).not.toHaveBeenCalled();
    rejectSave(rejection);
    await settle();
    expect(formatEditError).toHaveBeenCalledExactlyOnceWith(rejection);
    expect(onEditError).toHaveBeenCalledExactlyOnceWith({
      row: ROW,
      rowId: "1",
      columnKey: "name",
      value: "Augusta",
      previousValue: "Ada",
      unit: "cell",
      error: "Reload before saving this name",
    });
    const failure = requiredPart("edit-cell-save-error");
    expect(failure.getAttribute("role")).toBe("alert");
    expect(failure.textContent?.trim()).toBe("Reload before saving this name");
    expect(requiredPart("edit-cell-activate").getAttribute("data-save")).toBe(
      "failed"
    );
    expect(requiredPart("edit-cell-activate").hasAttribute("aria-busy")).toBe(
      false
    );
    expect(part("edit-cell-rollback")).toBeNull();
  });

  it("asks the host to restore the previous row and clears the failure on Undo", async () => {
    const onEditRollback = vi.fn();
    const { edit, settle } = await mount(
      mobile,
      () => Promise.reject(new Error("Conflict")),
      { onEditRollback }
    );
    await edit("Augusta");
    expect(requiredPart("edit-cell-save-error").textContent).toContain(
      "Conflict"
    );
    expect(onEditRollback).not.toHaveBeenCalled();
    const rollback = requiredPart("edit-cell-rollback");
    expect(rollback.tagName).toBe("BUTTON");
    expect(rollback.textContent?.trim()).toBe("Undo");
    rollback.click();
    await settle();
    expect(onEditRollback).toHaveBeenCalledExactlyOnceWith(ROW, "name");
    expect(part("edit-cell-save-error")).toBeNull();
    expect(part("edit-cell-rollback")).toBeNull();
    expect(requiredPart("edit-cell-activate").hasAttribute("data-save")).toBe(
      false
    );
    expect(requiredPart("edit-cell-activate").textContent?.trim()).toBe("Ada");
  });
});
