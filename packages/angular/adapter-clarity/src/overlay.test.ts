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
import { placeOverlayBelowTrigger } from "./components/overlayPlacement";

function rect(left: number, right: number, bottom = 20): DOMRect {
  return { left, right, bottom, top: 0, width: right - left } as DOMRect;
}

function place(
  overlayRect: DOMRect,
  dir: "ltr" | "rtl",
  measured = 200
): HTMLElement {
  const overlay = document.createElement("div");
  const trigger = document.createElement("button");
  Object.defineProperty(overlay, "offsetWidth", { value: measured });
  overlay.getBoundingClientRect = () => overlayRect;
  trigger.getBoundingClientRect = () => rect(300, 400);
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: 1000,
  });
  placeOverlayBelowTrigger(overlay, trigger, dir);
  return overlay;
}

describe("placeOverlayBelowTrigger", () => {
  it("end-aligns under the trigger in LTR, start-aligns in RTL", () => {
    expect(place(rect(200, 400), "ltr").style.left).toBe("200px");
    expect(place(rect(300, 500), "rtl", 0).style.left).toBe("300px");
  });

  it("shifts back inside the viewport from either edge", () => {
    expect(place(rect(-50, 150), "ltr").style.transform).toBe(
      "translateX(58px)"
    );
    expect(place(rect(900, 1100), "ltr").style.transform).toBe(
      "translateX(-108px)"
    );
    expect(place(rect(200, 400), "ltr").style.transform).toBe("");
  });
});

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
    expect(element.querySelector<HTMLElement>(".panel")?.style.top).not.toBe(
      ""
    );
    window.dispatchEvent(new Event("resize"));
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

  it("places the panel from the start edge in RTL, and waits for a panel", async () => {
    const { element, popover, open, settle, host } = await mount();
    host.showPanel.set(false);
    await open();
    expect(popover.open()).toBe(true);
    popover.close();
    host.showPanel.set(true);
    await settle();
    element.querySelector("button")?.setAttribute("style", "direction: rtl");
    await open();
    expect(element.querySelector<HTMLElement>(".panel")?.style.left).not.toBe(
      ""
    );
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
