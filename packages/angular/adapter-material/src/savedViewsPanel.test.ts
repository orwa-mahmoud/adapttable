/**
 * The native saved-views panel: the parts, and the actions each row offers.
 */
import type { SavedView, TableLabels } from "@adapttable/core";
import { Component, signal, type TemplateRef, viewChild } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { kitSelector } from "../testUtils";
import { AdaptSavedViewsPanel } from "./components/savedViewsPanel";

const VIEWS: readonly SavedView[] = [
  { name: "Mine", search: "t.q=a" },
  { name: "Team", search: "t.q=b", isDefault: true },
  { name: "Shared", search: "t.q=c", readOnly: true },
];

@Component({
  imports: [AdaptSavedViewsPanel],
  template: `
    <ng-template #note>Kept from last year.</ng-template>
    <adapt-saved-views-panel
      [views]="views()"
      [onApply]="onApply"
      [onRename]="onRename"
      [onMove]="onMove"
      [onSetDefault]="onSetDefault"
      [onRemove]="onRemove"
      [labels]="labels()"
      [footer]="footer()"
      [className]="className()"
    />
  `,
})
class Host {
  readonly views = signal<readonly SavedView[]>(VIEWS);
  readonly labels = signal<Partial<TableLabels> | undefined>(undefined);
  readonly footer = signal<TemplateRef<unknown> | string | undefined>(
    "Upgraded on load."
  );
  readonly className = signal<string | undefined>("views");
  readonly onApply = vi.fn<(name: string) => void>();
  readonly onRename = vi.fn<(from: string, to: string) => void>();
  readonly onMove = vi.fn<(name: string, delta: number) => void>();
  readonly onSetDefault = vi.fn<(name: string) => void>();
  readonly onRemove = vi.fn<(name: string) => void>();
  private readonly note = viewChild.required<TemplateRef<unknown>>("note");

  useNote(): void {
    this.footer.set(this.note());
  }
}

function mount(): {
  host: Host;
  root: HTMLElement;
  detect: () => void;
} {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return {
    host: fixture.componentInstance,
    root: fixture.nativeElement as HTMLElement,
    detect: () => {
      fixture.detectChanges();
    },
  };
}

function part(root: ParentNode, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(kitSelector(name));
}

function controls(root: ParentNode, key: string): HTMLButtonElement[] {
  return [
    ...root.querySelectorAll<HTMLButtonElement>(`[data-control="${key}"]`),
  ];
}

describe("AdaptSavedViewsPanel", () => {
  it("draws the card, the rows and every part", () => {
    const { root, host } = mount();
    expect(part(root, "saved-views-panel")?.className).toContain("views");
    expect(part(root, "saved-views-title")?.textContent).toBe("Saved views");
    expect(part(root, "saved-views-footer")?.textContent).toContain(
      "Upgraded on load."
    );
    const rows = root.querySelectorAll(
      "[data-adapttable-part='saved-view-row']"
    );
    expect(rows).toHaveLength(3);
    expect(part(rows[0] ?? root, "saved-view-caption")?.textContent).toContain(
      "Mine"
    );
    expect(part(rows[1] ?? root, "saved-view-default")?.textContent).toBe(
      "Default"
    );
    expect(part(rows[2] ?? root, "saved-view-readonly")?.textContent).toBe(
      "Read-only"
    );
    expect(part(rows[0] ?? root, "saved-view-controls")).toBeTruthy();
    const mine = rows[0];
    if (!mine) throw new Error("row");
    expect(
      [...mine.querySelectorAll("[data-control]")].map((node) =>
        node.getAttribute("data-control")
      )
    ).toEqual(["rename", "moveUp", "moveDown", "default", "remove"]);
    const name = mine.querySelector("button");
    expect(name?.getAttribute("title")).toBe("Apply view");
    expect(name?.style.fontWeight).toBe("400");
    const teamName = rows[1]?.querySelector("button");
    expect(teamName?.style.fontWeight).toBe("600");
    name?.click();
    expect(host.onApply).toHaveBeenCalledWith("Mine");
    expect(controls(root, "moveUp")[0]?.disabled).toBe(true);
    expect(controls(root, "moveDown")[2]?.disabled).toBe(true);
    controls(root, "moveDown")[0]?.click();
    expect(host.onMove).toHaveBeenCalledWith("Mine", 1);
    controls(root, "default")[0]?.click();
    expect(host.onSetDefault).toHaveBeenCalledWith("Mine");
    expect(controls(root, "default")[1]?.getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(controls(root, "default")[0]?.getAttribute("aria-pressed")).toBe(
      "false"
    );
    const shared = rows[2];
    const locked = [...(shared?.querySelectorAll("button") ?? [])].filter(
      (button) => button.getAttribute("data-control") !== null
    );
    expect(locked.every((button) => button.disabled)).toBe(true);
    controls(root, "remove")[0]?.click();
    expect(host.onRemove).toHaveBeenCalledWith("Mine");
    const svg = mine.querySelector("svg");
    expect(svg?.getAttribute("fill")).toBe("none");
    expect(
      rows[1]
        ?.querySelector("[data-control='default'] svg")
        ?.getAttribute("fill")
    ).toBe("currentColor");
  });

  it("renames on Enter, focuses the field, and abandons the draft on Escape", () => {
    const { root, host, detect } = mount();
    controls(root, "rename")[0]?.click();
    detect();
    const box = root.querySelector("input");
    expect(box?.value).toBe("Mine");
    expect(document.activeElement).toBe(box);
    if (!box) throw new Error("rename field");
    box.value = "New";
    box.dispatchEvent(new Event("input"));
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    detect();
    expect(host.onRename).toHaveBeenCalledWith("Mine", "New");
    expect(root.querySelector("input")).toBeNull();

    controls(root, "rename")[0]?.click();
    detect();
    const again = root.querySelector("input");
    if (!again) throw new Error("rename field");
    again.value = "Nope";
    again.dispatchEvent(new Event("input"));
    again.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    detect();
    expect(host.onRename).toHaveBeenCalledTimes(1);
    expect(root.textContent).toContain("Mine");
  });

  it("shows the empty message, a template footer, and a custom title", () => {
    const { root, host, detect } = mount();
    host.views.set([]);
    host.labels.set({ savedViews: "Library" });
    host.footer.set(undefined);
    detect();
    expect(part(root, "saved-view-row")).toBeNull();
    expect(part(root, "saved-views-footer")).toBeNull();
    expect(root.textContent?.match(/Library/g)?.length).toBeGreaterThan(1);

    host.useNote();
    detect();
    expect(part(root, "saved-views-footer")?.textContent).toContain(
      "Kept from last year."
    );
  });
});
