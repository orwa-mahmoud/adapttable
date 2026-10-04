import { A11yModule, FocusMonitor } from "@angular/cdk/a11y";
import { CdkConnectedOverlay, OverlayContainer } from "@angular/cdk/overlay";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { afterEach, describe, expect, it } from "vitest";

import { AdaptAssistantSheet } from "../assistant/assistant";
import { AdaptCdkPopover } from "./components/cdkPopover";

@Component({
  imports: [A11yModule, AdaptCdkPopover],
  template: `
    <adapt-cdk-popover [trigger]="trigger" [content]="content" [dir]="dir()" />
    <ng-template #trigger let-toggle let-open="open">
      <button
        cdkMonitorElementFocus
        [attr.aria-expanded]="open"
        (click)="toggle()"
      >
        Open
      </button>
    </ng-template>
    <ng-template #content
      ><button data-testid="inside">Inside</button></ng-template
    >
  `,
})
class PopoverHost {
  readonly dir = signal<"ltr" | "rtl">("rtl");
}

@Component({
  imports: [AdaptAssistantSheet],
  template: `
    <button (click)="open.set(true)">Launch</button>
    <ng-template #contents
      ><button>First</button><button>Last</button></ng-template
    >
    <adapt-assistant-sheet
      [props]="{
        open: open(),
        label: 'Conversation',
        part: 'assistant-sheet',
        children: contents,
        onClose: close,
        dir: 'rtl',
      }"
    />
  `,
})
class ModalHost {
  readonly open = signal(false);
  readonly close = () => this.open.set(false);
}

describe("CDK native primitives", () => {
  afterEach(() => TestBed.resetTestingModule());

  it("uses FocusMonitor and a backdrop-free RTL portal that restores its trigger on Escape", async () => {
    const fixture = TestBed.createComponent(PopoverHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector(
      "button"
    )!;
    TestBed.inject(FocusMonitor).focusVia(trigger, "keyboard");
    expect(trigger.classList.contains("cdk-keyboard-focused")).toBe(true);
    trigger.click();
    await fixture.whenStable();
    const container = TestBed.inject(OverlayContainer).getContainerElement();
    const inside = container.querySelector<HTMLButtonElement>(
      '[data-testid="inside"]'
    )!;
    expect(inside).not.toBeNull();
    expect(container.querySelector(".cdk-overlay-backdrop")).toBeNull();
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    inside.focus();
    const overlay = fixture.debugElement
      .queryAllNodes(By.directive(CdkConnectedOverlay))[0]!
      .injector.get(CdkConnectedOverlay);
    const originPress = new MouseEvent("pointerdown", { bubbles: true });
    trigger.dispatchEvent(originPress);
    overlay.overlayOutsideClick.emit(originPress);
    await fixture.whenStable();
    expect(container.querySelector('[data-testid="inside"]')).toBe(inside);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    inside.dispatchEvent(tab);
    // Verify the adapter's public CDK-output contract as well as the native
    // dispatcher, which may filter keys before forwarding them to a portal.
    overlay.overlayKeydown.emit(tab);
    await fixture.whenStable();
    expect(tab.defaultPrevented).toBe(false);
    expect(container.querySelector('[data-testid="inside"]')).toBe(inside);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    inside.addEventListener("keydown", (event) => event.preventDefault(), {
      once: true,
    });
    const consumed = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    inside.dispatchEvent(consumed);
    overlay.overlayKeydown.emit(consumed);
    await fixture.whenStable();
    expect(consumed.defaultPrevented).toBe(true);
    expect(container.querySelector('[data-testid="inside"]')).toBe(inside);
    expect(document.activeElement).toBe(inside);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    inside.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(container.querySelector('[data-testid="inside"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fixture.destroy();
  });

  it("dismisses a connected portal on an outside click and can reopen", async () => {
    const fixture = TestBed.createComponent(PopoverHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector(
      "button"
    )!;
    trigger.click();
    await fixture.whenStable();
    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true })
    );
    document.body.click();
    await fixture.whenStable();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    await fixture.whenStable();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fixture.destroy();
  });

  it("uses a blocking CDK modal backdrop and focus trap with reopenable controlled state", async () => {
    const fixture = TestBed.createComponent(ModalHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector(
      "button"
    )!;
    trigger.focus();
    trigger.click();
    await fixture.whenStable();
    const container = TestBed.inject(OverlayContainer).getContainerElement();
    expect(
      container.querySelector('[role="dialog"][aria-modal="true"]')
    ).not.toBeNull();
    expect(container.querySelectorAll(".cdk-focus-trap-anchor")).toHaveLength(
      2
    );
    container.querySelector<HTMLElement>(".adapt-cdk-backdrop")!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    trigger.click();
    await fixture.whenStable();
    container.querySelector("button")!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
  });
});
