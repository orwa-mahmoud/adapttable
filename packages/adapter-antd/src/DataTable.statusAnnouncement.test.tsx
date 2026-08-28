/**
 * The table has to say what changed when the rows underneath it change.
 *
 * Core composes the sentence and one shared region speaks it, so what can break
 * per adapter is the wiring: an adapter that forgets to render the region is
 * silent, and nothing else in its suite would notice.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { renderAntd } from "./test-utils";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Bo" },
  { id: "3", name: "Cy" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
];

const status = () =>
  document.querySelector('[data-adapttable-part="table-status-announcer"]');

function mount(search = "limit=2") {
  return renderAntd(
    <DataTable
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlAdapter={createMemoryAdapter(search)}
      forceMobile={false}
    />
  );
}

describe("table status announcements (antd)", () => {
  it("has a live region in the DOM before it has anything to say", () => {
    mount();

    // A region that appears with its text is frequently missed entirely, so it
    // must be present and empty from the first paint.
    expect(status()).toBeInTheDocument();
    expect(status()).toHaveTextContent("");
    expect(status()).toHaveAttribute("aria-live", "polite");
    expect(status()).toHaveAttribute("aria-atomic", "true");
  });

  it("announces the new position when the user pages", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      expect(status()).toHaveTextContent("Page 2 of 2");
    });
    // The count is the same wording the footer shows, not a bare number.
    expect(status()).toHaveTextContent("Showing 3–3 of 3");
  });
});
