import { type AdaptTableFeature, type ColumnDef } from "@adapttable/angular";
import { cellNavigation } from "@adapttable/taiga-ui/cell-navigation";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/taiga-ui/editing";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "./dataTable";

/** Inline edits and history controls replay through the host on desktop and cards. */

interface Row {
  id: string;
  name: string;
}
@Component({
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="data"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features()"
    [urlSync]="false"
    [forceMobile]="mobile()"
  />`,
})
class Host {
  readonly data: Row[] = [{ id: "1", name: "Before" }];
  readonly columns: ColumnDef<Row>[] = [{ key: "name", editable: true }];
  readonly rowKey = (row: Row) => row.id;
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly mobile = input(false);
}

function part<T extends HTMLElement>(name: string): T {
  const element = document.querySelector<T>(
    `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
  );
  expect(element, name).not.toBeNull();
  return element!;
}
afterEach(() => {
  document.body.innerHTML = "";
});

describe("edit history controls", () => {
  it.each([false, true])(
    "undoes and redoes a committed edit with mobile=%s",
    async (mobile) => {
      const saved = vi.fn();
      const fixture = TestBed.createComponent(Host);
      fixture.componentRef.setInput("features", [
        editing<Row>(saved),
        editHistory(),
        undoRedoButtons(),
        cellNavigation(),
      ]);
      fixture.componentRef.setInput("mobile", mobile);
      document.body.append(fixture.nativeElement);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      expect(part<HTMLButtonElement>("undo-button").disabled).toBe(true);
      expect(part<HTMLButtonElement>("redo-button").disabled).toBe(true);
      part<HTMLButtonElement>("edit-cell-activate").dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true })
      );
      await fixture.whenStable();
      const field = part<HTMLInputElement>("edit-cell-editor");
      field.value = "After";
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
      await fixture.whenStable();
      const row = fixture.componentInstance.data[0]!;
      expect(saved).toHaveBeenLastCalledWith(row, "name", "After");
      expect(part<HTMLButtonElement>("undo-button").disabled).toBe(false);
      part<HTMLButtonElement>("undo-button").click();
      await fixture.whenStable();
      expect(saved).toHaveBeenLastCalledWith(row, "name", "Before");
      expect(part<HTMLButtonElement>("redo-button").disabled).toBe(false);
      part<HTMLButtonElement>("redo-button").click();
      await fixture.whenStable();
      expect(saved).toHaveBeenLastCalledWith(row, "name", "After");
    }
  );
});
