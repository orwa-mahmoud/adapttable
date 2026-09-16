/**
 * The class map reaches slots that live at module scope.
 *
 * The palette, context menu, side panel and status bar define their slots
 * outside their parents, so React keeps one component type across renders
 * instead of remounting the subtree. Context is how those slots still see
 * `classNames`, and it can fail two ways that a single-table test would never
 * show: the map reaching nothing at all, or — the failure a module-level
 * binding would have produced — every table on the page reading whichever map
 * rendered last.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ClassNamesProvider,
  useClassNames,
} from "./components/classNamesContext";
import { DataTable } from "./data-table.test-utils";
import type { ColumnDef, DataTableClassNames } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

const PANEL = {
  // Two, because a one-panel dock renders no tab strip to dress.
  panels: [
    { key: "one", label: "One", content: <p>panel one</p> },
    { key: "two", label: "Two", content: <p>panel two</p> },
  ],
  open: "one",
  onOpenChange: vi.fn(),
};

function table(classNames: DataTableClassNames, urlKey: string) {
  return (
    <DataTable
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      urlKey={urlKey}
      classNames={classNames}
      commandPalette
      onPrint={vi.fn()}
      statusBar
      sidePanel={PANEL}
    />
  );
}

const classesOf = (part: string) =>
  [...document.querySelectorAll(`[data-adapttable-part="${part}"]`)].map(
    (element) => element.className
  );

describe("classNames reach module-scope slots (unstyled)", () => {
  it("reads an empty map with no provider and with no map", () => {
    function Probe() {
      const { statusItem } = useClassNames();
      return <span data-probe={statusItem ?? "none"} />;
    }
    render(
      <>
        <Probe />
        <ClassNamesProvider>
          <Probe />
        </ClassNamesProvider>
      </>
    );

    expect(
      [...document.querySelectorAll("[data-probe]")].map((el) =>
        el.getAttribute("data-probe")
      )
    ).toEqual(["none", "none"]);
  });

  it("gives each table on the page its own map", () => {
    render(
      <>
        {table(
          {
            statusItem: "left-item",
            sidePanelTab: "left-tab",
            sidePanelClose: "left-close",
          },
          "l"
        )}
        {table(
          {
            statusItem: "right-item",
            sidePanelTab: "right-tab",
            sidePanelClose: "right-close",
          },
          "r"
        )}
      </>
    );

    expect(new Set(classesOf("status-item"))).toEqual(
      new Set(["left-item", "right-item"])
    );
    expect(classesOf("side-panel-close")).toEqual([
      "left-close",
      "right-close",
    ]);
    expect(
      [...document.querySelectorAll('[role="tab"]')].map((el) => el.className)
    ).toEqual(["left-tab", "left-tab", "right-tab", "right-tab"]);
  });

  it("dresses the palette's input, rows and empty state", () => {
    render(
      table(
        {
          commandInput: "palette-input",
          commandItem: "palette-item",
          commandEmpty: "palette-empty",
        },
        "p"
      )
    );
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(classesOf("command-input")).toEqual(["palette-input"]);
    expect(classesOf("command-item").every((c) => c === "palette-item")).toBe(
      true
    );

    fireEvent.change(
      document.querySelector('[data-adapttable-part="command-input"]')!,
      { target: { value: "nothing matches this" } }
    );

    expect(classesOf("command-empty")).toEqual(["palette-empty"]);
  });

  it("keeps the search box mounted while it is typed into", () => {
    render(table({ commandInput: "palette-input" }, "k"));
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = document.querySelector<HTMLInputElement>(
      '[data-adapttable-part="command-input"]'
    );

    fireEvent.change(input!, { target: { value: "pr" } });

    // The same element, not a replacement: a slot redefined per render would
    // remount here, and the caret would go with it.
    expect(
      document.querySelector('[data-adapttable-part="command-input"]')
    ).toBe(input);
    expect(input!.value).toBe("pr");
    expect(document.activeElement).toBe(input);
  });
});
