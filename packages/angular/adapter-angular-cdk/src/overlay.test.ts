import { BidiModule } from "@angular/cdk/bidi";
import {
  CdkConnectedOverlay,
  type ConnectedPosition,
  OverlayModule,
} from "@angular/cdk/overlay";
import { ViewportRuler } from "@angular/cdk/scrolling";
import { EMPTY } from "rxjs";

import { fixtureOverlayProviders } from "../testing/overlayFixture";
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
  return {
    left,
    right,
    bottom,
    top: 0,
    width: right - left,
    height: bottom,
  } as DOMRect;
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

const viewportRuler = {
  getViewportSize: () => ({ width: 1000, height: 800 }),
  getViewportScrollPosition: () => ({ top: 0, left: 0 }),
  getViewportRect: () => ({
    top: 0,
    left: 0,
    right: 1000,
    bottom: 800,
    width: 1000,
    height: 800,
  }),
  change: () => EMPTY,
};

@Component({
  imports: [BidiModule, OverlayModule],
  providers: [
    ...fixtureOverlayProviders,
    { provide: ViewportRuler, useValue: viewportRuler },
  ],
  template: `
    <div #root [dir]="dir()">
      <button
        #trigger
        type="button"
        cdkOverlayOrigin
        #origin="cdkOverlayOrigin"
      >
        Open
      </button>
      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="popover.open() && showPanel()"
        [cdkConnectedOverlayPositions]="positions"
      >
        <div #panel class="panel"><span class="inside">In</span></div>
      </ng-template>
    </div>
    <span class="outside">Out</span>
  `,
})
class Host {
  readonly showPanel = signal(true);
  readonly dir = signal<"ltr" | "rtl">("ltr");
  readonly positions: ConnectedPosition[] = [
    { originX: "start", originY: "bottom", overlayX: "start", overlayY: "top" },
  ];
  readonly overlay = viewChild.required(CdkConnectedOverlay);
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

describe("menuPopover with native CDK placement", () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    const element = fixture.nativeElement as HTMLElement;
    document.body.append(element);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = element.querySelector("button");
    if (!trigger) throw new Error("trigger is not rendered");
    trigger.getBoundingClientRect = () => rect(300, 400);
    const { popover } = fixture.componentInstance;
    const open = async () => {
      popover.toggle();
      await fixture.whenStable();
      const overlay = fixture.componentInstance.overlay().overlayRef;
      if (overlay) {
        overlay.overlayElement.getBoundingClientRect = () => rect(0, 200, 40);
        overlay.updatePosition();
      }
    };
    return {
      fixture,
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
    const { element, popover, open, settle, host } = await mount();
    await open();
    const overlay = host.overlay().overlayRef;
    expect(overlay.hostElement.style.top).toBe("20px");
    expect(overlay.hostElement.style.left).toBe("300px");
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
    const { popover, open, settle, host } = await mount();
    host.showPanel.set(false);
    await open();
    expect(popover.open()).toBe(true);
    popover.close();
    host.showPanel.set(true);
    host.dir.set("rtl");
    await settle();
    await open();
    const overlay = host.overlay().overlayRef;
    expect(overlay.getConfig().direction).toBe("rtl");
    expect(overlay.hostElement.style.top).toBe("20px");
    expect(overlay.hostElement.style.right).toBe("600px");
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

  it("keeps simultaneous fixture portals scoped to their owners and tears down independently", async () => {
    const first = await mount();
    const second = await mount();
    await first.open();
    await second.open();
    expect(first.element.querySelectorAll(".panel")).toHaveLength(1);
    expect(second.element.querySelectorAll(".panel")).toHaveLength(1);
    expect(first.element.querySelector(".panel")).not.toBe(
      second.element.querySelector(".panel")
    );
    first.fixture.destroy();
    expect(first.element.querySelector(".cdk-overlay-container")).toBeNull();
    expect(second.element.querySelectorAll(".panel")).toHaveLength(1);
    second.fixture.destroy();
    expect(second.element.querySelector(".cdk-overlay-container")).toBeNull();
  });
});
