import type { KitInfo } from "./detect";

/** A file the scaffolder will write. */
export interface ScaffoldFile {
  /** Path relative to the project root. */
  path: string;
  /** File contents. */
  contents: string;
}

/**
 * Build the starter table component source for a kit. It uses the same
 * `DataTable` + `useFrontendData` API across every adapter — only the
 * import package differs.
 *
 * @param info - The chosen kit.
 * @returns The starter component source.
 */
export function starterComponent(info: KitInfo): string {
  return `import { DataTable, useFrontendData, type ColumnDef } from "${info.adapter}";

interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada Lovelace", email: "ada@example.com", role: "Engineer" },
  { id: "2", name: "Alan Turing", email: "alan@example.com", role: "Founder" },
  { id: "3", name: "Grace Hopper", email: "grace@example.com", role: "Admiral" },
];

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "email", header: "Email", accessor: (r) => r.email },
  { key: "role", header: "Role", accessor: (r) => r.role, sortable: true },
];

/**
 * Starter table scaffolded by \`npx @adapttable/cli init\` (${info.label}).
 * Swap \`useFrontendData\` for \`useQuerySource\` to drive it from a
 * server-paginated query — the component doesn't change.
 */
export function PeopleTable() {
  const source = useFrontendData({ data: PEOPLE, columns });
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}
`;
}

/** Default path the starter component is written to. */
export const STARTER_PATH = "src/PeopleTable.tsx";

/**
 * Compute the scaffold file(s) for a kit.
 *
 * @param info - The chosen kit.
 * @returns The files to write.
 */
export function scaffoldFiles(info: KitInfo): ScaffoldFile[] {
  return [{ path: STARTER_PATH, contents: starterComponent(info) }];
}

/**
 * The full package list to install for a kit (core + adapter + extras).
 *
 * @param info - The chosen kit.
 * @returns The ordered package list.
 */
export function packagesFor(info: KitInfo): string[] {
  return ["@adapttable/core", info.adapter, ...info.extras];
}
