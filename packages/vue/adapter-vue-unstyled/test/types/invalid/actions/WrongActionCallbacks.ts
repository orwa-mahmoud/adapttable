import { bulkActions } from "@adapttable/vue-unstyled/bulk-actions";
import { exportCsv } from "@adapttable/vue-unstyled/export-csv";
import { sidePanel } from "@adapttable/vue-unstyled/side-panel";
interface Person {
  id: string;
  name: string;
}
export let invalidIds: number[];
export let invalidAmount: unknown;
bulkActions([
  {
    key: "bad",
    label: "Bad",
    onClick: (ids: number[]) => {
      invalidIds = ids;
    },
  },
]);
exportCsv<Person>({
  onBeforeExport: (info) => {
    invalidAmount = info.rows[0]?.amount;
  },
});
sidePanel({
  panels: [],
  open: null,
  onOpenChange: (_key: number) => undefined,
});
