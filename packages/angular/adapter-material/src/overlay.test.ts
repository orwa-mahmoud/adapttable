import {
  Component,
  type ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { menuPopover } from "./components/menuPopover";
@Component({
  template: `
    <div #root>
      <button #trigger type="button">Open</button>
      @if (popover.open() && showPanel()) {
        <div #panel class="panel"><span class="inside">In</span></div>
      }
    </div>
    <span class="outside">Out</span>
  `,
})
class Host {
  readonly showPanel = signal(true);
  private readonly root = viewChild<ElementRef<HTMLElement>>("root");
  private readonly trigger = viewChild<ElementRef<HTMLElement>>("trigger");
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");
  readonly popover = menuPopover(
    {
      root: () => this.root()?.nativeElement,
      trigger: () => this.trigger()?.nativeElement,
      panel: () => this.panel()?.nativeElement,
    },
    inject(Injector)
  );
}

describe("menuPopover", () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    document.body.append(element);
    const { popover } = fixture.componentInstance;
    const open = async () => {
      popover.toggle();
      await fixture.whenStable();
    };
    return {
      element,
      popover,
      open,
      host: fixture.componentInstance,
      settle: () => fixture.whenStable(),
    };
  }

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("stays open on a press inside, closes on one outside", async () => {
    const { element, popover, open, settle } = await mount();
    await open();
    expect(element.querySelector<HTMLElement>(".panel")).not.toBeNull();
    element
      .querySelector(".inside")!
      .dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(popover.open()).toBe(true);
    element
      .querySelector(".outside")!
      .dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await settle();
    expect(popover.open()).toBe(false);
  });

  it("keeps disclosure state while its Material surface mounts and unmounts", async () => {
    const { element, popover, open, settle, host } = await mount();
    host.showPanel.set(false);
    await open();
    expect(popover.open()).toBe(true);
    popover.close();
    host.showPanel.set(true);
    await settle();
    element.querySelector("button")?.setAttribute("style", "direction: rtl");
    await open();
    expect(element.querySelector<HTMLElement>(".panel")).not.toBeNull();
    popover.close();
    await settle();
    expect(popover.open()).toBe(false);
  });

  it("closes on Escape and hands focus back to the trigger", async () => {
    const { element, popover, open, settle } = await mount();
    await open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(popover.open()).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await settle();
    expect(popover.open()).toBe(false);
    expect(document.activeElement).toBe(element.querySelector("button"));
  });
});
