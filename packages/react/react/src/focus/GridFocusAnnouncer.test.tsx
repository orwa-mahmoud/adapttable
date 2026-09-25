/**
 * The live region that says where keyboard focus went.
 *
 * Adapters spread it unconditionally, so the opt-in promise rests here: with
 * cell navigation off it must render nothing at all, and with it on the region
 * must exist from the first render — a live region created at the same moment as
 * its first message is not announced.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GridFocusAnnouncer } from "./GridFocusAnnouncer";
import type { GridFocusState } from "./useGridFocus";

const state = (over: Partial<GridFocusState>): GridFocusState =>
  ({
    enabled: false,
    announcement: "",
    ...over,
  }) as GridFocusState;

describe("GridFocusAnnouncer", () => {
  it("renders nothing when cell navigation is off", () => {
    const { container } = render(
      <GridFocusAnnouncer focus={state({ enabled: false })} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("is present and empty before focus moves", () => {
    render(<GridFocusAnnouncer focus={state({ enabled: true })} />);
    const region = document.querySelector(
      '[data-adapttable-part="grid-announcer"]'
    );
    expect(region).not.toBeNull();
    expect(region).toHaveTextContent("");
  });

  it("carries the announcement the focus state produced", () => {
    render(
      <GridFocusAnnouncer
        focus={state({
          enabled: true,
          announcement: "Budget, 1,240, row 40,002 of 100,000",
        })}
      />
    );
    expect(
      document.querySelector('[data-adapttable-part="grid-announcer"]')
    ).toHaveTextContent("Budget, 1,240, row 40,002 of 100,000");
  });
});
