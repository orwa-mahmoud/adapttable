import type { SavedViewsPanelChromeProps } from "@adapttable/core/adapter";
import type { DataTableClassNames, SavedView } from "@adapttable/unstyled";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { shadcnClassNames } from "./classNames";
import { SavedViewsPanel, type SavedViewsPanelProps } from "./SavedViewsPanel";

/**
 * What the panel accepted before it named its own props: core's chrome props
 * without the slots, plus the class map.
 *
 * Imported here and nowhere in the shipped source. A public signature naming
 * this type obliges the entry point to export it, and exporting it publishes
 * the slot family behind it — the reason the panel spells its own shape. The
 * two assignments below are what hold that spelling to this one, so a field
 * cannot be dropped, renamed, or made required without failing `typecheck`.
 */
type ChromeShape = Readonly<
  Omit<SavedViewsPanelChromeProps, "slots"> & {
    readonly classNames?: DataTableClassNames;
  }
>;

/** Nothing removed and nothing narrowed: every old caller still compiles. */
const acceptsEverythingItUsedTo: (
  props: ChromeShape
) => SavedViewsPanelProps = (props) => props;

/** Nothing added and nothing widened: the panel asks for no more than before. */
const asksForNothingNew: (props: SavedViewsPanelProps) => ChromeShape = (
  props
) => props;

/**
 * Every field the panel names, written out.
 *
 * Assignability alone would not catch a dropped one: a props type missing
 * `footer` is still assignable to a shape that has it, and still accepts a
 * value that has it, because structural assignment tolerates extra
 * properties. The key sets have to be compared. The annotation makes the
 * compiler demand a line per field, the object literal makes it reject one
 * that is not a field, and the test below compares the two sets for real.
 */
const FIELDS: Record<keyof SavedViewsPanelProps, true> = {
  views: true,
  onApply: true,
  onRename: true,
  onMove: true,
  onSetDefault: true,
  onRemove: true,
  labels: true,
  footer: true,
  className: true,
  classNames: true,
};

const VIEWS: readonly SavedView[] = [
  { name: "Open items", search: "?status=open" },
];

/** The panel never owns the data: every operation is the host's. */
const noop = () => undefined;
const handlers = {
  onApply: noop,
  onRename: noop,
  onMove: noop,
  onSetDefault: noop,
  onRemove: noop,
} satisfies Pick<
  SavedViewsPanelProps,
  "onApply" | "onRename" | "onMove" | "onSetDefault" | "onRemove"
>;

describe("SavedViewsPanelProps", () => {
  it("accepts exactly what the derived shape did", () => {
    expect(acceptsEverythingItUsedTo).toBeTypeOf("function");
    expect(asksForNothingNew).toBeTypeOf("function");
  });

  it("spells every field the derived shape had, and no others", () => {
    // Assigning one to the other is what makes the compiler require a key
    // for every field of the derived shape; comparing them is what makes the
    // failure legible when a field goes missing.
    const derivedFields: Record<keyof ChromeShape, true> = FIELDS;
    const byName = (a: string, b: string) => a.localeCompare(b);
    expect(Object.keys(FIELDS).sort(byName)).toEqual(
      Object.keys(derivedFields).sort(byName)
    );
    expect(Object.keys(FIELDS)).toHaveLength(10);
  });
});

describe("SavedViewsPanel", () => {
  it("renders the views with the shadcn preset applied", () => {
    render(<SavedViewsPanel views={VIEWS} {...handlers} />);

    const apply = screen.getByRole("button", { name: /open items/i });
    expect(apply).toBeInTheDocument();
    expect(apply).toHaveClass(...shadcnClassNames.viewsItem.split(" "));
  });

  it("merges your class map over the preset, key by key", () => {
    render(
      <SavedViewsPanel
        views={VIEWS}
        {...handlers}
        classNames={{ viewsItem: "mine-only" }}
      />
    );

    const apply = screen.getByRole("button", { name: /open items/i });
    // The overridden key is yours outright…
    expect(apply).toHaveClass("mine-only");
    expect(apply).not.toHaveClass(...shadcnClassNames.viewsItem.split(" "));
    // …and every key you did not name still comes from the preset.
    expect(screen.getByRole("button", { name: /delete/i })).toHaveClass(
      ...shadcnClassNames.viewsDelete.split(" ")
    );
  });
});
