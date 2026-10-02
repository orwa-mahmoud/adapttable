/** NG-ZORRO fill handles and clipboard gestures through the complete table. */
import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { applyRowPatches, updateRow } from "@adapttable/core";
import { cellNavigation } from "@adapttable/ng-zorro/cell-navigation";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/ng-zorro/editing";
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { kitSelector } from "../../testUtils";
import { AdaptDataTable } from "../dataTable";

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
    [forceMobile]="mobile()"
    [urlSync]="false"
    dir="rtl"
  />`,
})
class Host {
  readonly data: Row[] = [
    { id: "1", name: "First" },
    { id: "2", name: "Second" },
  ];
  readonly columns: ColumnDef<Row>[] = [{ key: "name", editable: true }];
  readonly rowKey = (row: Row) => row.id;
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly mobile = input(false);
}

const part = <T extends HTMLElement>(name: string) =>
  document.querySelector<T>(kitSelector(name));
const cells = () => [
  ...document.querySelectorAll<HTMLElement>('[data-adapttable-part="cell"]'),
];

async function mount(features: readonly AdaptTableFeature[], mobile = false) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", features);
  fixture.componentRef.setInput("mobile", mobile);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("NG-ZORRO range editing", () => {
  it("draws only the corner handle and fills via the host when released outside", async () => {
    const saved = vi.fn();
    const fixture = await mount([cellNavigation(), editing<Row>(saved)]);
    expect(part("fill-handle")).toBeNull();
    cells()[0]!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    window.dispatchEvent(new MouseEvent("mouseup"));
    await fixture.whenStable();
    const handle = part("fill-handle")!;
    expect(handle.closest("td")).toBe(cells()[0]);
    expect(part("fill-handle-anchor")).not.toBeNull();
    expect(handle.title).toBe("Fill from selection");
    expect(handle.tagName).toBe("BUTTON");
    expect(handle.classList.contains("ant-btn-primary")).toBe(true);
    // NG-ZORRO hides .ant-btn:empty; the pointer affordance must remain drawn.
    expect(handle.matches(".ant-btn:empty")).toBe(false);
    expect(handle.tabIndex).toBe(-1);
    expect(handle.getAttribute("aria-hidden")).toBe("true");
    expect(handle.style.insetInlineEnd).toBe("-3px");
    handle.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true })
    );
    cells()[1]!.dispatchEvent(new MouseEvent("mouseenter"));
    window.dispatchEvent(new MouseEvent("mouseup"));
    await fixture.whenStable();
    expect(saved).toHaveBeenCalledExactlyOnceWith(
      fixture.componentInstance.data[1],
      "name",
      "First"
    );
    expect(part("fill-handle")!.closest("td")).toBe(cells()[1]);
  });

  it("undoes a multi-cell paste as exactly one gesture", async () => {
    const saved = vi.fn();
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn().mockResolvedValue("One\nTwo") },
    });
    const fixture = await mount([
      cellNavigation(),
      editing<Row>(saved),
      editHistory(),
      undoRedoButtons(),
    ]);
    cells()[0]!.focus();
    cells()[0]!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "v", ctrlKey: true, bubbles: true })
    );
    await fixture.whenStable();
    expect(saved.mock.calls.map((call) => call[2])).toEqual(["One", "Two"]);
    const undo = part<HTMLButtonElement>("undo-button")!;
    expect(undo.disabled).toBe(false);
    saved.mockClear();
    undo.click();
    await fixture.whenStable();
    expect(saved).toHaveBeenCalledTimes(2);
    expect(
      saved.mock.calls
        .map((call) => call[2])
        .sort((left, right) => left.localeCompare(right))
    ).toEqual(["First", "Second"]);
    expect(undo.disabled).toBe(true);
    expect(part<HTMLButtonElement>("redo-button")!.disabled).toBe(false);
  });

  it("has no fill affordance without write authority", async () => {
    const fixture = await mount([cellNavigation()]);
    cells()[0]!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    window.dispatchEvent(new MouseEvent("mouseup"));
    await fixture.whenStable();
    expect(part("fill-handle")).toBeNull();
  });

  it("keeps mobile cards inline-editable without the desktop drag affordance", async () => {
    const saved = vi.fn();
    const fixture = await mount([cellNavigation(), editing<Row>(saved)], true);
    expect(part("fill-handle")).toBeNull();
    part("edit-cell-activate")!.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true })
    );
    await fixture.whenStable();
    const editor = part<HTMLInputElement>("edit-cell-editor")!;
    editor.value = "Card value";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await fixture.whenStable();
    expect(saved).toHaveBeenCalledExactlyOnceWith(
      fixture.componentInstance.data[0],
      "name",
      "Card value"
    );
  });
});

/** A host using core patches, as realtime hosts do, with an aliased column. */
@Component({
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows()"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features"
    [urlSync]="false"
    [defaults]="{ limit: 10, search: 'a' }"
  />`,
})
class PatchedHost {
  readonly rows = signal<readonly Row[]>([
    { id: "1", name: "Ada Lovelace" },
    { id: "2", name: "Alan Turing" },
    { id: "3", name: "Grace Hopper" },
  ]);
  readonly rowKey = (row: Row) => row.id;
  readonly columns: ColumnDef<Row>[] = [
    {
      key: "person",
      header: "Name",
      accessor: (row) => row.name,
      sortValue: (row) => row.name,
      editable: true,
    },
  ];
  readonly saved = vi.fn((row: Row, key: string, value: unknown) => {
    if (key !== "person") throw new Error(`Unexpected edit column: ${key}`);
    this.rows.update((rows) =>
      applyRowPatches(
        rows,
        [updateRow<Row>(row.id, { name: String(value) })],
        this.rowKey
      )
    );
  });
  readonly features = [
    editing<Row>(this.saved),
    editHistory(),
    undoRedoButtons(),
    cellNavigation(),
  ];
}

async function mountPatchedHost() {
  const fixture = TestBed.createComponent(PatchedHost);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture;
}

const renderedNames = () => cells().map((cell) => cell.textContent?.trim());
const initialNames = ["Ada Lovelace", "Alan Turing", "Grace Hopper"];

describe("range edits with coalesced host row patches", () => {
  it("renders both pasted rows and restores both with a single undo", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        readText: vi.fn().mockResolvedValue("Pasted Ada\nPasted Grace"),
      },
    });
    const fixture = await mountPatchedHost();
    cells()[0]!.focus();
    cells()[0]!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "v",
        ctrlKey: true,
        bubbles: true,
      })
    );
    await vi.waitFor(() => {
      expect(fixture.componentInstance.saved).toHaveBeenCalledTimes(2);
    });
    await fixture.whenStable();
    expect(renderedNames()).toEqual([
      "Pasted Ada",
      "Pasted Grace",
      "Grace Hopper",
    ]);
    expect(fixture.componentInstance.rows().map((row) => row.name)).toEqual(
      renderedNames()
    );
    part<HTMLButtonElement>("undo-button")!.click();
    await fixture.whenStable();
    expect(renderedNames()).toEqual(initialNames);
    expect(part<HTMLButtonElement>("undo-button")!.disabled).toBe(true);
    part<HTMLButtonElement>("redo-button")!.click();
    await fixture.whenStable();
    expect(renderedNames()).toEqual([
      "Pasted Ada",
      "Pasted Grace",
      "Grace Hopper",
    ]);
  });

  it("renders both filled rows and restores both with a single undo", async () => {
    const fixture = await mountPatchedHost();
    cells()[0]!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    window.dispatchEvent(new MouseEvent("mouseup"));
    await fixture.whenStable();
    part("fill-handle")!.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      })
    );
    cells()[2]!.dispatchEvent(new MouseEvent("mouseenter"));
    window.dispatchEvent(new MouseEvent("mouseup"));
    await fixture.whenStable();
    expect(fixture.componentInstance.saved).toHaveBeenCalledTimes(2);
    expect(renderedNames()).toEqual([
      "Ada Lovelace",
      "Ada Lovelace",
      "Ada Lovelace",
    ]);
    expect(fixture.componentInstance.rows().map((row) => row.name)).toEqual(
      renderedNames()
    );
    part<HTMLButtonElement>("undo-button")!.click();
    await fixture.whenStable();
    expect(renderedNames()).toEqual(initialNames);
    expect(part<HTMLButtonElement>("undo-button")!.disabled).toBe(true);
  });
});
