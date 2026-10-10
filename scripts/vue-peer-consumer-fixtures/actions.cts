import native = require("@adapttable/vue-unstyled");
import actions = require("@adapttable/vue-unstyled/features");
import pdf = require("@adapttable/vue-unstyled/export-pdf");
import xlsx = require("@adapttable/vue-unstyled/export-xlsx");
import vue = require("vue");
interface Person {
  id: string;
  name: string;
}
const rows: Person[] = [{ id: "a", name: "Ada" }];
let selected: string[] = [];
let allMatching: boolean | undefined;
const features = [
  actions.bulkActions([
    {
      key: "go",
      label: "Go",
      onClick: (ids, scope) => {
        selected = ids.map((id) => id.toUpperCase());
        allMatching = scope.allMatching;
      },
    },
  ]),
  actions.contextMenu<Person>({
    items: (target) => [
      {
        key: "host",
        label: target.kind === "header" ? target.columnKey : target.row.name,
        onSelect: () => undefined,
      },
    ],
  }),
  actions.commandPalette({ button: true }),
  actions.sidePanel({ panels: [], open: null, onOpenChange: () => undefined }),
  actions.exportCsv<Person>({ writer: pdf.pdfWriter() }),
  actions.print(() => undefined, true),
];
const spreadsheet = actions.exportCsv<Person>({ writer: xlsx.xlsxWriter() });
const tableProps = {
  data: rows,
  columns: [{ key: "name" }],
  rowKey: (row) => row.id,
  features,
} satisfies native.DataTableProps<Person>;
const table = vue.h(native.DataTable<Person>, tableProps);
const selection = () => ({ selected, allMatching });
export = { table, spreadsheet, selection };
