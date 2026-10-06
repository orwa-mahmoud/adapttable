/** The structural renderer also supports a headless host without a wrapper guard. */
import { AdaptHeaderActions, type ColumnDef } from "@adapttable/angular";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

@Component({
  imports: [AdaptHeaderActions],
  template: `<span [adaptHeaderActions]="column()"></span>`,
})
class Host {
  readonly column = signal<ColumnDef<{ name: string }>>({ key: "name" });
}

describe("AdaptHeaderActions", () => {
  it("renders nothing for omitted actions and follows plain text changes", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent?.trim()).toBe("");
    fixture.componentInstance.column.set({
      key: "name",
      headerActions: "Info",
    });
    await fixture.whenStable();
    expect(element.textContent?.trim()).toBe("Info");
    fixture.componentInstance.column.set({ key: "name" });
    await fixture.whenStable();
    expect(element.textContent?.trim()).toBe("");
  });
});
