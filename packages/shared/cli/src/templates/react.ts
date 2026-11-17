import type { KitInfo } from "../detect";
import {
  columnRows,
  type FrameworkTemplate,
  peopleRows,
  personInterface,
} from "../starter";

/**
 * Default path the React starter component is written to.
 *
 * @public
 */
export const STARTER_PATH = "src/PeopleTable.tsx";

/** A client component rendering the kit's `DataTable`. */
function component(info: KitInfo): string {
  return `"use client";
import { DataTable, type ColumnDef } from "${info.adapter}";

${personInterface()}
const PEOPLE: Person[] = [
${peopleRows("  ")}];

const columns: ColumnDef<Person>[] = [
${columnRows("  ", "r")}];

/**
 * Starter table scaffolded by \`npx @adapttable/cli init\` (${info.label}).
 * \`data\` is the zero-ceremony frontend tier; add \`onQueryChange\` for
 * server pagination, or a \`source\` from \`useQuerySource\` for a query
 * library — the component stays the same.
 */
export function PeopleTable() {
  return <DataTable data={PEOPLE} columns={columns} rowKey={(r) => r.id} />;
}
`;
}

/** The React starter: one client component, rendered inside the kit's provider. */
export const REACT_TEMPLATE: FrameworkTemplate = {
  bindings: [],
  keepsHostPeers: false,
  component,
  componentPath: STARTER_PATH,
  setupFiles: () => [],
  hostSetup: () => [
    "3. Wrap your app in your UI kit's provider (MantineProvider / ThemeProvider / ChakraProvider / ConfigProvider — per its docs), render <PeopleTable />, done.",
  ],
};
