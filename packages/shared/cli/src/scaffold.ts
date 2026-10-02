import type { KitInfo } from "./detect";

/**
 * A file the scaffolder will write.
 *
 * @public
 */
export interface ScaffoldFile {
  /** Path relative to the project root. */
  path: string;
  /** File contents. */
  contents: string;
}

/**
 * Build the starter table component source for a kit, using its framework's
 * table component with `data`, `columns` and `rowKey`.
 *
 * @param info - The chosen kit.
 * @returns The starter component source.
 * @public
 */
export function starterComponent(info: KitInfo): string {
  if (info.framework === "angular") return angularStarterComponent(info);
  return `"use client";
import { DataTable, type ColumnDef } from "${info.adapter}";

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
 * \`data\` is the zero-ceremony frontend tier; add \`onQueryChange\` for
 * server pagination, or a \`source\` from \`useQuerySource\` for a query
 * library — the component stays the same.
 */
export function PeopleTable() {
  return <DataTable data={PEOPLE} columns={columns} rowKey={(r) => r.id} />;
}
`;
}

/** The standalone Angular counterpart of the React starter. */
function angularStarterComponent(info: KitInfo): string {
  return `/** Starter table scaffolded by \`npx @adapttable/cli init\` (${info.label}). */
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "${info.adapter}";

interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Component({
  selector: "people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
    />
  \`,
})
export class PeopleTable {
  readonly people: Person[] = [
    { id: "1", name: "Ada Lovelace", email: "ada@example.com", role: "Engineer" },
    { id: "2", name: "Alan Turing", email: "alan@example.com", role: "Founder" },
    { id: "3", name: "Grace Hopper", email: "grace@example.com", role: "Admiral" },
  ];

  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
    { key: "email", header: "Email", accessor: (r) => r.email },
    { key: "role", header: "Role", accessor: (r) => r.role, sortable: true },
  ];

  readonly rowKey = (row: Person) => row.id;
}
`;
}

/**
 * Default path the React starter component is written to.
 *
 * @public
 */
export const STARTER_PATH = "src/PeopleTable.tsx";

/**
 * Compute the scaffold file(s) for a kit.
 *
 * @param info - The chosen kit.
 * @returns The files to write.
 * @public
 */
export function scaffoldFiles(info: KitInfo): ScaffoldFile[] {
  return [
    {
      path:
        info.framework === "angular" ? "src/app/peopleTable.ts" : STARTER_PATH,
      contents: starterComponent(info),
    },
  ];
}

/**
 * The package list for a kit (core + Angular binding when needed + adapter +
 * extras). Angular kits are unpublished and require a local package source.
 *
 * @param info - The chosen kit.
 * @returns The ordered package list.
 * @public
 */
export function packagesFor(info: KitInfo): string[] {
  return [
    "@adapttable/core",
    ...(info.framework === "angular" ? ["@adapttable/angular"] : []),
    info.adapter,
    ...info.extras,
  ];
}
