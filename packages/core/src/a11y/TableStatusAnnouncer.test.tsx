/**
 * The region and the hook that feeds it, in a real render.
 *
 * The resolver's wording is covered by its own tests; what only a render can
 * show is the part that is easy to get wrong and invisible when it is: the
 * region is in the DOM from the first paint, it starts empty, and it does not
 * claim a second `role="status"` on a table that already has one.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultLabels } from "../labels";
import { TableStatusAnnouncer } from "./TableStatusAnnouncer";
import { useTableStatusAnnouncement } from "./useTableStatusAnnouncement";

function Harness({ total, page }: { total: number; page: number }) {
  const announcement = useTableStatusAnnouncement({
    labels: defaultLabels,
    total,
    shown: 25,
    page,
    limit: 25,
    paged: true,
  });
  return <TableStatusAnnouncer announcement={announcement} />;
}

const region = () =>
  document.querySelector('[data-adapttable-part="table-status-announcer"]');

describe("<TableStatusAnnouncer>", () => {
  it("is present and silent from the first paint", () => {
    render(<Harness total={100} page={1} />);

    expect(region()).toBeInTheDocument();
    expect(region()).toHaveTextContent("");
  });

  it("announces politely and atomically", () => {
    render(<Harness total={100} page={1} />);

    expect(region()).toHaveAttribute("aria-live", "polite");
    expect(region()).toHaveAttribute("aria-atomic", "true");
  });

  it("leaves the status role to whatever else is on screen", () => {
    render(<Harness total={100} page={1} />);

    // The empty state, the export announcer and the reorder announcer each take
    // that role while they are on screen; this region is on every table, so a
    // permanent second one would make "the table's status" ambiguous.
    expect(region()).not.toHaveAttribute("role");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("speaks once the page moves under it", () => {
    const view = render(<Harness total={100} page={1} />);
    expect(region()).toHaveTextContent("");

    view.rerender(<Harness total={100} page={3} />);

    expect(region()).toHaveTextContent("Page 3 of 4. Showing 51–75 of 100");
  });
});
