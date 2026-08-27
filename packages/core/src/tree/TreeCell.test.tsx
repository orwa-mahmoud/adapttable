/**
 * The tree column's cell.
 *
 * The indent has to move the CONTENT, not the chevron. Indenting a wrapper that
 * holds only the disclosure control leaves every name at the same margin, which
 * reads as a flat list with chevrons scattered through it — the bug this
 * component exists to make impossible.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { treeToggleTestSlots } from "../internal/chromeTestSlots";
import { TreeCellChrome } from "./TreeCell";
import type { TreeEntry } from "./treeRows";

interface Row {
  id: string;
}

const entry = (over: Partial<TreeEntry<Row>> = {}): TreeEntry<Row> => ({
  row: { id: "lib" },
  key: "lib",
  level: 1,
  hasChildren: true,
  expanded: false,
  path: ["src"],
  descendantIds: [],
  ...over,
});

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("TreeCell", () => {
  it("indents the cell's content, chevron and all", () => {
    render(
      <TreeCellChrome
        slots={treeToggleTestSlots}
        entry={entry()}
        columnKey="name"
        treeColumnKey="name"
      >
        <span>lib</span>
      </TreeCellChrome>
    );
    const cell = part("tree-cell")!;
    expect(cell.style.paddingInlineStart).toBe("1.5rem");
    // The name lives INSIDE the indented wrapper, so it moves with the depth.
    expect(cell).toHaveTextContent("lib");
    expect(part("tree-toggle")).not.toBeNull();
  });

  it("passes a column that is not the tree column straight through", () => {
    render(
      <TreeCellChrome
        slots={treeToggleTestSlots}
        entry={entry()}
        columnKey="size"
        treeColumnKey="name"
      >
        <span>2 KB</span>
      </TreeCellChrome>
    );
    expect(part("tree-cell")).toBeNull();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("passes a flat table's cell straight through", () => {
    render(
      <TreeCellChrome
        slots={treeToggleTestSlots}
        entry={undefined}
        columnKey="name"
        treeColumnKey="name"
      >
        <span>Ada</span>
      </TreeCellChrome>
    );
    expect(part("tree-cell")).toBeNull();
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("carries the class hooks the unstyled kit passes", () => {
    render(
      <TreeCellChrome
        slots={treeToggleTestSlots}
        entry={entry({ hasChildren: false })}
        columnKey="name"
        treeColumnKey="name"
        className="cn-cell"
        spacerClassName="cn-spacer"
      >
        <span>util.ts</span>
      </TreeCellChrome>
    );
    expect(part("tree-cell")).toHaveClass("cn-cell");
    expect(part("tree-spacer")).toHaveClass("cn-spacer");
  });

  it("reports a click to the handler, and takes the chevron's class", () => {
    const onToggle = vi.fn();
    render(
      <TreeCellChrome
        slots={treeToggleTestSlots}
        entry={entry({ level: 0 })}
        columnKey="name"
        treeColumnKey="name"
        onToggle={onToggle}
        toggleClassName="cn-toggle"
      >
        <span>src</span>
      </TreeCellChrome>
    );
    // A root sits at the margin: no indent to apply.
    expect(part("tree-cell")!.style.paddingInlineStart).toBe("");
    expect(part("tree-toggle")).toHaveClass("cn-toggle");
    fireEvent.click(part("tree-toggle")!);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith("lib");
  });

  it("survives a missing toggle handler", () => {
    // A host rendering the cell itself may not wire one; the chevron is still
    // drawn, it just does nothing.
    render(
      <TreeCellChrome
        slots={treeToggleTestSlots}
        entry={entry()}
        columnKey="name"
        treeColumnKey="name"
      >
        <span>lib</span>
      </TreeCellChrome>
    );
    fireEvent.click(part("tree-toggle")!);
    expect(part("tree-toggle")).toHaveAttribute("aria-expanded", "false");
  });
});
