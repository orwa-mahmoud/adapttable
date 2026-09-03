/**
 * Feature 21: a live kit table plus a labelled tool-call playground.
 *
 * Not a language model. Buttons call `session.execute`. Writes go through
 * the host and the kit's approval / staged-save chrome.
 */
import type { AgentSession } from "@adapttable/ai";
import { tableAgent } from "@adapttable/ai/react";
import type { BatchRowEdit, ColumnDef, FilterDef } from "@adapttable/core";
import type { TableFeature } from "@adapttable/core/features";
import { Suspense, useMemo, useState } from "react";

import { AI_KIT_FEATURES, type AiKitKey } from "./aiKitFeatures";
import { DemoFallback } from "./kitDemos";
import { kitClassNames, KitProvider, kitTable } from "./kitProviders";
import { DOCS_URL, SHOWCASE_ADAPTERS } from "./matrix/content";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check } from "./sectionIcons";

interface PlaygroundRow {
  id: string;
  name: string;
  team: string;
  salary: number;
}

const SEED: readonly PlaygroundRow[] = [
  { id: "j1", name: "Jonah Okonkwo", team: "Platform", salary: 155 },
  { id: "c1", name: "Chioma Eze", team: "Core", salary: 148 },
  { id: "f1", name: "Fatima Bell", team: "Core", salary: 132 },
  { id: "s1", name: "Sefa Demir", team: "Data", salary: 160 },
  { id: "p1", name: "Priya Nair", team: "Platform", salary: 170 },
];

const COLUMNS: ColumnDef<PlaygroundRow>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
  {
    key: "salary",
    header: "Salary",
    accessor: (row) => row.salary,
    editable: true,
    editor: "number",
    editValue: (row) => String(row.salary),
  },
];

const TEAM_FILTER: FilterDef<PlaygroundRow> = {
  key: "team",
  type: "multiSelect",
  label: "Team",
  options: ["Core", "Platform", "Data"].map((team) => ({
    value: team,
    label: team,
  })),
  getValue: (row) => row.team,
};

function readRtl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("dir") === "rtl";
}

function applyCell(
  rows: readonly PlaygroundRow[],
  row: PlaygroundRow,
  key: string,
  value: unknown
): PlaygroundRow[] {
  return rows.map((current) => {
    if (current.id !== row.id) return current;
    if (key === "salary") return { ...current, salary: Number(value) };
    if (key === "team") return { ...current, team: String(value) };
    if (key === "name") return { ...current, name: String(value) };
    return current;
  });
}

function applyBatch(
  rows: readonly PlaygroundRow[],
  edits: readonly BatchRowEdit<PlaygroundRow>[]
): PlaygroundRow[] {
  return rows.map((current) => {
    const hit = edits.find((edit) => edit.rowId === current.id);
    if (!hit) return current;
    const salary = hit.patch.salary;
    return salary === undefined
      ? current
      : { ...current, salary: Number(salary) };
  });
}

function teamFromFilters(filters: unknown): string | undefined {
  if (!filters || typeof filters !== "object") return undefined;
  const team = (filters as Record<string, unknown>).team;
  if (Array.isArray(team)) {
    return typeof team[0] === "string" ? team[0] : undefined;
  }
  return typeof team === "string" ? team : undefined;
}

export function AiDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const [rtl, setRtl] = useState(readRtl);
  const [allowEdit, setAllowEdit] = useState(true);
  const [rows, setRows] = useState<PlaygroundRow[]>(() => [...SEED]);
  const [teamFilter, setTeamFilter] = useState<string | undefined>();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [selectedKey, setSelectedKey] = useState("view.setFilters");
  const [last, setLast] = useState("");
  const Table = kitTable<PlaygroundRow>(adapter);
  const factories =
    AI_KIT_FEATURES[adapter as AiKitKey] ?? AI_KIT_FEATURES.mantine;
  const visible = useMemo(
    () => (teamFilter ? rows.filter((row) => row.team === teamFilter) : rows),
    [rows, teamFilter]
  );

  const features = useMemo((): TableFeature<PlaygroundRow>[] => {
    const sessionFeature = tableAgent({
      tableId: "ai-playground",
      writePolicy: "allow",
      approval: allowEdit ? "writes" : "never",
      commit: "stage",
      columns: {
        name: { type: "string", writable: false },
        team: { type: "string", writable: false },
        salary: { type: "number", writable: allowEdit },
      },
      apply: {
        setFilters: (filters) => setTeamFilter(teamFromFilters(filters)),
      },
      bridge: { attach: setSession },
    }) as TableFeature<PlaygroundRow>;
    const next: TableFeature<PlaygroundRow>[] = [
      factories.filters([TEAM_FILTER]),
      sessionFeature,
    ];
    if (!allowEdit) return next;
    return [
      factories.approval(),
      factories.editing((row: PlaygroundRow, key: string, value: unknown) => {
        setRows((current) => applyCell(current, row, key, value));
      }),
      factories.batch((edits: readonly BatchRowEdit<PlaygroundRow>[]) => {
        setRows((current) => applyBatch(current, edits));
      }),
      factories.history(),
      factories.undo(),
      ...next,
    ];
  }, [allowEdit, factories]);

  const catalog = session?.catalog() ?? [];
  const selected = catalog.some((entry) => entry.key === selectedKey)
    ? selectedKey
    : (catalog[0]?.key ?? "");
  const schema = selected
    ? JSON.stringify(session?.describe(selected).input, null, 2)
    : "";

  const run = async (key: string, args: unknown, label: string) => {
    if (!session) return;
    const result = await session.execute(
      key,
      args,
      session.manifest().viewRevision,
      `${label}-${String(Date.now())}`
    );
    if (!result.ok) {
      setLast(`${key} failed · ${result.error?.message ?? result.error?.code}`);
      return;
    }
    const approval =
      result.result && typeof result.result === "object"
        ? (result.result as { approval?: string }).approval
        : undefined;
    setLast(approval ? `${key} ok · ${approval}` : `${key} ok`);
  };

  return (
    <div className="mx-demo" dir={rtl ? "rtl" : "ltr"} data-adapter={adapter}>
      <section className="ai-play" aria-labelledby="ai-play-title">
        <p className="ai-play__status" id="ai-play-title">
          <strong>Tool-call playground</strong>
          <span className="ai-play__note">
            Not a language model. These buttons call{" "}
            <code>session.execute</code>. No credentials. No network model call.
          </span>
        </p>
        <div className="ai-play__toolbar">
          <div
            className="ai-play__keys"
            role="radiogroup"
            aria-label="Live catalog"
            data-testid="ai-catalog"
          >
            {catalog.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="radio"
                aria-checked={entry.key === selected}
                className={`ai-play__key${entry.key === selected ? " is-on" : ""}`}
                onClick={() => setSelectedKey(entry.key)}
              >
                {entry.key}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`seg__btn${allowEdit ? " is-on" : ""}`}
            aria-pressed={allowEdit}
            data-testid="ai-allow-edit"
            onClick={() => setAllowEdit((current) => !current)}
          >
            Allow editing
          </button>
          <button
            type="button"
            className={`seg__btn${rtl ? " is-on" : ""}`}
            aria-pressed={rtl}
            onClick={() => setRtl((current) => !current)}
          >
            RTL
          </button>
        </div>
        <pre
          className="ai-play__schema"
          data-testid="ai-schema"
          aria-label={`Schema for ${selected || "no capability"}`}
        >
          {schema || "Attach a session to inspect a capability."}
        </pre>
        <div className="ai-play__actions">
          <button
            type="button"
            className="ai-play__btn"
            onClick={() =>
              void run(
                "view.setFilters",
                { filters: { team: ["Core"] } },
                "filter-core"
              )
            }
          >
            Filter Core team
          </button>
          <button
            type="button"
            className="ai-play__btn"
            disabled={!allowEdit}
            onClick={() =>
              void run(
                "edit.cells",
                {
                  edits: [{ rowKey: "j1", column: "salary", value: 20_000 }],
                },
                "jonah-salary"
              )
            }
          >
            Propose Jonah&apos;s salary
          </button>
          <output className="ai-play__last" data-testid="ai-last">
            {last}
          </output>
        </div>
        <p className="ai-play__refs">
          <Check size={12} />{" "}
          {teamFilter
            ? `Active host filter: team = ${teamFilter}`
            : "No host filter"}
          <a href={`${DOCS_URL}ai-integrations/`}>AI integrations</a>
        </p>
        <nav
          className="ai-play__kits"
          aria-label="Same playground in another adapter"
        >
          {SHOWCASE_ADAPTERS.filter((kit) => kit.built).map((kit) => (
            <a
              key={kit.key}
              href={`../../${kit.key}/ai/`}
              aria-current={kit.key === adapter ? "page" : undefined}
            >
              {kit.label}
            </a>
          ))}
        </nav>
      </section>
      <KitProvider kit={adapter} dark={dark} dir={rtl ? "rtl" : "ltr"}>
        <Suspense fallback={<DemoFallback />}>
          <Table
            data={visible}
            columns={COLUMNS}
            rowKey={(row: PlaygroundRow) => row.id}
            urlSync={false}
            features={features}
            classNames={kitClassNames(adapter)}
          />
        </Suspense>
      </KitProvider>
    </div>
  );
}
