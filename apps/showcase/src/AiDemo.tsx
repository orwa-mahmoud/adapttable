/**
 * Feature 21: a table you talk to.
 *
 * The panel beside the table is the SHIPPED widget from
 * `@adapttable/<kit>/assistant`, driven by the shipped controller. Nothing
 * about the conversation is reimplemented here — what this page adds is the
 * one thing a library cannot ship: a transport. In demo mode that is a fixed
 * script (`aiScenario.ts`) with no model behind it; connect a backend and the
 * same composer and the same suggestions go there instead.
 *
 * Every operation runs through the ordinary session executor against the live
 * revision, so what the reader sees happen to the rows is the real thing.
 */
import type {
  AgentManifest,
  AgentSession,
  AssistantSuggestion,
} from "@adapttable/ai";
import { useTableAssistant } from "@adapttable/ai/assistant";
import { tableAgent } from "@adapttable/ai/react";
import {
  defaultLabels,
  type FilterDef,
  type RowPinState,
} from "@adapttable/core";
import type { BatchRowEdit, ColumnDef } from "@adapttable/react";
import { assistantIsBusy } from "@adapttable/react/adapter";
import type { TableFeature } from "@adapttable/react/features";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { type AiConnection, AiConnectionSettings } from "./AiBackendConnect";
import { AI_KIT_FEATURES, type AiKitKey } from "./aiKitFeatures";
import { DEMO_SCENARIOS, demoTransport } from "./aiScenario";
import { setAssistantActive } from "./assistantActivity";
import { DemoFallback } from "./kitDemos";
import { kitClassNames, KitProvider, kitTable } from "./kitProviders";
import { DOCS_URL, SHOWCASE_ADAPTERS } from "./matrix/content";
import type { FeatureBodyProps } from "./matrix/featureBodies";

interface StaffRow {
  id: string;
  person: string;
  team: string;
  status: string;
  salary: number;
  started: string;
}

/**
 * Small enough to read at a glance, wide enough that an operation is visible.
 * Every suggestion names a row that exists here.
 */
const SEED: readonly StaffRow[] = [
  {
    id: "p1",
    person: "Priya Nair",
    team: "Platform",
    status: "Active",
    salary: 170,
    started: "2021-03-15",
  },
  {
    id: "j1",
    person: "Jonah Okonkwo",
    team: "Platform",
    status: "Active",
    salary: 155,
    started: "2020-11-02",
  },
  {
    id: "c1",
    person: "Chioma Eze",
    team: "Core",
    status: "Active",
    salary: 148,
    started: "2022-01-10",
  },
  {
    id: "f1",
    person: "Fatima Bell",
    team: "Core",
    status: "On leave",
    salary: 132,
    started: "2019-06-24",
  },
  {
    id: "s1",
    person: "Sefa Demir",
    team: "Data",
    status: "Active",
    salary: 160,
    started: "2023-04-03",
  },
  {
    id: "m1",
    person: "Marta Kowalski",
    team: "Core",
    status: "Active",
    salary: 141,
    started: "2022-09-19",
  },
  {
    id: "t1",
    person: "Tobias Lind",
    team: "Data",
    status: "Active",
    salary: 152,
    started: "2021-08-30",
  },
  {
    id: "a1",
    person: "Amara Diallo",
    team: "Platform",
    status: "On leave",
    salary: 165,
    started: "2020-02-17",
  },
];

const COLUMNS: ColumnDef<StaffRow>[] = [
  { key: "person", header: "Person", accessor: (row) => row.person },
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "status", header: "Status", accessor: (row) => row.status },
  {
    key: "salary",
    header: "Salary",
    accessor: (row) => row.salary,
    editable: true,
    editor: "number",
    editValue: (row) => String(row.salary),
  },
  { key: "started", header: "Started", accessor: (row) => row.started },
];

const TEAM_FILTER: FilterDef<StaffRow> = {
  key: "team",
  type: "multiSelect",
  label: "Team",
  options: ["Core", "Platform", "Data"].map((team) => ({
    value: team,
    label: team,
  })),
  getValue: (row) => row.team,
};

/** The row and column the scripted examples name. */
const DEMO_CONTEXT = { namedRowKey: "p1", pinnedColumnKey: "person" };

/**
 * The suggestions, built from the scenarios so a chip can never offer a
 * prompt the resolver does not know.
 */
const SUGGESTIONS: AssistantSuggestion[] = DEMO_SCENARIOS.map((scenario) => ({
  id: scenario.prompt,
  // The card leads with what it does; the prompt it will send reads as the
  // supporting line, so a reader knows exactly what is about to be asked.
  title: scenario.title,
  description: scenario.prompt,
  kind: scenario.kind,
  prompt: scenario.prompt,
  requires: scenario.requires,
}));

/**
 * Below this a floating window would sit on top of the table rather than
 * beside it, so the demo starts closed and shows its launcher instead. The
 * widget makes its own presentation choice; this only decides what a first
 * paint looks like.
 */
const NARROW = "(max-width: 900px)";

function readRtl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("dir") === "rtl";
}

function applyCell(
  rows: readonly StaffRow[],
  row: StaffRow,
  key: string,
  value: unknown
): StaffRow[] {
  return rows.map((current) =>
    current.id === row.id && key === "salary"
      ? { ...current, salary: Number(value) }
      : current
  );
}

function applyBatch(
  rows: readonly StaffRow[],
  edits: readonly BatchRowEdit<StaffRow>[]
): StaffRow[] {
  return rows.map((current) => {
    const hit = edits.find((edit) => edit.rowId === current.id);
    const salary = hit?.patch.salary;
    return salary === undefined
      ? current
      : { ...current, salary: Number(salary) };
  });
}

/**
 * Read a team out of whatever filter model the caller sent.
 *
 * `view.setFilters` takes `{ filters: unknown }` on purpose — the filter model
 * belongs to the application, so the capability cannot describe it and a model
 * has nothing to aim at. A real one sends what looks reasonable: this page has
 * seen both `{ team: ["Core"] }` from its own scripted transport and
 * `[{ column: "team", operator: "equals", value: "Core" }]` from gpt-5.4-nano.
 * A host that understands only its own spelling reports the filter as applied
 * and then shows every row, which is worse than refusing it.
 */
function teamFromFilters(filters: unknown): string | undefined {
  const asString = (value: unknown): string | undefined => {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return undefined;
  };
  if (Array.isArray(filters)) {
    for (const entry of filters) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const column = record.column ?? record.key ?? record.field;
      if (column !== "team") continue;
      const value = asString(record.value);
      if (value !== undefined) return value;
    }
    return undefined;
  }
  if (!filters || typeof filters !== "object") return undefined;
  const record = filters as Record<string, unknown>;
  // A model that wrapped the model in another `filters` key.
  if (record.filters !== undefined) return teamFromFilters(record.filters);
  return asString(record.team);
}

/** Which optional capabilities the reader has turned on. */
interface DemoToggles {
  readonly editing: boolean;
  readonly grouping: boolean;
  readonly rowPinning: boolean;
  readonly columnPinning: boolean;
}

const INITIAL_TOGGLES: DemoToggles = {
  editing: true,
  grouping: true,
  rowPinning: true,
  columnPinning: true,
};

export function AiDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const [rtl, setRtl] = useState(readRtl);
  const [toggles, setToggles] = useState<DemoToggles>(INITIAL_TOGGLES);
  const [rows, setRows] = useState<StaffRow[]>(() => [...SEED]);
  const [teamFilter, setTeamFilter] = useState<string | undefined>();
  const [pinnedRowIds, setPinnedRowIds] = useState<RowPinState>({
    top: [],
    bottom: [],
  });
  const [session, setSession] = useState<AgentSession | null>(null);
  // Held in state on purpose: the table republishes it whenever its wiring
  // changes, and that is what makes the developer panel re-read after the
  // table settles rather than one render early.
  const [manifest, setManifest] = useState<AgentManifest | null>(null);
  // An app defaults the panel closed; this demo IS the panel, so it opens —
  // except on a narrow viewport, where opening a modal sheet over the table
  // before the reader asks for it would hide the thing they came to see.
  const [panelOpen, setPanelOpen] = useState(
    () => !(typeof window !== "undefined" && window.matchMedia(NARROW).matches)
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState("view.setFilters");
  const contextRef = useRef(DEMO_CONTEXT);

  const scripted = useMemo(() => demoTransport(() => contextRef.current), []);
  const [connection, setConnection] = useState<AiConnection>(() => ({
    mode: "simulated",
    transport: scripted,
    key: "demo",
  }));

  const Table = kitTable<StaffRow>(adapter);
  const factories =
    AI_KIT_FEATURES[adapter as AiKitKey] ?? AI_KIT_FEATURES.mantine;
  const Assistant = factories.Assistant;

  const features = useMemo((): TableFeature<StaffRow>[] => {
    const next: TableFeature<StaffRow>[] = [
      factories.filters([TEAM_FILTER]),
      tableAgent({
        tableId: "ai-assistant-demo",
        writePolicy: "allow",
        approval: toggles.editing ? "writes" : "never",
        commit: "stage",
        columns: {
          person: { type: "string", writable: false },
          team: { type: "string", writable: false },
          status: { type: "string", writable: false },
          salary: { type: "number", writable: toggles.editing },
          started: { type: "string", writable: false },
        },
        apply: {
          setFilters: (filters) => setTeamFilter(teamFromFilters(filters)),
        },
        bridge: { attach: setSession, publish: setManifest },
      }),
    ];
    // Grouping is composed with the column the agent groups by; the agent
    // still turns it on and off through `view.setGroupBy`.
    if (toggles.grouping) next.push(factories.grouping("team"));
    if (toggles.rowPinning) {
      next.push(
        factories.rowPinning({
          pinnedRowIds,
          onPinnedRowIdsChange: setPinnedRowIds,
        })
      );
    }
    if (toggles.columnPinning) next.push(factories.columnMenu());
    if (!toggles.editing) return next;
    return [
      factories.approval(),
      factories.editing((row: StaffRow, key: string, value: unknown) => {
        setRows((current) => applyCell(current, row, key, value));
      }),
      factories.batch((edits: readonly BatchRowEdit<StaffRow>[]) => {
        setRows((current) => applyBatch(current, edits));
      }),
      factories.history(),
      factories.undo(),
      ...next,
    ];
  }, [factories, pinnedRowIds, toggles]);

  const assistant = useTableAssistant({
    session: session ?? undefined,
    transport: connection.transport,
    // Only a genuine transport swap re-establishes the conversation.
    transportKey: connection.key,
    suggestions: SUGGESTIONS,
    open: panelOpen,
    onOpenChange: setPanelOpen,
  });

  // The star prompt is a centered modal on a timer, and landing it over an
  // open conversation — or mid-turn, or over a pending approval — interrupts
  // the one workflow this page exists to show. It waits instead.
  const conversationBusy =
    assistant.open ||
    assistantIsBusy(assistant.status) ||
    assistant.status === "awaiting-approval";
  useEffect(() => {
    setAssistantActive(conversationBusy);
    return () => {
      setAssistantActive(false);
    };
  }, [conversationBusy]);

  // The table never owns the data, so a filter the agent asks for is applied
  // here to the rows the table is given. Memoised because a fresh array on
  // every render would bump the revision and republish the manifest — a loop.
  const visibleRows = useMemo(
    () => (teamFilter ? rows.filter((row) => row.team === teamFilter) : rows),
    [rows, teamFilter]
  );

  const reset = useCallback(() => {
    // Explicit, and it cancels work in flight rather than leaving a reply to
    // land on a table that no longer matches it.
    assistant.stop();
    assistant.clear();
    setToggles(INITIAL_TOGGLES);
    setRows([...SEED]);
    setTeamFilter(undefined);
    setPinnedRowIds({ top: [], bottom: [] });
  }, [assistant]);

  const catalog = manifest ? (session?.catalog() ?? []) : [];
  const selected = catalog.some((entry) => entry.key === selectedKey)
    ? selectedKey
    : (catalog[0]?.key ?? "");
  const schema = selected
    ? JSON.stringify(session?.describe(selected).input, null, 2)
    : "";

  const toggle = (key: keyof DemoToggles) => () => {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="ai-demo" dir={rtl ? "rtl" : "ltr"} data-adapter={adapter}>
      <header className="ai-demo__hero">
        <p className="ai-demo__lede">
          The application decides what the assistant may do and what it may save
          — the table asks, your code answers.
        </p>
        <div className="ai-demo__controls">
          <nav
            className="ai-demo__kits"
            aria-label="Same demo in another adapter"
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
          {/* Which conversation this is, without opening anything: "Ready"
              alone would let a scripted demo read as a live model. */}
          <span
            className="ai-demo__mode"
            data-mode={connection.mode}
            data-testid="ai-demo-mode"
          >
            {connection.mode === "simulated"
              ? "Simulated demo"
              : "Connected backend"}
          </span>
          <button
            type="button"
            className="ai-demo__options-trigger"
            data-testid="ai-demo-options"
            aria-expanded={demoOpen}
            onClick={() => {
              setDemoOpen((current) => !current);
            }}
          >
            Demo options
          </button>
        </div>
        {demoOpen ? (
          <div
            className="ai-demo__options"
            role="group"
            aria-label="Demo options"
          >
            <div className="ai-demo__toggles">
              {(
                [
                  ["editing", "Allow editing"],
                  ["grouping", "Grouping"],
                  ["rowPinning", "Row pinning"],
                  ["columnPinning", "Column pinning"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`seg__btn${toggles[key] ? " is-on" : ""}`}
                  aria-pressed={toggles[key]}
                  data-testid={`ai-toggle-${key}`}
                  onClick={toggle(key)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className={`seg__btn${rtl ? " is-on" : ""}`}
                aria-pressed={rtl}
                onClick={() => {
                  setRtl((current) => !current);
                }}
              >
                RTL
              </button>
              <button
                type="button"
                className="seg__btn"
                data-testid="ai-reset"
                onClick={reset}
              >
                Reset demo
              </button>
            </div>
            <p className="ai-demo__note">
              Turn a feature off and the assistant offers less: it only ever
              suggests what this table currently wires. Grouping is the clearest
              case — a grouped table is a nested list, so the row pinning
              examples leave while it is on.
            </p>
          </div>
        ) : null}
      </header>

      <div className="ai-demo__stage">
        <KitProvider kit={adapter} dark={dark} dir={rtl ? "rtl" : "ltr"}>
          <Suspense fallback={<DemoFallback />}>
            <Table
              data={visibleRows}
              columns={COLUMNS}
              rowKey={(row: StaffRow) => row.id}
              urlSync={false}
              features={features}
              classNames={kitClassNames(adapter)}
            />
          </Suspense>
          <div className="ai-demo__assistant">
            <Assistant
              assistant={assistant}
              labels={defaultLabels}
              open={assistant.open}
              onOpenChange={assistant.setOpen}
              presentation="floating"
              note={
                connection.mode === "simulated"
                  ? "These examples are scripted. Connect a backend to ask anything."
                  : undefined
              }
              onSettings={() => {
                setSettingsOpen((current) => !current);
              }}
            />
            {settingsOpen ? (
              <AiConnectionSettings
                session={session}
                connection={connection}
                demoTransport={scripted}
                onChange={setConnection}
                onClose={() => {
                  setSettingsOpen(false);
                }}
              />
            ) : null}
          </div>
        </KitProvider>
      </div>

      <details
        className="ai-demo__dev"
        open={detailsOpen}
        onToggle={(event) => {
          setDetailsOpen(event.currentTarget.open);
        }}
      >
        <summary>Developer inspector</summary>
        <p className="ai-demo__revision">
          Revision {manifest?.viewRevision ?? "—"} · {catalog.length}{" "}
          capabilities wired
        </p>
        <div className="ai-demo__keys" data-testid="ai-catalog">
          {catalog.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={`ai-demo__key${entry.key === selected ? " is-on" : ""}`}
              aria-pressed={entry.key === selected}
              onClick={() => {
                setSelectedKey(entry.key);
              }}
            >
              View schema: {entry.key}
            </button>
          ))}
        </div>
        <pre
          className="ai-demo__schema"
          data-testid="ai-schema"
          aria-label={`Schema for ${selected || "no capability"}`}
        >
          {schema || "Attach a session to inspect a capability."}
        </pre>
        <p className="ai-demo__refs">
          <a href={`${DOCS_URL}ai-http/`}>Connect a backend</a>
          <a href={`${DOCS_URL}ai-integrations/`}>AI integrations</a>
          <a href={`${DOCS_URL}agent-capabilities/`}>Capabilities</a>
        </p>
      </details>
    </div>
  );
}
