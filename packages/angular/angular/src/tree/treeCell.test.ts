/**
 * The tree column's Chrome: the indent, the chevron's name and state, the
 * leaf spacer, and every other cell passed straight through.
 */
import type { TableLabels, TreeEntry } from "@adapttable/core";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptTreeCellChrome } from "./treeCell";
import type { TreeToggleButtonProps } from "./treeToggle";

@Component({
  selector: "test-tree-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button
    type="button"
    data-adapttable-part="tree-toggle"
    [class]="props().className ?? ''"
    [attr.aria-label]="props().label"
    [attr.aria-expanded]="props().expanded"
    [attr.aria-busy]="props().loading ? true : null"
    (click)="props().onClick()"
  ></button>`,
})
class TestButton {
  readonly props = input.required<TreeToggleButtonProps>();
}

const entryOf = (patch: Partial<TreeEntry<{ id: string }>> = {}) => ({
  row: { id: "a" },
  key: "a",
  level: 2,
  hasChildren: true,
  expanded: false,
  path: [],
  descendantIds: [],
  ...patch,
});

@Component({
  imports: [AdaptTreeCellChrome],
  template: `
    <adapt-tree-cell-chrome
      [entry]="entry()"
      [columnKey]="columnKey()"
      treeColumnKey="name"
      [labels]="labels()"
      [onToggle]="onToggle()"
      className="tree-cell"
      toggleClassName="tree-toggle"
      spacerClassName="tree-spacer"
      [slots]="slots"
      ><b>Ada</b></adapt-tree-cell-chrome
    >
  `,
})
class Host {
  readonly entry = signal<TreeEntry<{ id: string }> | undefined>(entryOf());
  readonly columnKey = signal("name");
  readonly labels = signal<TableLabels | undefined>(undefined);
  readonly onToggle = signal<((id: string) => void) | undefined>(vi.fn());
  readonly slots = { Button: TestButton };
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    host: fixture.componentInstance,
    settle: () => fixture.whenStable(),
  };
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

afterEach(() => {
  document.body.replaceChildren();
});

describe("AdaptTreeCellChrome", () => {
  it("indents the cell's content, chevron and all, and carries the class hooks", async () => {
    await mount();
    const cell = part("tree-cell")!;
    expect(cell.style.paddingInlineStart).toBe("3rem");
    expect(cell.className).toBe("tree-cell");
    expect(cell.querySelector("b")?.textContent).toBe("Ada");
    expect(part("tree-toggle")?.className).toBe("tree-toggle");
  });

  it("passes another column's cell, and a flat table's, straight through", async () => {
    const { host, settle } = await mount();
    host.columnKey.set("team");
    await settle();
    expect(part("tree-cell")).toBeNull();
    expect(document.querySelector("b")?.textContent).toBe("Ada");

    host.columnKey.set("name");
    host.entry.set(undefined);
    await settle();
    expect(part("tree-cell")).toBeNull();
    expect(document.querySelector("b")?.textContent).toBe("Ada");
  });

  it("names the action in both directions, localized when labels are given", async () => {
    const { host, settle } = await mount();
    const toggle = () => part("tree-toggle")!;
    expect(toggle().getAttribute("aria-label")).toBe("Expand row");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    host.entry.set(entryOf({ expanded: true }));
    await settle();
    expect(toggle().getAttribute("aria-label")).toBe("Collapse row");
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    host.labels.set({ collapseRow: "Réduire la ligne" });
    await settle();
    expect(toggle().getAttribute("aria-label")).toBe("Réduire la ligne");
  });

  it("holds a leaf's place instead of drawing a chevron", async () => {
    const { host, settle } = await mount();
    host.entry.set(entryOf({ hasChildren: false }));
    await settle();
    expect(part("tree-toggle")).toBeNull();
    const spacer = part("tree-spacer")!;
    expect(spacer.getAttribute("aria-hidden")).toBe("true");
    expect(spacer.style.width).toBe("1.5em");
    expect(spacer.className).toBe("tree-spacer");
  });

  it("flags a node whose children are being fetched", async () => {
    const { host, settle } = await mount();
    host.entry.set(entryOf({ loading: true }));
    await settle();
    expect(part("tree-toggle")?.getAttribute("aria-busy")).toBe("true");
  });

  it("reports the node it belongs to when clicked, and survives a missing handler", async () => {
    const { host, settle } = await mount();
    const onToggle = vi.fn();
    host.onToggle.set(onToggle);
    await settle();
    part("tree-toggle")!.click();
    expect(onToggle).toHaveBeenCalledWith("a");

    host.onToggle.set(undefined);
    await settle();
    expect(() => {
      part("tree-toggle")!.click();
    }).not.toThrow();
  });
});
