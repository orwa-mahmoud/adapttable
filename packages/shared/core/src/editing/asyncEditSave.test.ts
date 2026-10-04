import { describe, expect, it } from "vitest";

import { createBatchEditStore } from "./batchEditing";
import { createRowEditStore } from "./rowEditing";
interface Row {
  id: string;
  name: string;
}
const row: Row = { id: "1", name: "before" };
const columns = [{ key: "name", editable: true }] as const;
describe("row and batch async host-save draft retention", () => {
  it("retains a row draft until the host promise succeeds", () => {
    const store = createRowEditStore<Row>({
      enabled: true,
      columns,
      onRowEdit: () => new Promise<void>(() => undefined),
    });
    store.begin(row, row.id);
    store.setDraft("name", "after");
    store.save();
    expect(store.getSnapshot().activeRowId).toBe(row.id);
    expect(store.getSnapshot().drafts.name).toBe("after");
  });
  it("retains a batch draft until the host promise succeeds", () => {
    const store = createBatchEditStore<Row>({
      enabled: true,
      columns,
      onBatchEdit: () => new Promise<void>(() => undefined),
    });
    store.setDraft(row, row.id, "name", "after");
    store.saveAll();
    expect(store.getSnapshot().entries).toHaveLength(1);
    expect(store.getSnapshot().entries[0]?.drafts.name).toBe("after");
  });
});
