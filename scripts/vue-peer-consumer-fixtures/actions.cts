import native = require("@adapttable/vue-unstyled");
import bulk = require("@adapttable/vue-unstyled/bulk-actions");
import palette = require("@adapttable/vue-unstyled/command-palette");
import menu = require("@adapttable/vue-unstyled/context-menu");
import csv = require("@adapttable/vue-unstyled/export");
import pdf = require("@adapttable/vue-unstyled/export-pdf");
import xlsx = require("@adapttable/vue-unstyled/export-xlsx");
import printFeature = require("@adapttable/vue-unstyled/print");
import panel = require("@adapttable/vue-unstyled/side-panel");
import vue = require("vue");
interface Person {
  id: string;
  name: string;
}
const rows: Person[] = [{ id: "a", name: "Ada" }];
let selected: string[] = [];
let allMatching: boolean | undefined;
const features = [
  bulk.bulkActions([
    {
      key: "go",
      label: "Go",
      onClick: (ids, scope) => {
        selected = ids.map((id) => id.toUpperCase());
        allMatching = scope.allMatching;
      },
    },
  ]),
  menu.contextMenu<Person>({
    items: (target) => [
      {
        key: "host",
        label: target.kind === "header" ? target.columnKey : target.row.name,
        onSelect: () => undefined,
      },
    ],
  }),
  palette.commandPalette({ button: true }),
  panel.sidePanel({ panels: [], open: null, onOpenChange: () => undefined }),
  csv.exportCsv<Person>({ writer: pdf.pdfWriter() }),
  printFeature.print(() => undefined, true),
];
const spreadsheet = csv.exportCsv<Person>({ writer: xlsx.xlsxWriter() });
const tableProps = {
  data: rows,
  columns: [{ key: "name" }],
  rowKey: (row) => row.id,
  features,
} satisfies native.DataTableProps<Person>;
const table = vue.h(native.DataTable<Person>, tableProps);
const selection = () => ({ selected, allMatching });
export = { table, spreadsheet, selection };
