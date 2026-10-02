/**
 * The context menu chrome: the anchor, and closing before an entry runs.
 */
import type { ContextMenuItem, ContextMenuPoint } from "@adapttable/core";
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import {
  AdaptContextMenuChrome,
  type ContextMenuSlots,
} from "./contextMenuChrome";

@Component({
  selector: "menu-surface",
  template: `
    <div
      role="menu"
      data-adapttable-part="context-menu"
      [attr.aria-label]="props().label"
      [class]="props().className"
    >
      @for (row of props().rows; track row.item.key) {
        <button type="button" (click)="row.onSelect()">
          {{ row.item.label }}
        </button>
      }
    </div>
  `,
})
class MenuSurface {
  readonly props = input.required<{
    readonly label: string;
    readonly className?: string;
    readonly rows: readonly {
      readonly item: { readonly key: string; readonly label: string };
      readonly onSelect: () => void;
    }[];
  }>();
}

@Component({ selector: "menu-item", template: "" })
class MenuItem {
  readonly props = input.required<object>();
}

@Component({ selector: "menu-separator", template: "" })
class MenuSeparator {
  readonly props = input.required<object>();
}

const SLOTS: ContextMenuSlots = {
  Surface: MenuSurface,
  Item: MenuItem,
  Separator: MenuSeparator,
};

@Component({
  imports: [AdaptContextMenuChrome],
  template: `
    <adapt-context-menu-chrome
      [items]="items()"
      [at]="at()"
      [onClose]="close"
      [labels]="labels()"
      [className]="className()"
      [slots]="slots"
    />
  `,
})
class ChromeHost {
  readonly selected = vi.fn();
  readonly order: string[] = [];
  readonly items = signal<readonly ContextMenuItem[]>([
    {
      key: "greet",
      label: "Greet",
      onSelect: () => {
        this.order.push("select");
        this.selected();
      },
    },
  ]);
  readonly at = signal<ContextMenuPoint | null>({ x: 12, y: 24 });
  readonly labels = signal<{ contextMenu?: string } | undefined>(undefined);
  readonly className = signal<string | undefined>(undefined);
  readonly slots = SLOTS;
  readonly close = (): void => {
    this.order.push("close");
    this.at.set(null);
  };
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("AdaptContextMenuChrome", () => {
  it("draws nothing while it is closed or empty", () => {
    const fixture = TestBed.createComponent(ChromeHost);
    document.body.append(fixture.nativeElement);
    fixture.componentInstance.at.set(null);
    fixture.detectChanges();
    expect(part("context-menu-anchor")).toBeNull();
    fixture.componentInstance.at.set({ x: 1, y: 2 });
    fixture.componentInstance.items.set([]);
    fixture.detectChanges();
    expect(part("context-menu-anchor")).toBeNull();
    fixture.destroy();
  });

  it("anchors the menu and closes before the entry runs", () => {
    const fixture = TestBed.createComponent(ChromeHost);
    document.body.append(fixture.nativeElement);
    const host = fixture.componentInstance;
    host.className.set("mine");
    host.labels.set({ contextMenu: "Row actions" });
    fixture.detectChanges();
    const anchor = part("context-menu-anchor");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("aria-hidden")).toBe("true");
    expect(part("context-menu")?.getAttribute("aria-label")).toBe(
      "Row actions"
    );
    expect(part("context-menu")?.className).toContain("mine");
    const button = fixture.nativeElement.querySelector(
      "button"
    ) as HTMLButtonElement;
    button.click();
    expect(host.order).toEqual(["close", "select"]);
    expect(host.selected).toHaveBeenCalledOnce();
    fixture.detectChanges();
    expect(part("context-menu-anchor")).toBeNull();
    fixture.destroy();
  });

  it("falls back to the English menu name", () => {
    const fixture = TestBed.createComponent(ChromeHost);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    expect(part("context-menu")?.getAttribute("aria-label")).toBe(
      "Table actions"
    );
    fixture.destroy();
  });
});
