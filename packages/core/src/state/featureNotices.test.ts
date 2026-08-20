/**
 * Notices for opted-in features that cannot run.
 *
 * These are the cases a host can turn on and a person at the table used
 * to only hear about in the console. The collector is what chrome and
 * the status bar both read, so the tests pin the kinds and appearances
 * rather than any kit's markup.
 */
import { describe, expect, it } from "vitest";

import { defaultLabels } from "../labels";
import { collectFeatureNotices } from "./featureNotices";

const BASE = {
  groupByKeys: [] as readonly string[],
  rowPinningRequested: false,
  rowReorderRequested: false,
  nestedArmed: false,
  hasEditableColumn: false,
  labels: defaultLabels,
};

describe("collectFeatureNotices", () => {
  it("is empty when nothing opted in is inert", () => {
    expect(collectFeatureNotices(BASE)).toEqual([]);
  });

  it("marks virtualize on a paged table as one-page", () => {
    const notices = collectFeatureNotices({
      ...BASE,
      virtualize: true,
      paginationMode: "paged",
    });
    expect(notices).toEqual([
      {
        kind: "virtualize-paged",
        appearance: "one-page",
        message: defaultLabels.noticeVirtualizePaged,
      },
    ]);
  });

  it("does not notice virtualize in infinite mode", () => {
    expect(
      collectFeatureNotices({
        ...BASE,
        virtualize: true,
        paginationMode: "infinite",
      })
    ).toEqual([]);
  });

  it("marks grouping without a full set as off", () => {
    const notices = collectFeatureNotices({
      ...BASE,
      groupByKeys: ["dept"],
    });
    expect(notices[0]).toMatchObject({
      kind: "grouping-unavailable",
      appearance: "off",
    });
  });

  it("does not notice grouping when the source can answer", () => {
    expect(
      collectFeatureNotices({
        ...BASE,
        groupByKeys: ["dept"],
        allFilteredRows: [{ id: "1" }],
      })
    ).toEqual([]);
    expect(
      collectFeatureNotices({
        ...BASE,
        groupByKeys: ["dept"],
        serverGroups: [{ key: "a" }],
      })
    ).toEqual([]);
  });

  it("marks pin and reorder as off while nested", () => {
    const notices = collectFeatureNotices({
      ...BASE,
      rowPinningRequested: true,
      rowReorderRequested: true,
      nestedArmed: true,
    });
    expect(notices.map((n) => n.kind)).toEqual([
      "pin-nested",
      "reorder-nested",
    ]);
    expect(notices.every((n) => n.appearance === "off")).toBe(true);
  });

  it("does not notice pin on a flat table", () => {
    expect(
      collectFeatureNotices({
        ...BASE,
        rowPinningRequested: true,
        nestedArmed: false,
      })
    ).toEqual([]);
  });

  it("marks export-all without a full set as one-page", () => {
    const notices = collectFeatureNotices({
      ...BASE,
      exportCsv: { scope: "all" },
    });
    expect(notices).toEqual([
      {
        kind: "export-all-page",
        appearance: "one-page",
        message: defaultLabels.noticeExportAllPage,
      },
    ]);
  });

  it("does not notice export-all when fetchAll or request can answer", () => {
    expect(
      collectFeatureNotices({
        ...BASE,
        exportCsv: { scope: "all", fetchAll: { fetchPage: async () => [] } },
      })
    ).toEqual([]);
    expect(
      collectFeatureNotices({
        ...BASE,
        exportCsv: { scope: "all", request: () => undefined },
      })
    ).toEqual([]);
    expect(
      collectFeatureNotices({
        ...BASE,
        exportCsv: { scope: "all" },
        allFilteredRows: [{ id: "1" }],
      })
    ).toEqual([]);
  });

  it("marks editable columns without onCellEdit as off", () => {
    const notices = collectFeatureNotices({
      ...BASE,
      hasEditableColumn: true,
    });
    expect(notices[0]).toMatchObject({
      kind: "edit-without-writer",
      appearance: "off",
    });
  });

  it("marks row and batch edit without their writers as off", () => {
    expect(
      collectFeatureNotices({
        ...BASE,
        rowEditing: true,
      })[0]?.kind
    ).toBe("edit-without-writer");
    expect(
      collectFeatureNotices({
        ...BASE,
        batchEditing: true,
      })[0]?.kind
    ).toBe("edit-without-writer");
  });

  it("does not notice editing when a writer is wired", () => {
    expect(
      collectFeatureNotices({
        ...BASE,
        hasEditableColumn: true,
        onCellEdit: () => undefined,
      })
    ).toEqual([]);
    expect(
      collectFeatureNotices({
        ...BASE,
        rowEditing: true,
        onRowEdit: () => undefined,
      })
    ).toEqual([]);
  });

  it("uses the host's own wording", () => {
    const notices = collectFeatureNotices({
      ...BASE,
      virtualize: true,
      paginationMode: "paged",
      labels: { noticeVirtualizePaged: "One page only" },
    });
    expect(notices[0]?.message).toBe("One page only");
  });
});
