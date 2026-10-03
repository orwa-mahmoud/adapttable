import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { TAIGA_CONTROLS } from "./taigaControls";
import { AdaptTaigaRoot } from "./taigaRoot";
import { taigaPopup } from "./taigaTestHelpers";

@Component({
  imports: [...TAIGA_CONTROLS, AdaptTaigaRoot],
  template: `<adapt-taiga-root>
    <button
      tuiButton
      type="button"
      [tuiDropdown]="content"
      tuiDropdownRole="dialog"
      [adaptTaigaDropdownLabel]="label()"
      [tuiDropdownOpen]="open()"
      (tuiDropdownOpenChange)="open.set($event)"
      [attr.aria-label]="label()"
    >
      {{ label() }}
    </button>
    <ng-template #content
      ><button tuiButton type="button">Run action</button></ng-template
    >
  </adapt-taiga-root>`,
})
class Host {
  readonly label = signal("Actions");
  readonly open = signal(false);
}

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.replaceChildren();
});

describe("native freeform dropdown labels", () => {
  it("names the controlled dialog and relabels the same open portal", async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>("button")!;
    trigger.click();
    await fixture.whenStable();
    const popup = taigaPopup(trigger)!;
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(popup.getAttribute("role")).toBe("dialog");
    expect(popup.getAttribute("aria-label")).toBe("Actions");
    expect(popup.querySelector("button")?.textContent).toBe("Run action");
    fixture.componentInstance.label.set("Actions françaises");
    await fixture.whenStable();
    expect(taigaPopup(trigger)).toBe(popup);
    expect(popup.getAttribute("aria-label")).toBe("Actions françaises");
    trigger.click();
    await fixture.whenStable();
    expect(taigaPopup(trigger)).toBeNull();
  });
});
