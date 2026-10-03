import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  BrnPopover,
  BrnPopoverContent,
  BrnPopoverTrigger,
} from "@spartan-ng/brain/popover";

import { menuPopover } from "./components/menuPopover";
import { HlmButton } from "./helm/controls";

@Component({
  imports: [BrnPopover, BrnPopoverContent, BrnPopoverTrigger, HlmButton],
  template: `<div
      brnPopover
      [state]="popover.open() ? 'open' : 'closed'"
      (stateChanged)="popover.setOpen($event === 'open')"
    >
      <button adaptHlmButton brnPopoverTrigger>Open menu</button>
      <ng-template brnPopoverContent>
        <section class="at-spartan-surface" data-adapttable-kit="spartan">
          <button adaptHlmButton (click)="selected.set(true)">
            Select item
          </button>
        </section>
      </ng-template>
    </div>
    <button class="outside">Outside</button>`,
})
class Host {
  readonly popover = menuPopover();
  readonly selected = signal(false);
}

describe("Spartan Brain popover", () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    document.body.append(fixture.nativeElement as HTMLElement);
    await fixture.whenStable();
    const trigger = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>("[brnPopoverTrigger]")!;
    return { fixture, trigger, settle: () => fixture.whenStable() };
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.replaceChildren();
  });

  it("uses the kit overlay without a backdrop and updates the trigger state", async () => {
    const { fixture, trigger, settle } = await mount();
    trigger.focus();
    trigger.click();
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector(".cdk-overlay-backdrop")).toBeNull();
    const item = document.querySelector<HTMLButtonElement>(
      ".cdk-overlay-container button"
    )!;
    expect(item.classList.contains("at-spartan-button")).toBe(true);
    item.click();
    expect(fixture.componentInstance.selected()).toBe(true);
    fixture.componentInstance.popover.close();
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".cdk-overlay-container button")).toBeNull();
  });

  it("supports repeated opening and controlled dismissal", async () => {
    const { fixture, trigger, settle } = await mount();
    for (let cycle = 0; cycle < 2; cycle += 1) {
      trigger.click();
      await settle();
      expect(fixture.componentInstance.popover.open()).toBe(true);
      fixture.componentInstance.popover.setOpen(false);
      await settle();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    }
  });
});
