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
import { TAIGA_CONTROLS } from "./taigaControls";
import { AdaptTaigaRoot } from "./taigaRoot";

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
  imports: [AdaptTaigaRoot, ...TAIGA_CONTROLS],
  template: `
    <adapt-taiga-root [dir]="direction()">
      <div
        #root
        [tuiDropdown]="content"
        [tuiDropdownOpen]="popover.open()"
        (tuiDropdownOpenChange)="popover.setOpen($event)"
      >
        <button
          #trigger
          #tuiDropdownHost
          tuiButton
          type="button"
          class="trigger"
          [attr.aria-expanded]="popover.open()"
        >
          Open
        </button>
        <ng-template #content>
          @if (popover.open() && showPanel()) {
            <div #panel class="panel">
              <button tuiButton type="button" class="inside">Inside</button>
              <button
                tuiButton
                type="button"
                class="nested-trigger"
                [tuiDropdown]="nestedContent"
                [tuiDropdownOpen]="nestedOpen()"
                (tuiDropdownOpenChange)="nestedOpen.set($event)"
              >
                Nested
              </button>
              <ng-template #nestedContent>
                <button tuiButton type="button" class="nested-inside">
                  Nested option
                </button>
              </ng-template>
            </div>
          }
        </ng-template>
      </div>
      <button tuiButton type="button" class="outside">Outside</button>
    </adapt-taiga-root>
  `,
})
class Host {
  readonly direction = signal<"ltr" | "rtl">("ltr");
  readonly showPanel = signal(true);
  readonly nestedOpen = signal(false);
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

describe("menuPopover with native Taiga dropdowns", () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    const element = fixture.nativeElement as HTMLElement;
    document.body.append(element);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const { popover } = fixture.componentInstance;
    const trigger = element.querySelector<HTMLButtonElement>(".trigger")!;
    const open = async () => {
      trigger.focus();
      trigger.click();
      await fixture.whenStable();
    };
    return {
      element,
      trigger,
      popover,
      open,
      host: fixture.componentInstance,
      settle: () => fixture.whenStable(),
    };
  }

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("mirrors native open and close events without a second click toggle", async () => {
    const { element, trigger, popover, open, settle } = await mount();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await open();
    expect(popover.open()).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(
      element.querySelector(".panel")?.closest("tui-dropdown")
    ).toBeInstanceOf(HTMLElement);
    popover.setOpen(true);
    await settle();
    expect(popover.open()).toBe(true);
    trigger.click();
    await settle();
    expect(popover.open()).toBe(false);
    expect(element.querySelector(".panel")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await open();
    expect(popover.open()).toBe(true);
    popover.toggle();
    await settle();
    expect(popover.open()).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps the native active zone open inside and dismisses outside", async () => {
    const { element, popover, open, settle } = await mount();
    await open();
    const inside = element.querySelector<HTMLButtonElement>(".inside")!;
    inside.focus();
    inside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    inside.click();
    await settle();
    expect(popover.open()).toBe(true);
    const outside = element.querySelector<HTMLButtonElement>(".outside")!;
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    outside.focus();
    outside.click();
    await settle();
    expect(popover.open()).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  it("keeps delayed content in its scoped native RTL portal", async () => {
    const { element, popover, open, settle, host } = await mount();
    host.direction.set("rtl");
    host.showPanel.set(false);
    await open();
    expect(popover.open()).toBe(true);
    expect(element.querySelector(".panel")).toBeNull();
    host.showPanel.set(true);
    await settle();
    const panel = element.querySelector(".panel")!;
    expect(panel.closest("tui-dropdown")).not.toBeNull();
    expect(
      panel.closest("[data-adapttable-taiga-root]")?.getAttribute("dir")
    ).toBe("rtl");
    popover.close();
    await settle();
    expect(popover.open()).toBe(false);
    expect(element.querySelector(".panel")).toBeNull();
  });

  it("dismisses the nested native menu first and restores each trigger on Escape", async () => {
    const { element, trigger, popover, open, settle, host } = await mount();
    await open();
    const nested = element.querySelector<HTMLButtonElement>(".nested-trigger")!;
    nested.focus();
    nested.click();
    await settle();
    expect(host.nestedOpen()).toBe(true);
    const option = element.querySelector<HTMLButtonElement>(".nested-inside")!;
    option.focus();
    option.click();
    await settle();
    expect(popover.open()).toBe(true);
    expect(host.nestedOpen()).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(popover.open()).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await settle();
    expect(host.nestedOpen()).toBe(false);
    expect(popover.open()).toBe(true);
    expect(document.activeElement).toBe(nested);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await settle();
    expect(popover.open()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});
