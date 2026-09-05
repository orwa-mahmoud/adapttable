/**
 * The offer at the end of a page of groups, or of a group's rows.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { groupMoreTestSlots } from "../internal/chromeTestSlots";
import { resolveLabels } from "@adapttable/core";
import { GroupMoreButtonChrome } from "./GroupMoreButton";

const LABELS = resolveLabels(undefined);

describe("GroupMoreButton", () => {
  it("says how many groups are left, and asks for them", () => {
    const onShowMore = vi.fn();
    render(
      <GroupMoreButtonChrome
        slots={groupMoreTestSlots}
        scope="groups"
        remaining={42}
        labels={LABELS}
        onShowMore={onShowMore}
      />
    );
    fireEvent.click(screen.getByText("Show 42 more groups"));
    expect(onShowMore).toHaveBeenCalledExactlyOnceWith({
      scope: "groups",
      groupKey: undefined,
    });
  });

  it("names the group whose rows it would reveal", () => {
    const onShowMore = vi.fn();
    render(
      <GroupMoreButtonChrome
        slots={groupMoreTestSlots}
        scope="rows"
        remaining={8}
        groupKey="group:team:s:Core"
        labels={LABELS}
        onShowMore={onShowMore}
      />
    );
    fireEvent.click(screen.getByText("Show 8 more in this group"));
    expect(onShowMore).toHaveBeenCalledExactlyOnceWith({
      scope: "rows",
      groupKey: "group:team:s:Core",
    });
  });

  it("takes its wording from the labels", () => {
    render(
      <GroupMoreButtonChrome
        slots={groupMoreTestSlots}
        scope="groups"
        remaining={3}
        labels={{ ...LABELS, moreGroups: (n) => `+${n}` }}
        onShowMore={() => undefined}
      />
    );
    expect(screen.getByText("+3")).toBeInTheDocument();
  });
});
