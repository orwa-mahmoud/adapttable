import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { ADAPTTABLE_CONTEXT_MENU } from "../actions/tableContextMenu";
import { AdaptDataTableShell } from "../layout/dataTableShell";

const FORCED_COLORS_STYLE_ID = "adapttable-forced-colors";

interface Row {
  id: string;
  name: string;
}

@Component({
  selector: "app-forced-colors-shell",
  template: "",
  providers: [
    { provide: ADAPTTABLE_CONTEXT_MENU, useFactory: () => signal(null) },
  ],
})
class Shell extends AdaptDataTableShell<Row> {}

const columns = [{ key: "name" }];
const rowKey = (row: Row) => row.id;

function bind(
  fixture: ReturnType<typeof TestBed.createComponent<Shell>>
): void {
  fixture.componentRef.setInput("data", [{ id: "1", name: "Ada" }]);
  fixture.componentRef.setInput("columns", columns);
  fixture.componentRef.setInput("rowKey", rowKey);
  fixture.componentRef.setInput("urlSync", false);
}

afterEach(() => {
  document.getElementById(FORCED_COLORS_STYLE_ID)?.remove();
});

describe("mountForcedColorsStyles", () => {
  it("installs the stylesheet once for two tables", async () => {
    const first = TestBed.createComponent(Shell);
    const second = TestBed.createComponent(Shell);
    bind(first);
    bind(second);
    first.detectChanges();
    second.detectChanges();
    await first.whenStable();
    await second.whenStable();
    expect(
      document.querySelectorAll(`#${FORCED_COLORS_STYLE_ID}`)
    ).toHaveLength(1);
    first.destroy();
    expect(document.getElementById(FORCED_COLORS_STYLE_ID)).not.toBeNull();
  });
});
