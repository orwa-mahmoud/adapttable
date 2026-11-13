import { expect, it, vi } from "vitest";
import { h } from "vue";

import { DataTable } from "../src";
import { exportPdf } from "../src/export-pdf";
import { exportXlsx } from "../src/export-xlsx";
import { mount, tick } from "./editing-helpers";

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Grace" },
];
const base = {
  data: rows,
  columns: [{ key: "name" }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
  forceMobile: false,
};

it.each([
  { format: "PDF", factory: exportPdf },
  { format: "XLSX", factory: exportXlsx },
])(
  "draws the $format export with the kit's button and hands the rows to the host",
  async ({ format, factory }) => {
    const request = vi.fn(() => Promise.resolve());
    const { host } = mount(() =>
      h(DataTable<Row>, { ...base, features: [factory<Row>({ request })] })
    );
    await tick();
    const button = host.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="export-csv-button"]'
    );
    if (!button) throw new Error("Missing export-csv-button");
    expect(button.classList.contains("n-button")).toBe(true);
    expect(button.textContent).toContain(format);
    button.click();
    await tick();
    expect(request).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ rows })
    );
  }
);
