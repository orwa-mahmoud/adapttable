/** Whole-row rules see the proposed row and report a rejected commit once. */
import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { editing } from "@adapttable/clarity/editing";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, expect, it, vi } from "vitest";

import { kitPart } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

interface Row {
  id: string;
  name: string;
}
const original: Row = { id: "1", name: "Ada" };
@Component({
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features()"
    [urlSync]="false"
  />`,
})
class Host {
  readonly rows = [original];
  readonly columns: ColumnDef<Row>[] = [
    {
      key: "name",
      header: "Name",
      accessor: (row) => row.name,
      editable: true,
    },
  ];
  readonly rowKey = (row: Row) => row.id;
  readonly features = input<readonly AdaptTableFeature[]>([]);
}
const part = (name: string) =>
  document.querySelector<HTMLElement>(kitPart(name))!;
afterEach(() => document.body.replaceChildren());
it("passes the proposed row to validation without mutating data and observes rejection", async () => {
  const commit = vi.fn();
  const applyEdit = vi.fn((row: Row, key: string, value: unknown): Row => ({
    ...row,
    [key]: value,
  }));
  const validateRow = vi.fn((row: Row) =>
    row.name === "Blocked" ? "This name is reserved" : undefined
  );
  const onValidationFail = vi.fn();
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", [
    editing(commit, { applyEdit, validateRow, onValidationFail }),
  ]);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  part("edit-cell-activate").dispatchEvent(
    new MouseEvent("dblclick", { bubbles: true })
  );
  await fixture.whenStable();
  const editor = part("edit-cell-editor") as HTMLInputElement;
  editor.value = "Blocked";
  editor.dispatchEvent(new Event("input"));
  editor.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
  );
  await fixture.whenStable();
  expect(applyEdit).toHaveBeenCalledWith(original, "name", "Blocked");
  expect(validateRow).toHaveBeenCalledWith({ id: "1", name: "Blocked" });
  expect(original.name).toBe("Ada");
  expect(commit).not.toHaveBeenCalled();
  expect(part("edit-cell-error").textContent).toContain(
    "This name is reserved"
  );
  expect(onValidationFail).toHaveBeenCalledOnce();
  editor.value = "Augusta";
  editor.dispatchEvent(new Event("input"));
  editor.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
  );
  await fixture.whenStable();
  expect(commit).toHaveBeenCalledExactlyOnceWith(original, "name", "Augusta");
  expect(onValidationFail).toHaveBeenCalledOnce();
});
