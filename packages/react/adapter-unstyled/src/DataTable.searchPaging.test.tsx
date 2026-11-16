/**
 * Search runs over every row before the table pages the matches: a word that
 * only appears on page 5 is found from page 1 or page 3, the matches start at
 * page 1, and clearing the search returns to page 1 of every row — through the
 * table's own data, a frontend source, URL sync on or off, and infinite paging.
 */
import { useFrontendData } from "@adapttable/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";

interface Row {
  id: string;
  name: string;
  n: number;
}

const ROWS: Row[] = Array.from({ length: 50 }, (_, index) => ({
  id: String(index + 1),
  name: index === 44 ? "Zephyrine" : `Person ${String(index + 1)}`,
  n: index + 1,
}));
const COLS = [
  { key: "name", header: "Name" },
  { key: "n", header: "N" },
];
const rowKey = (row: Row) => row.id;

const names = () =>
  [...document.querySelectorAll('[data-adapttable-part="row"]')].map(
    (row) => row.querySelector('[data-adapttable-part="cell"]')?.textContent
  );

const nextPage = () => {
  const next = screen
    .getAllByRole("button")
    .find((button) =>
      /next/i.test(
        button.getAttribute("aria-label") ?? button.textContent ?? ""
      )
    );
  if (!next) throw new Error("the pager has no next-page button");
  fireEvent.click(next);
};

function search(value: string): void {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value } });
  act(() => {
    vi.advanceTimersByTime(1000);
  });
}

function FrontendHost({
  paginationMode,
  forceMobile,
}: Readonly<{
  paginationMode?: "paged" | "infinite" | "auto";
  forceMobile?: boolean;
}>) {
  const source = useFrontendData({
    data: ROWS,
    columns: COLS,
    defaults: { limit: 10 },
    paginationMode,
    forceMobile,
  });
  return (
    <DataTable
      source={source}
      columns={COLS}
      rowKey={rowKey}
      forceMobile={forceMobile}
      renderCard={(row: Row) => <div>{row.name}</div>}
    />
  );
}

describe("search across pages", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  for (const urlSync of [false, true]) {
    it(`finds a word on page 5 from page 3, then clears to page 1 (urlSync ${String(urlSync)})`, () => {
      render(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={rowKey}
          urlSync={urlSync}
          defaults={{ limit: 10 }}
        />
      );
      search("Zephyr");
      expect(names()).toEqual(["Zephyrine"]);
      search("");
      nextPage();
      nextPage();
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(names()[0]).toBe("Person 21");
      search("Zephyr");
      expect(names()).toEqual(["Zephyrine"]);
      search("");
      expect(names()[0]).toBe("Person 1");
      expect(names()).toHaveLength(10);
    });
  }

  it("finds it through a frontend source from page 3, then clears to page 1", () => {
    render(<FrontendHost />);
    nextPage();
    nextPage();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(names()[0]).toBe("Person 21");
    search("Zephyr");
    expect(names()).toEqual(["Zephyrine"]);
    search("");
    expect(names()[0]).toBe("Person 1");
  });

  for (const paginationMode of ["infinite", "auto"] as const) {
    for (const forceMobile of [false, true]) {
      it(`finds it with ${paginationMode} paging${forceMobile ? " on a phone" : ""}`, () => {
        render(
          <FrontendHost
            paginationMode={paginationMode}
            forceMobile={forceMobile}
          />
        );
        search("Zephyr");
        expect(document.body.textContent).toContain("Zephyrine");
        expect(
          document.querySelector('[data-adapttable-part="empty"]')
        ).toBeNull();
      });
    }
  }
});
