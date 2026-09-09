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
  type ApprovalPresentation,
  type FilterDef,
  type RowPinState,
} from "@adapttable/core";
import { getLabels } from "@adapttable/i18n";
import type { BatchRowEdit, ColumnDef } from "@adapttable/react";
import {
  type AgentApprovalPending,
  assistantIsBusy,
} from "@adapttable/react/adapter";
import type { TableFeature } from "@adapttable/react/features";
import {
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { AiConnectDialog, type AiConnection } from "./AiBackendConnect";
import { AiDemoOptions, type DemoActionApproval } from "./AiDemoOptions";
import { AI_KIT_FEATURES, type AiKitKey } from "./aiKitFeatures";
import { DEMO_SCENARIOS, demoTransport, UNSUPPORTED_REPLY } from "./aiScenario";
import { setAssistantActive } from "./assistantActivity";
import type { Locale } from "./data";
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

/**
 * The column headings, in the demo's two languages.
 *
 * Switching to RTL switches the language with it, the way the Feature Lab
 * does: a mirrored table still labelled in English shows the layout but not
 * what a reader in Arabic actually sees.
 */
/** The capabilities that write, and therefore have an approval to set. */
const WRITE_CAPABILITIES = new Set([
  "edit.cells",
  "rows.add",
  "rows.delete",
  "rows.reorder",
]);

/** Reader-facing names for the built-in writes. */
const CAPABILITY_LABELS: Record<string, string> = {
  "edit.cells": "Edit a cell",
  "rows.add": "Add rows",
  "rows.delete": "Delete rows",
  "rows.reorder": "Move a row",
};

/** Set or clear one action's approval override. */
function overrideFor(
  key: string,
  next: "required" | "automatic" | "inherit"
): (
  current: Readonly<Record<string, "required" | "automatic">>
) => Readonly<Record<string, "required" | "automatic">> {
  return (current) => {
    if (next !== "inherit") return { ...current, [key]: next };
    const rest = { ...current };
    delete rest[key];
    return rest;
  };
}

/**
 * Put the inspector in the documentation column, where a reader looking at
 * the integration example will find it.
 *
 * It is rendered by the demo because that is where the live session is, and
 * portaled rather than duplicated: a second inspector would be a second
 * subscription reporting a slightly different moment. When the page has no
 * slot — a standalone mount — it stays where it was rendered.
 */
function InspectorPortal({ children }: Readonly<{ children: ReactNode }>) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById("mx-inspector-slot"));
  }, []);
  return slot ? createPortal(children, slot) : <>{children}</>;
}

const COLUMN_HEADERS: Record<Locale, Record<string, string>> = {
  en: {
    person: "Person",
    team: "Team",
    status: "Status",
    salary: "Salary",
    started: "Started",
  },
  ar: {
    person: "الشخص",
    team: "الفريق",
    status: "الحالة",
    salary: "الراتب",
    started: "تاريخ البدء",
  },
};

function columnsFor(locale: Locale): ColumnDef<StaffRow>[] {
  const header = COLUMN_HEADERS[locale];
  return [
    { key: "person", header: header.person, accessor: (row) => row.person },
    { key: "team", header: header.team, accessor: (row) => row.team },
    { key: "status", header: header.status, accessor: (row) => row.status },
    {
      key: "salary",
      header: header.salary,
      accessor: (row) => row.salary,
      editable: true,
      editor: "number",
      aggregatable: true,
      editValue: (row) => String(row.salary),
    },
    { key: "started", header: header.started, accessor: (row) => row.started },
  ];
}

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

/**
 * The suggestions, built from the scenarios so a chip can never offer a
 * prompt the resolver does not know.
 */
/**
 * The example cards, in the reader's language.
 *
 * The id stays the English prompt so a card keeps its identity across a
 * language change, while the text it shows and the text it SENDS are both
 * the locale's — and the scenario matcher recognises either, deliberately.
 */
function suggestionsFor(locale: Locale): AssistantSuggestion[] {
  return DEMO_SCENARIOS.map((scenario) => {
    const text =
      locale === "ar" && scenario.ar
        ? { title: scenario.ar.title, prompt: scenario.ar.prompt }
        : { title: scenario.title, prompt: scenario.prompt };
    return {
      id: scenario.prompt,
      // The card leads with what it does; the prompt it will send reads as
      // the supporting line, so a reader knows exactly what is about to be
      // asked.
      title: text.title,
      description: text.prompt,
      kind: scenario.kind,
      prompt: text.prompt,
      requires: scenario.requires,
    };
  });
}

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
  // Closed on arrival, at every width. The window is nonmodal and floats over
  // the page, so opening it on load drops it on top of the introduction the
  // reader is still reading. The launcher says what it is; they open it.
  const [panelOpen, setPanelOpen] = useState(false);
  const locale: Locale = rtl ? "ar" : "en";
  const labels = useMemo(() => getLabels(locale), [locale]);
  const columns = useMemo(() => columnsFor(locale), [locale]);
  const suggestions = useMemo(() => suggestionsFor(locale), [locale]);
  // The live approval, handed over by the bridge. The panel sits beside the
  // table rather than inside it, so this is how it reaches the conversation.
  const [pendingApproval, setPendingApproval] =
    useState<AgentApprovalPending | null>(null);
  const awaitingApproval = pendingApproval !== null;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  // Where a waiting change is reviewed, and whether an approved one is
  // staged or saved. Both are the reader's to change on camera, which is why
  // they are state here rather than constants in the agent options.
  const [presentation, setPresentation] =
    useState<ApprovalPresentation>("widget");
  const [commit, setCommit] = useState<"stage" | "immediate">("stage");
  // Per-action overrides, keyed by capability. Absent means inherited.
  const [actionPolicy, setActionPolicy] = useState<
    Readonly<Record<string, "required" | "automatic">>
  >({});
  const [selectedKey, setSelectedKey] = useState("view.setFilters");
  // Rebuilt from the live rows every render, so the bulk example proposes
  // the salaries actually on screen rather than the ones it was written
  // against.
  const contextRef = useRef({
    namedRowKey: "p1",
    pinnedColumnKey: "person",
    coreTeam: [] as { rowKey: string; salary: number }[],
  });
  contextRef.current = {
    namedRowKey: "p1",
    pinnedColumnKey: "person",
    coreTeam: rows
      .filter((row) => row.team === "Core")
      .map((row) => ({ rowKey: row.id, salary: row.salary })),
  };

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
        // Policy and presentation are separate questions, and the drawer
        // asks them separately. Turning cell editing off removes the action
        // rather than the approval, so the policy stays as the reader set it.
        approval: { policy: "writes", presentation },
        commit,
        // Labels in the reader's language: a column id is a developer key,
        // and the approval review shows this name rather than that key.
        columns: {
          person: {
            type: "string",
            writable: false,
            label: COLUMN_HEADERS[locale].person,
          },
          team: {
            type: "string",
            writable: false,
            label: COLUMN_HEADERS[locale].team,
          },
          status: {
            type: "string",
            writable: false,
            label: COLUMN_HEADERS[locale].status,
          },
          salary: {
            type: "number",
            writable: toggles.editing,
            label: COLUMN_HEADERS[locale].salary,
          },
          started: {
            type: "string",
            writable: false,
            label: COLUMN_HEADERS[locale].started,
          },
        },
        apply: {
          setFilters: (filters) => setTeamFilter(teamFromFilters(filters)),
        },
        bridge: {
          attach: setSession,
          publish: setManifest,
          // `execute` does not return while the approval sits above the
          // table, so without this the panel would show "Working…" at a
          // turn that is actually waiting on the reader.
          approvals: setPendingApproval,
        },
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
  }, [factories, pinnedRowIds, toggles, presentation, commit, locale]);

  const assistant = useTableAssistant({
    session: session ?? undefined,
    transport: connection.transport,
    // Only a genuine transport swap re-establishes the conversation.
    transportKey: connection.key,
    suggestions,
    awaitingApproval,
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

  // Generated from what the table actually wires right now, so turning a
  // feature off removes its row rather than leaving a dead switch behind.
  // Labels come from each capability's own presentation; the key is never
  // shown to a reader.
  const actionApprovals: readonly DemoActionApproval[] = useMemo(() => {
    const writes = (manifest?.capabilities ?? []).filter((key) =>
      WRITE_CAPABILITIES.has(key)
    );
    return writes.map((key) => {
      const override = Object.hasOwn(actionPolicy, key)
        ? actionPolicy[key]
        : undefined;
      return {
        key,
        label: CAPABILITY_LABELS[key] ?? key,
        policy: override ?? ("required" as const),
        inherited: override === undefined,
        onChange: (next: "required" | "automatic" | "inherit") =>
          setActionPolicy(overrideFor(key, next)),
      };
    });
  }, [manifest, actionPolicy]);

  const toggle = (key: keyof DemoToggles) => () => {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="ai-demo" data-adapter={adapter}>
      {/* The demo's own controls stay in the page's language: they are
          scaffolding around the table, not part of it, and flipping English
          prose leaves its punctuation on the wrong side. Only the table and
          the assistant follow the RTL switch. */}
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
          {/* The way out of the script, offered where the script is named. */}
          <button
            type="button"
            className="ai-demo__real"
            data-testid="ai-demo-try-real"
            onClick={() => {
              setSettingsOpen(true);
            }}
          >
            Try it for real
          </button>
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
        <AiDemoOptions
          open={demoOpen}
          onClose={() => {
            setDemoOpen(false);
          }}
          features={[
            {
              key: "editing",
              label: "Cell editing",
              help: "Whether the table accepts edits at all. With this off, no edit action exists to approve.",
              on: toggles.editing,
              onChange: toggle("editing"),
            },
            {
              key: "grouping",
              label: "Grouping",
              help: "A grouped table is a nested list, so the row pinning examples leave while it is on.",
              on: toggles.grouping,
              onChange: toggle("grouping"),
            },
            {
              key: "rowPinning",
              label: "Row pinning",
              help: "Lets the assistant pin a row above the scrolled body.",
              on: toggles.rowPinning,
              onChange: toggle("rowPinning"),
            },
            {
              key: "columnPinning",
              label: "Column pinning",
              help: "Lets the assistant pin a column to either edge.",
              on: toggles.columnPinning,
              onChange: toggle("columnPinning"),
            },
          ]}
          actions={actionApprovals}
          presentation={presentation}
          onPresentation={setPresentation}
          commit={commit}
          onCommit={setCommit}
          rtl={rtl}
          onRtl={setRtl}
          onReset={reset}
        />
      </header>

      {/* The direction lives here, on the table and the overlays it owns.
          The documentation around it, the integration code, the reference and
          the developer inspector are the page's, not the table's, and a
          mirrored code block is unreadable. */}
      <div className="ai-demo__stage" dir={rtl ? "rtl" : "ltr"}>
        <KitProvider kit={adapter} dark={dark} dir={rtl ? "rtl" : "ltr"}>
          <Suspense fallback={<DemoFallback />}>
            <Table
              data={visibleRows}
              columns={columns}
              labels={labels}
              rowKey={(row: StaffRow) => row.id}
              urlSync={false}
              features={features}
              classNames={kitClassNames(adapter)}
            />
          </Suspense>
          <div className="ai-demo__assistant">
            <Assistant
              assistant={assistant}
              labels={labels}
              open={assistant.open}
              onOpenChange={assistant.setOpen}
              presentation="floating"
              note={
                connection.mode === "simulated"
                  ? "These examples are scripted. Connect a backend to ask anything."
                  : undefined
              }
              approval={pendingApproval}
              onSettings={() => {
                setSettingsOpen(true);
              }}
              messageAction={(message) =>
                message.text === UNSUPPORTED_REPLY
                  ? {
                      label: "Connect a backend",
                      onRun: () => {
                        setSettingsOpen(true);
                      },
                    }
                  : undefined
              }
            />
            <AiConnectDialog
              open={settingsOpen}
              session={session}
              connection={connection}
              demoTransport={scripted}
              onChange={setConnection}
              onClose={() => {
                setSettingsOpen(false);
              }}
            />
          </div>
        </KitProvider>
      </div>

      {/* One inspector, rendered here where the live session is, shown in the
          documentation column beside the integration example. A portal rather
          than a second copy: two would mean two subscriptions to one session. */}
      <InspectorPortal>
        <section className="ai-demo__dev" data-testid="ai-inspector">
          <h3 className="ai-demo__dev-title">Developer inspector</h3>
          <p className="ai-demo__revision">
            Revision {manifest?.viewRevision ?? "—"} · {catalog.length}{" "}
            capabilities wired
          </p>
          <label className="ai-demo__pick">
            <span>Capability</span>
            <select
              data-testid="ai-catalog"
              value={selected}
              onChange={(event) => {
                setSelectedKey(event.target.value);
              }}
            >
              {catalog.length === 0 ? (
                <option value="">No capabilities wired</option>
              ) : null}
              {catalog.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.key}
                </option>
              ))}
            </select>
          </label>
          <div className="ai-demo__schema-wrap">
            <button
              type="button"
              className="ai-demo__copy"
              data-testid="ai-schema-copy"
              onClick={() => {
                void navigator.clipboard?.writeText(schema);
              }}
            >
              Copy
            </button>
            <pre
              className="ai-demo__schema"
              data-testid="ai-schema"
              dir="ltr"
              aria-label={`Schema for ${selected || "no capability"}`}
            >
              {schema || "Attach a session to inspect a capability."}
            </pre>
          </div>
          <p className="ai-demo__refs">
            <a href={`${DOCS_URL}ai-http/`}>Connect a backend</a>
            <a href={`${DOCS_URL}ai-integrations/`}>AI integrations</a>
            <a href={`${DOCS_URL}agent-capabilities/`}>Capabilities</a>
          </p>
        </section>
      </InspectorPortal>
    </div>
  );
}
