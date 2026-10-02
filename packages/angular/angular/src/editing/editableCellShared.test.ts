/** Idle editable-cell content retains Angular templates and their live values. */
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { AdaptEditableCellDisplay } from "./editableCellShared";

@Component({
  imports: [AdaptEditableCellDisplay],
  template: `
    <ng-template #display
      ><strong class="name">{{ name() }}</strong></ng-template
    >
    <adapt-editable-cell-display [props]="display" />
  `,
})
class DisplayHost {
  readonly name = signal("Ada");
}

describe("AdaptEditableCellDisplay", () => {
  it("stamps the supplied template and follows its host value changes", async () => {
    const fixture = TestBed.createComponent(DisplayHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const name = root.querySelector<HTMLElement>("strong.name");
    expect(name?.textContent).toBe("Ada");
    fixture.componentInstance.name.set("Grace");
    await fixture.whenStable();
    expect(root.querySelector("strong.name")).toBe(name);
    expect(name?.textContent).toBe("Grace");
    expect(root.textContent?.trim()).toBe("Grace");
  });
});
