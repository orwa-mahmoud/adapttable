/**
 * The chevron in front of a tree row.
 *
 * One shape rendered nine times, so what matters here is what every kit
 * inherits from it: the accessible name in both states, the footprint a leaf
 * keeps so a column stays aligned, and the loading flag a lazy node carries.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { treeToggleTestSlots } from "../internal/chromeTestSlots";
import type { TreeEntry } from "@adapttable/core";
import { TreeToggleChrome } from "./TreeToggle";

interface Row {
  id: string;
}

const entry = (over: Partial<TreeEntry<Row>> = {}): TreeEntry<Row> => ({
  row: { id: "src" },
  key: "src",
  level: 0,
  hasChildren: true,
  expanded: false,
  path: [],
  descendantIds: [],
  ...over,
});

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("TreeToggle", () => {
  it("names the action for a screen reader, in both directions", () => {
    const { rerender } = render(
      <TreeToggleChrome
        slots={treeToggleTestSlots}
        entry={entry()}
        onToggle={() => undefined}
      />
    );
    expect(part("tree-toggle")).toHaveAttribute("aria-label", "Expand row");
    expect(part("tree-toggle")).toHaveAttribute("aria-expanded", "false");

    rerender(
      <TreeToggleChrome
        slots={treeToggleTestSlots}
        entry={entry({ expanded: true })}
        onToggle={() => undefined}
      />
    );
    expect(part("tree-toggle")).toHaveAttribute("aria-label", "Collapse row");
    expect(part("tree-toggle")).toHaveAttribute("aria-expanded", "true");
  });

  it("takes the localized name when one is given", () => {
    render(
      <TreeToggleChrome
        slots={treeToggleTestSlots}
        entry={entry()}
        labels={{ expandRow: "افتح الصف" }}
        onToggle={() => undefined}
      />
    );
    expect(part("tree-toggle")).toHaveAttribute("aria-label", "افتح الصف");
  });

  it("holds a leaf's place instead of drawing a chevron", () => {
    // Without the spacer a folder's children would line up under its chevron
    // rather than under its name.
    render(
      <TreeToggleChrome
        slots={treeToggleTestSlots}
        entry={entry({ hasChildren: false })}
        onToggle={() => undefined}
      />
    );
    expect(part("tree-toggle")).toBeNull();
    expect(part("tree-spacer")).toHaveAttribute("aria-hidden", "true");
  });

  it("flags a node whose children are being fetched", () => {
    render(
      <TreeToggleChrome
        slots={treeToggleTestSlots}
        entry={entry({ loading: true })}
        onToggle={() => undefined}
      />
    );
    expect(part("tree-toggle")).toHaveAttribute("data-loading");
  });

  it("reports the node it belongs to when clicked", () => {
    const onToggle = vi.fn();
    render(
      <TreeToggleChrome
        slots={treeToggleTestSlots}
        entry={entry()}
        onToggle={onToggle}
      />
    );
    fireEvent.click(part("tree-toggle")!);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith("src");
  });
});
