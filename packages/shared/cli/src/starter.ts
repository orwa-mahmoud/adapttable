/**
 * The scaffold core: the sample every starter table shows, and the shape a
 * framework's template fills in. Each framework's template renders the same
 * people and the same columns into its own component syntax.
 */
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

/** How one framework's starter is written, installed and wired into a host. */
export interface FrameworkTemplate {
  /**
   * The framework's name in the detection headline, beside the kit's; absent
   * where the kit's name alone is the headline.
   */
  readonly label?: string;
  /** Binding packages installed between core and the kit's adapter. */
  readonly bindings: readonly string[];
  /** Whether a kit extra the host already depends on is left as installed. */
  readonly keepsHostPeers: boolean;
  /** A line printed under the detection headline, when the framework has one. */
  readonly notice?: string;
  /** The starter component's source. */
  component(info: KitInfo): string;
  /** Where the starter component is written. */
  readonly componentPath: string;
  /** Files written beside the component: host setup a kit needs. */
  setupFiles(info: KitInfo): readonly ScaffoldFile[];
  /** The lines that tell the reader how to render the starter in a host. */
  hostSetup(info: KitInfo): readonly string[];
}

/** One sample person, as every starter declares it. */
interface Person {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

const PEOPLE: readonly Person[] = [
  { id: "1", name: "Ada Lovelace", email: "ada@example.com", role: "Engineer" },
  { id: "2", name: "Alan Turing", email: "alan@example.com", role: "Founder" },
  {
    id: "3",
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "Admiral",
  },
];

/** One starter column: its field, its header, and whether it sorts. */
interface StarterColumn {
  readonly key: Exclude<keyof Person, "id">;
  readonly header: string;
  readonly sortable: boolean;
}

const COLUMNS: readonly StarterColumn[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: false },
  { key: "role", header: "Role", sortable: true },
];

const FIELDS: readonly (keyof Person)[] = ["id", "name", "email", "role"];

/** The `Person` interface every starter declares. */
export function personInterface(): string {
  const fields = FIELDS.map((field) => `  ${field}: string;\n`).join("");
  return `interface Person {\n${fields}}\n`;
}

/** One sample person as an object literal's fields. */
function personFields(person: Person): string {
  return FIELDS.map((field) => `${field}: "${person[field]}"`).join(", ");
}

/** The sample rows, one object literal per line at `indent`. */
export function peopleRows(indent: string): string {
  return PEOPLE.map((person) => `${indent}{ ${personFields(person)} },\n`).join(
    ""
  );
}

/**
 * The column definitions, one object literal per line at `indent`, each
 * reading its field from the row parameter `row`.
 */
export function columnRows(indent: string, row: string): string {
  return COLUMNS.map(
    ({ key, header, sortable }) =>
      `${indent}{ key: "${key}", header: "${header}", accessor: (${row}) => ${row}.${key}${sortable ? ", sortable: true" : ""} },\n`
  ).join("");
}
