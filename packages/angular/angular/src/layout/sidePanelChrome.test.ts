/**
 * The side panel chrome: the tab strip, the body, and the row it docks in.
 */
import { NgTemplateOutlet } from "@angular/common";
import {
  Component,
  computed,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import type { SidePanelPanel } from "../features/factories";
import {
  AdaptSidePanelChrome,
  AdaptSidePanelLayout,
  type SidePanelSlots,
} from "./sidePanelChrome";

@Component({
  selector: "panel-frame",
  imports: [NgTemplateOutlet],
  template: `
    <aside data-adapttable-part="side-panel" [attr.data-side]="props().side">
      @if (props().header; as header) {
        <ng-container [ngTemplateOutlet]="header" />
      }
      @if (props().body; as body) {
        <ng-container [ngTemplateOutlet]="body" />
      }
    </aside>
  `,
})
class Frame {
  readonly props = input.required<{
    readonly side: "start" | "end";
    readonly header?: TemplateRef<unknown>;
    readonly body?: TemplateRef<unknown>;
  }>();
}

@Component({
  selector: "panel-tab",
  template: `
    <button
      type="button"
      [id]="props().buttonProps.id"
      [attr.aria-selected]="props().buttonProps['aria-selected']"
      (click)="props().buttonProps.onClick()"
      (keydown)="props().buttonProps.onKeyDown($event)"
    >
      {{ props().panel.label }}
    </button>
    <button type="button" (click)="bare()">bare</button>
  `,
})
class Tab {
  readonly props = input.required<{
    readonly panel: { readonly label?: string };
    readonly buttonProps: {
      readonly id: string;
      readonly "aria-selected": boolean;
      readonly onClick: () => void;
      readonly onKeyDown: (event: KeyboardEvent) => void;
    };
  }>();

  /** A key that never went through the DOM, so it has no current target. */
  bare(): void {
    this.props().buttonProps.onKeyDown(
      new KeyboardEvent("keydown", { key: "Home" })
    );
  }
}

@Component({
  selector: "panel-close",
  template: `
    <button
      type="button"
      [attr.aria-label]="props().label"
      (click)="props().onClose()"
    >
      ×
    </button>
  `,
})
class Close {
  readonly props = input.required<{
    readonly label: string;
    readonly onClose: () => void;
  }>();
}

const SLOTS: SidePanelSlots = { Frame: Frame, Tab: Tab, Close: Close };

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

@Component({
  imports: [AdaptSidePanelChrome],
  template: `
    <ng-template #notes>From a template</ng-template>
    <adapt-side-panel-chrome
      [panels]="panels()"
      [openPanel]="open()"
      [onOpenPanel]="choose"
      [onClose]="close"
      [side]="side()"
      [slots]="slots"
    />
  `,
})
class ChromeHost {
  readonly notes = viewChild<TemplateRef<unknown>>("notes");
  readonly open = signal("one");
  readonly side = input<"start" | "end" | undefined>();
  readonly mode = input<"tabs" | "single" | "template" | "empty" | "blank">(
    "tabs"
  );
  readonly picked = vi.fn();
  readonly close = vi.fn();
  readonly choose = (key: string): void => {
    this.picked(key);
    this.open.set(key);
  };
  readonly slots = SLOTS;

  readonly panels = computed((): readonly SidePanelPanel[] => {
    if (this.mode() === "empty") return [];
    if (this.mode() === "single") {
      return [{ key: "one", label: "One", content: "panel one" }];
    }
    if (this.mode() === "template") {
      return [{ key: "one", label: "Notes", content: this.notes() }];
    }
    if (this.mode() === "blank") return [{ key: "bare" }];
    return [
      { key: "one", label: "One", content: "panel one" },
      { key: "two", label: "Two", content: "panel two" },
    ];
  });
}

@Component({
  imports: [AdaptSidePanelLayout],
  template: `
    <ng-template #dock>Notes</ng-template>
    <adapt-side-panel-layout [panel]="docked()" [side]="side()">
      Amman
    </adapt-side-panel-layout>
  `,
})
class LayoutHost {
  readonly dock = viewChild<TemplateRef<unknown>>("dock");
  readonly show = input(true);
  readonly side = input<"start" | "end">("end");

  docked(): TemplateRef<unknown> | undefined {
    return this.show() ? this.dock() : undefined;
  }
}

async function mountChrome(
  mode: "tabs" | "single" | "template" | "empty" | "blank" = "tabs",
  open = "one"
): Promise<ReturnType<typeof TestBed.createComponent<ChromeHost>>> {
  const fixture = TestBed.createComponent(ChromeHost);
  fixture.componentRef.setInput("mode", mode);
  fixture.componentInstance.open.set(open);
  document.body.append(fixture.nativeElement);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function tab(label: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find((button) =>
    button.textContent?.includes(label)
  );
}

function press(button: HTMLElement, key: string): void {
  button.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}

describe("AdaptSidePanelChrome", () => {
  it("renders nothing when there is no panel", async () => {
    await mountChrome("empty");
    expect(part("side-panel-header")).toBeNull();
    expect(part("side-panel-body")).toBeNull();
  });

  it("shows the open panel, and a tab strip when there are several", async () => {
    const fixture = await mountChrome();
    const host = fixture.componentInstance;
    fixture.componentRef.setInput("side", "end");
    fixture.detectChanges();
    expect(part("side-panel")?.getAttribute("data-side")).toBe("end");
    expect(part("side-panel-header")).not.toBeNull();
    expect(part("side-panel-tabs")?.getAttribute("role")).toBe("tablist");
    expect(part("side-panel-body")?.getAttribute("role")).toBe("tabpanel");
    expect(part("side-panel-body")?.textContent).toContain("panel one");
    expect(part("side-panel-body")?.textContent).not.toContain("panel two");
    expect(tab("One")?.getAttribute("aria-selected")).toBe("true");
    expect(tab("Two")?.getAttribute("aria-selected")).toBe("false");

    tab("Two")?.click();
    expect(host.picked).toHaveBeenCalledWith("two");
    document
      .querySelector<HTMLButtonElement>("button[aria-label='Close panel']")
      ?.click();
    expect(host.close).toHaveBeenCalledOnce();
  });

  it("moves the selection with arrows, Home and End, and ignores other keys", async () => {
    const fixture = await mountChrome();
    const host = fixture.componentInstance;
    const one = tab("One");
    const two = tab("Two");
    expect(one).toBeTruthy();
    expect(two).toBeTruthy();

    press(one!, "ArrowRight");
    expect(host.picked).toHaveBeenCalledWith("two");
    expect(document.activeElement).toBe(two);
    fixture.detectChanges();

    press(two!, "ArrowLeft");
    expect(host.picked).toHaveBeenLastCalledWith("one");
    expect(document.activeElement).toBe(one);
    fixture.detectChanges();

    press(one!, "End");
    expect(host.picked).toHaveBeenLastCalledWith("two");
    fixture.detectChanges();
    press(two!, "Home");
    expect(host.picked).toHaveBeenLastCalledWith("one");
    fixture.detectChanges();

    press(one!, "ArrowDown");
    expect(host.picked).toHaveBeenLastCalledWith("two");
    fixture.detectChanges();
    press(two!, "ArrowUp");
    expect(host.picked).toHaveBeenLastCalledWith("one");

    host.picked.mockClear();
    press(one!, "Enter");
    expect(host.picked).not.toHaveBeenCalled();

    [...document.querySelectorAll("button")]
      .find((button) => button.textContent === "bare")
      ?.click();
    expect(host.picked).toHaveBeenCalledWith("one");
  });

  it("closes from Escape on a tab and inside the body", async () => {
    const fixture = await mountChrome();
    const host = fixture.componentInstance;
    press(tab("One")!, "Escape");
    expect(host.close).toHaveBeenCalledOnce();
    part("side-panel-body")?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    expect(host.close).toHaveBeenCalledTimes(2);
    part("side-panel-body")?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true })
    );
    expect(host.close).toHaveBeenCalledTimes(2);
  });

  it("uses the key when a panel has no label and no content", async () => {
    await mountChrome("blank");
    expect(part("side-panel-tabs")).toBeNull();
    expect(part("side-panel-body")?.getAttribute("aria-label")).toBe("bare");
    expect(part("side-panel-body")?.textContent?.trim()).toBe("");
  });

  it("names a single panel's body and skips the tab strip", async () => {
    await mountChrome("single");
    expect(part("side-panel-tabs")).toBeNull();
    expect(part("side-panel-body")?.getAttribute("role")).toBeNull();
    expect(part("side-panel-body")?.getAttribute("aria-label")).toBe("One");
    expect(part("side-panel-body")?.textContent).toContain("panel one");
  });

  it("projects a template into the body", async () => {
    await mountChrome("template");
    expect(part("side-panel-body")?.textContent).toContain("From a template");
  });
});

describe("AdaptSidePanelLayout", () => {
  it("docks a panel beside the body, and drops the row when there is none", async () => {
    const fixture = TestBed.createComponent(LayoutHost);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("table-region")?.style.flexDirection).toBe("row");
    expect(part("table-region-main")?.textContent).toContain("Amman");
    expect(part("table-region")?.textContent).toContain("Notes");

    fixture.componentRef.setInput("side", "start");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("table-region")?.style.flexDirection).toBe("row-reverse");

    fixture.componentRef.setInput("show", false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("table-region")).toBeNull();
    expect(fixture.nativeElement.textContent).toContain("Amman");
  });
});
