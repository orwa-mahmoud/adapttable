import Native = require("@adapttable/vue-unstyled/header-filters");
import Binding = require("@adapttable/vue/adapter");
import Adapter1 = require("@adapttable/vue");
import Vue = require("vue");

interface Person {
  id: string;
  name: string;
}
const source: Adapter1.FilterFormSource<Person> = {
  extra: {},
  setExtra: () => undefined,
  setExtras: () => undefined,
};
const control: Binding.FilterHeaderControlOptions<Person> = {
  def: { key: "name", type: "text", getValue: (person) => person.name },
  source,
  labels: Binding.resolveLabels(undefined),
};
const row: Binding.FilterHeaderRowProps<Person> = {
  columns: [{ key: "name", accessor: (person) => person.name }],
  defs: [control.def],
  source,
  labels: control.labels,
};
const headerControls = [
  Vue.h(Native.FilterHeaderControl<Person>, { ...control }),
  Vue.h(Native.FilterHeaderRow<Person>, { ...row }),
];
export = headerControls;
