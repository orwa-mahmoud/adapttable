/**
 * In-browser agent — `@adapttable/ai/react` + `@adapttable/ai/json`.
 *
 * A live table would compose `tableAgent({ tableId, bridge })` next to
 * `filters()` / `editing()`. This example drives the same
 * `createAgentSession` + `executeEnvelope` contract with an in-memory
 * observe/apply so it stays kit-free. Do not invent a second session.
 *
 * Host policy (future `tableAgent` options):
 *   approval: "writes" | "destructive" | "never"  (default "writes")
 *   commit:   "stage" | "immediate"               (default "stage")
 */
import { createAgentSession, type AgentObservation } from "@adapttable/ai";
import {
  executeEnvelope,
  executeJsonTool,
  toJsonTools,
} from "@adapttable/ai/json";
import { tableAgent } from "@adapttable/ai/react";
import { useMemo, useRef, useState, type ReactNode } from "react";

const TABLE_ID = "employees";

const SOURCE: AgentObservation["source"] = {
  fullDataset: false,
  grouping: false,
  selectAcrossPages: false,
  exportScope: "page",
  totalCount: "loaded",
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: TABLE_ID,
    viewRevision: 1,
    featureIds: ["editing"],
    columns: [
      {
        id: "name",
        label: "Name",
        type: "string",
        readable: true,
        writable: false,
        sortable: true,
      },
      {
        id: "salary",
        label: "Salary",
        type: "number",
        readable: true,
        writable: true,
        sortable: true,
      },
    ],
    source: SOURCE,
    writePolicy: "allow",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: false,
    hasExport: false,
    hasEdit: true,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

const SALARY_EDIT = {
  edits: [{ rowKey: "5", column: "salary", value: 20000 }],
};

/**
 * Compose this feature on a live `DataTable` `features` array. The example
 * below uses `createAgentSession` with the same observe/apply so it can
 * run without mounting a kit provider.
 */
export const browserAgentFeature = tableAgent({
  tableId: TABLE_ID,
  writePolicy: "allow",
  columns: {
    salary: { writable: true, type: "number" },
  },
});

export function AiBrowserAgentExample(): ReactNode {
  const commitRef = useRef<"stage" | "immediate">("stage");
  const filtersRef = useRef(false);
  const proposals = useRef<unknown[]>([]);
  const [filterOn, setFilterOn] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const session = useMemo(
    () =>
      createAgentSession({
        observe: () =>
          observation({
            hasFilters: filtersRef.current,
            featureIds: filtersRef.current
              ? ["editing", "filters"]
              : ["editing"],
          }),
        apply: {
          editCells: (edits) => {
            const record = { commit: commitRef.current, edits };
            proposals.current = [...proposals.current, record];
            return record;
          },
        },
      }),
    []
  );

  const tools = toJsonTools(session);
  const write = (line: string) => setLog((rows) => [...rows, line]);

  const runSalary = async (commit: "stage" | "immediate") => {
    commitRef.current = commit;
    const result = await executeEnvelope(session, {
      schemaVersion: "adapttable.agent.v1",
      tableId: TABLE_ID,
      key: "edit.cells",
      args: SALARY_EDIT,
      expectedRevision: session.manifest().viewRevision,
      idempotencyKey: `salary-${commit}`,
    });
    write(
      `${commit} salary 20000 on rowKey "5" → ${result.ok ? "ok" : result.error?.message}`
    );
  };

  return (
    <section>
      <h2>Browser agent</h2>
      <p>
        Feature id <code>{browserAgentFeature.id}</code>. Tools come from{" "}
        <code>toJsonTools(session)</code> — names are capability keys.
      </p>
      <p>
        Catalog starts without filters
        {filterOn ? " — filters are now composed." : "."} 11-B will also
        advertise <code>view.setSelection</code>, <code>views.apply</code>,{" "}
        <code>rows.read</code>, <code>rows.resolve</code>, <code>rows.add</code>
        , <code>rows.delete</code> when those are wired.
      </p>
      <ul>
        {tools.map((tool) => (
          <li key={tool.name}>
            <code>{tool.name}</code> — {tool.description}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          filtersRef.current = true;
          setFilterOn(true);
          write(
            `composed filters → catalog now has view.setFilters: ${session
              .catalog()
              .some((entry) => entry.key === "view.setFilters")}`
          );
        }}
      >
        Compose filters
      </button>
      <button type="button" onClick={() => void runSalary("stage")}>
        Stage salary 20000
      </button>
      <button type="button" onClick={() => void runSalary("immediate")}>
        Commit salary 20000 immediately
      </button>
      <button
        type="button"
        onClick={() => {
          void executeJsonTool(session, {
            name: "view.setPage",
            arguments: { page: 2 },
            expectedRevision: session.manifest().viewRevision,
            idempotencyKey: "browser-page-2",
          }).then((result) => write(`view.setPage → ${result.ok}`));
        }}
      >
        Go to page 2
      </button>
      <pre>{log.join("\n")}</pre>
    </section>
  );
}
