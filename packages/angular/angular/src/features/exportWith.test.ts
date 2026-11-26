import { csvWriter, deferredExportWriter } from "@adapttable/core";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ADAPTTABLE_CONTEXT_MENU } from "../actions/tableContextMenu";
import { AdaptDataTableShell } from "../layout/dataTableShell";
import { exportWith } from "./exportWith";

interface Row {
  id: string;
  name: string;
}

@Component({
  selector: "app-export-writer-shell",
  template: "",
  providers: [
    { provide: ADAPTTABLE_CONTEXT_MENU, useFactory: () => signal(null) },
  ],
})
class Shell extends AdaptDataTableShell<Row> {}

function mount(features: ReturnType<typeof exportWith>[]) {
  const fixture = TestBed.createComponent(Shell);
  fixture.componentRef.setInput("data", [{ id: "1", name: "Ada" }]);
  fixture.componentRef.setInput("columns", [{ key: "name" }]);
  fixture.componentRef.setInput("rowKey", (row: Row) => row.id);
  fixture.componentRef.setInput("urlSync", false);
  fixture.componentRef.setInput("features", features);
  fixture.detectChanges();
  return fixture;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("an export writer that loads on demand", () => {
  it("starts loading once the table is up", async () => {
    const load = vi.fn(() => Promise.resolve(csvWriter));
    const fixture = mount([
      exportWith(true, deferredExportWriter("csv", load)),
    ]);
    await fixture.whenStable();
    await vi.waitFor(() => {
      expect(load).toHaveBeenCalledTimes(1);
    });
    fixture.destroy();
  });

  it("schedules nothing for a writer that builds at once", async () => {
    const idle = vi.fn();
    vi.stubGlobal("requestIdleCallback", idle);
    const fixture = mount([exportWith(true, csvWriter)]);
    await fixture.whenStable();
    expect(idle).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
