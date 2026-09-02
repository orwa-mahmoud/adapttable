/**
 * Non-indexed kit page that proves agent approval, staging, save and undo.
 *
 * Not a marketing matrix tile — optional AI chrome is not a first-look
 * evaluation feature. e2e drives this page across every published kit.
 */
import type { AgentSession } from "@adapttable/ai";
import { tableAgent } from "@adapttable/ai/react";
import { agentApproval as antdApproval } from "@adapttable/antd";
import {
  batchEditing as antdBatch,
  editHistory as antdHistory,
  editing as antdEditing,
  undoRedoButtons as antdUndo,
} from "@adapttable/antd/editing";
import { agentApproval as baseUiApproval } from "@adapttable/base-ui";
import {
  batchEditing as baseUiBatch,
  editHistory as baseUiHistory,
  editing as baseUiEditing,
  undoRedoButtons as baseUiUndo,
} from "@adapttable/base-ui/editing";
import { agentApproval as chakraApproval } from "@adapttable/chakra";
import {
  batchEditing as chakraBatch,
  editHistory as chakraHistory,
  editing as chakraEditing,
  undoRedoButtons as chakraUndo,
} from "@adapttable/chakra/editing";
import type { BatchRowEdit, ColumnDef } from "@adapttable/core";
import { agentApproval as mantineApproval } from "@adapttable/mantine";
import {
  batchEditing as mantineBatch,
  editHistory as mantineHistory,
  editing as mantineEditing,
  undoRedoButtons as mantineUndo,
} from "@adapttable/mantine/editing";
import { agentApproval as muiApproval } from "@adapttable/mui";
import {
  batchEditing as muiBatch,
  editHistory as muiHistory,
  editing as muiEditing,
  undoRedoButtons as muiUndo,
} from "@adapttable/mui/editing";
import { agentApproval as radixApproval } from "@adapttable/radix";
import {
  batchEditing as radixBatch,
  editHistory as radixHistory,
  editing as radixEditing,
  undoRedoButtons as radixUndo,
} from "@adapttable/radix/editing";
import { agentApproval as shadcnApproval } from "@adapttable/shadcn";
import {
  batchEditing as shadcnBatch,
  editHistory as shadcnHistory,
  editing as shadcnEditing,
  undoRedoButtons as shadcnUndo,
} from "@adapttable/shadcn/editing";
import { agentApproval as unstyledApproval } from "@adapttable/unstyled";
import {
  batchEditing as unstyledBatch,
  editHistory as unstyledHistory,
  editing as unstyledEditing,
  undoRedoButtons as unstyledUndo,
} from "@adapttable/unstyled/editing";
import { Suspense, useMemo, useState } from "react";

import { DemoFallback, KitSwitcher, readKitFromUrl } from "./kitDemos";
import { kitClassNames, KitProvider, kitTable } from "./kitProviders";

interface LabRow {
  id: string;
  name: string;
  salary: number;
}

const SEED: readonly LabRow[] = [
  { id: "r1", name: "Ada", salary: 100 },
  { id: "r2", name: "Grace", salary: 110 },
  { id: "r3", name: "Alan", salary: 120 },
  { id: "r4", name: "Jean", salary: 130 },
  { id: "r5", name: "Don", salary: 140 },
];

const COLUMNS: ColumnDef<LabRow>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  {
    key: "salary",
    header: "Salary",
    accessor: (row) => row.salary,
    editable: true,
    editor: "number",
    editValue: (row) => String(row.salary),
  },
];

const KIT_FEATURES = {
  mantine: {
    approval: mantineApproval,
    editing: mantineEditing,
    batch: mantineBatch,
    history: mantineHistory,
    undo: mantineUndo,
  },
  mui: {
    approval: muiApproval,
    editing: muiEditing,
    batch: muiBatch,
    history: muiHistory,
    undo: muiUndo,
  },
  chakra: {
    approval: chakraApproval,
    editing: chakraEditing,
    batch: chakraBatch,
    history: chakraHistory,
    undo: chakraUndo,
  },
  antd: {
    approval: antdApproval,
    editing: antdEditing,
    batch: antdBatch,
    history: antdHistory,
    undo: antdUndo,
  },
  radix: {
    approval: radixApproval,
    editing: radixEditing,
    batch: radixBatch,
    history: radixHistory,
    undo: radixUndo,
  },
  "base-ui": {
    approval: baseUiApproval,
    editing: baseUiEditing,
    batch: baseUiBatch,
    history: baseUiHistory,
    undo: baseUiUndo,
  },
  shadcn: {
    approval: shadcnApproval,
    editing: shadcnEditing,
    batch: shadcnBatch,
    history: shadcnHistory,
    undo: shadcnUndo,
  },
  tailwind: {
    approval: unstyledApproval,
    editing: unstyledEditing,
    batch: unstyledBatch,
    history: unstyledHistory,
    undo: unstyledUndo,
  },
} as const;

function readDir(): "ltr" | "rtl" {
  if (typeof window === "undefined") return "ltr";
  return new URLSearchParams(window.location.search).get("dir") === "rtl"
    ? "rtl"
    : "ltr";
}

function applyCell(
  rows: readonly LabRow[],
  row: LabRow,
  key: string,
  value: unknown
): LabRow[] {
  return rows.map((current) => {
    if (current.id !== row.id) return current;
    if (key === "salary") return { ...current, salary: Number(value) };
    return current;
  });
}

function applyBatch(
  rows: readonly LabRow[],
  edits: readonly BatchRowEdit<LabRow>[]
): LabRow[] {
  return rows.map((current) => {
    const hit = edits.find((edit) => edit.rowId === current.id);
    if (!hit) return current;
    const salary = hit.patch.salary;
    return salary === undefined
      ? current
      : { ...current, salary: Number(salary) };
  });
}

export function AgentApprovalDemo({ dark }: Readonly<{ dark: boolean }>) {
  const [kit, setKit] = useState(readKitFromUrl);
  const [dir] = useState(readDir);
  const [rows, setRows] = useState<LabRow[]>(() => [...SEED]);
  const [session, setSession] = useState<AgentSession | null>(null);
  const [last, setLast] = useState("");
  const Table = kitTable<LabRow>(kit);
  const factories =
    KIT_FEATURES[kit as keyof typeof KIT_FEATURES] ?? KIT_FEATURES.mantine;

  const features = useMemo(
    () => [
      factories.approval(),
      factories.editing((row: LabRow, key: string, value: unknown) => {
        setRows((current) => applyCell(current, row, key, value));
      }),
      factories.batch((edits: readonly BatchRowEdit<LabRow>[]) => {
        setRows((current) => applyBatch(current, edits));
      }),
      factories.history(),
      factories.undo(),
      tableAgent({
        tableId: "agent-lab",
        writePolicy: "allow",
        approval: "writes",
        commit: "stage",
        columns: {
          name: { type: "string", writable: false },
          salary: { type: "number", writable: true },
        },
        bridge: { attach: setSession },
      }),
    ],
    [factories]
  );

  const proposeFifth = async () => {
    if (!session) return;
    const result = await session.execute(
      "edit.cells",
      {
        edits: [
          {
            column: "salary",
            value: 20_000,
            position: 5,
            scope: "visible",
          },
        ],
      },
      session.manifest().viewRevision,
      `fifth-${String(Date.now())}`
    );
    setLast(
      result.ok
        ? String((result.result as { approval?: string })?.approval)
        : "failed"
    );
  };

  return (
    <div className="mx-demo" dir={dir}>
      <KitSwitcher adapter={kit} dark={dark} onChange={setKit} urlSync />
      <p className="hint-row">
        <span className="hint">
          Propose the fifth visible salary. Approve stages it. Save commits.
          Undo restores. Escape rejects. Enter does not confirm.
        </span>
      </p>
      <div className="hint-row">
        <button type="button" onClick={() => void proposeFifth()}>
          Propose fifth salary
        </button>
        <output data-testid="agent-last">{last}</output>
      </div>
      <KitProvider kit={kit} dark={dark} dir={dir}>
        <Suspense fallback={<DemoFallback />}>
          <Table
            data={rows}
            columns={COLUMNS}
            rowKey={(row: LabRow) => row.id}
            urlSync={false}
            features={features}
            classNames={kitClassNames(kit)}
          />
        </Suspense>
      </KitProvider>
    </div>
  );
}
