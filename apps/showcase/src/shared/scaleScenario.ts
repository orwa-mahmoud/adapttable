/**
 * The scale page, written once for React, Vue and Angular: the synthetic
 * people it windows, the server tier's rows derived from their index, the
 * URL knobs a visitor or the benchmark sets, and the columns. A framework
 * adds its person cell (name over email), its table and its window.
 */
import type { ColumnMetadata } from "@adapttable/core";

/** One row of the scale dataset. */
export interface BigPerson {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly status: string;
  readonly budget: number;
}

const FIRST = [
  "Amara",
  "Diego",
  "Priya",
  "Sefa",
  "Lena",
  "Marcus",
  "Yuki",
  "Fatima",
  "Tomas",
  "Chioma",
  "Henrik",
  "Sofia",
  "Omar",
  "Grace",
  "Noah",
  "Aisha",
  "Lucas",
  "Mira",
  "Daniel",
  "Elena",
  "Kwame",
  "Bella",
  "Rohan",
  "Hannah",
];
const LAST = [
  "Okafor",
  "Marchetti",
  "Nair",
  "Demir",
  "Hoffmann",
  "Bell",
  "Tanaka",
  "Al-Sayed",
  "Novak",
  "Eze",
  "Larsson",
  "Reyes",
  "Haddad",
  "Liu",
  "Schmidt",
];
const ROLES = [
  "Staff Engineer",
  "Product Designer",
  "Eng Manager",
  "Frontend Engineer",
  "Data Scientist",
  "Backend Engineer",
  "DevOps Engineer",
  "QA Engineer",
];
const STATUSES = ["Active", "Paid", "Open", "Blocked", "Archived"];

/** How many rows the page holds unless `?rows=` says otherwise. */
export const SCALE_DEFAULT_ROWS = 50_000;

/** How many rows one server slice or frontend window starts with. */
export const SCALE_SLICE = 500;

/** Children per parent in the `?tree=1` benchmark shape. */
export const SCALE_TREE_FANOUT = 10;

/** A seeded generator: the same sequence on every load, no `Math.random`. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/** One person from a generator's next draws. */
function drawPerson(index: number, rnd: () => number): BigPerson {
  const first = FIRST[Math.trunc(rnd() * FIRST.length)] ?? "";
  const last = LAST[Math.trunc(rnd() * LAST.length)] ?? "";
  const handle = `${first}.${last}`.toLowerCase().replaceAll(/[^a-z.]/g, "");
  return {
    id: index + 1,
    name: `${first} ${last}`,
    email: `${handle}${String(index)}@northwind.io`,
    role: ROLES[Math.trunc(rnd() * ROLES.length)] ?? "",
    status: STATUSES[Math.trunc(rnd() * STATUSES.length)] ?? "",
    budget: 40000 + Math.trunc(rnd() * 180000),
  };
}

/**
 * The whole dataset in memory, the same on every load.
 *
 * @param count - How many people.
 * @returns The people, ids from 1.
 */
export function makeBigList(count: number): BigPerson[] {
  const rnd = seeded(1337);
  return Array.from({ length: count }, (_, index) => drawPerson(index, rnd));
}

/**
 * One row of a dataset too big to hold, derived from its index: a page
 * costs a page, and the reported total is honest.
 *
 * @param index - The row's position, from 0.
 * @returns That row.
 */
export function serverRow(index: number): BigPerson {
  return drawPerson(index, seeded((index + 1) * 2654435761));
}

/**
 * The rows a server slice answers with.
 *
 * @param from - The first row's position.
 * @param limit - How many rows were asked for.
 * @param total - How many rows the server holds.
 * @returns The slice.
 */
export function serverSlice(
  from: number,
  limit: number,
  total: number
): BigPerson[] {
  return Array.from(
    { length: Math.max(0, Math.min(limit, total - from)) },
    (_, offset) => serverRow(from + offset)
  );
}

/** A row height that varies, for the `?rowHeight=1` benchmark. */
export function variableRowHeight(row: BigPerson): number {
  return 40 + (row.id % 4) * 12;
}

/** The page's URL knobs; every default is the page a visitor sees. */
export interface ScaleParams {
  /** `?rows=N`: how many people. */
  readonly total: number;
  /** `?virtualize=0` turns windowing off. */
  readonly virtual: boolean;
  /** `?virtualizeColumns=1` windows the columns too. */
  readonly virtualCols: boolean;
  /** `?all=1` loads the whole list up front. */
  readonly all: boolean;
  /** `?cols=N` pads the table out to N columns. */
  readonly cols: number;
  /** `?tier=server` answers from a paged server instead of memory. */
  readonly server: boolean;
  /** `?edit=1` makes Budget editable. */
  readonly edit: boolean;
  /** `?patch=N` applies N row patches after mount. */
  readonly patches: number;
  /** `?incremental=1` keeps the patch log for the incremental engine. */
  readonly incremental: boolean;
  /** `?tree=1` reads the list as a hierarchy. */
  readonly tree: boolean;
  /** `?rowHeight=1` varies the row height. */
  readonly variableHeight: boolean;
}

/**
 * The knobs the current URL sets.
 *
 * @returns The page's knobs, defaults where the URL names none.
 */
export function scaleParams(): ScaleParams {
  const search = typeof window === "undefined" ? "" : window.location.search;
  const params = new URLSearchParams(search);
  const count = (key: string) => {
    const value = Number(params.get(key));
    return Number.isInteger(value) && value > 0 ? value : 0;
  };
  return {
    total: count("rows") || SCALE_DEFAULT_ROWS,
    virtual: params.get("virtualize") !== "0",
    virtualCols: params.get("virtualizeColumns") === "1",
    all: params.get("all") === "1",
    cols: count("cols"),
    server: params.get("tier") === "server",
    edit: params.get("edit") === "1",
    patches: count("patch"),
    incremental: params.get("incremental") === "1",
    tree: params.get("tree") === "1",
    variableHeight: params.get("rowHeight") === "1",
  };
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** A scale column, in the shape every binding's column type accepts. */
export type ScaleColumn = Omit<
  ColumnMetadata<BigPerson>,
  "header" | "filter" | "editor" | "formatAggregate" | "accessor"
> & {
  readonly header: string;
  /** What the cell reads: text, which every binding draws. */
  readonly accessor?: (row: BigPerson) => string;
};

/**
 * The columns every framework draws; the Person column's cell, name over
 * email, is each framework's own.
 */
export const SCALE_COLUMNS: readonly ScaleColumn[] = [
  {
    key: "name",
    header: "Person",
    sortable: true,
    sortValue: (row) => row.name,
    accessor: (row) => row.name,
  },
  { key: "role", header: "Role", accessor: (row) => row.role },
  { key: "status", header: "Status", accessor: (row) => row.status },
  {
    key: "budget",
    header: "Budget",
    align: "end",
    sortable: true,
    sortValue: (row) => row.budget,
    accessor: (row) => money.format(row.budget),
  },
];

/**
 * Synthetic columns that pad the set out to `cols` for the wide-table
 * benchmark, each reading a rotating field; none when the set is already
 * that wide.
 *
 * @param present - How many columns there are already.
 * @param cols - How many the page asks for.
 * @returns The extra columns.
 */
export function paddingColumns(present: number, cols: number): ScaleColumn[] {
  return Array.from({ length: Math.max(0, cols - present) }, (_, offset) => {
    const index = present + offset;
    return {
      key: `synthetic${String(index)}`,
      header: `Col ${String(index)}`,
      accessor: (row: BigPerson) => (index % 2 === 0 ? row.role : row.status),
      width: 120,
    };
  });
}

/** The search box's placeholder for `total` rows. */
export function scalePlaceholder(total: number): string {
  return `Filter ${total.toLocaleString("en-US")} rows…`;
}

/** A scale row's key. */
export const scaleRowKey = (row: BigPerson): string => String(row.id);
