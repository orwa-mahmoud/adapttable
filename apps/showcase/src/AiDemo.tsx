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
  AgentContextInputs,
  AgentManifest,
  AgentSession,
  AssistantSuggestion,
} from "@adapttable/ai";
import { tableAgent, useTableAssistant } from "@adapttable/ai-react";
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
import { AiContextInspector } from "./AiContextInspector";
import {
  AiDemoOptions,
  type DemoActionApproval,
  type DemoContextProfile,
  type DemoEditingMode,
  type DemoExclusion,
} from "./AiDemoOptions";
import {
  applyHostFilters,
  hostFiltersFromBag,
  type HostFilterState,
} from "./aiHostFilters";
import { AI_KIT_FEATURES, type AiKitKey } from "./aiKitFeatures";
import {
  DEMO_SCENARIOS,
  type DemoContext,
  demoTransport,
  UNSUPPORTED_REPLIES,
} from "./aiScenario";
import { setAssistantActive } from "./assistantActivity";
import type { Locale } from "./data";
import { DemoFallback, Segmented } from "./kitDemos";
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

/** The action offered beside a reply the demo could not carry out. */
const CONNECT_ACTION: Record<Locale, string> = {
  en: "Connect a backend",
  ar: "اربط خادمًا",
};

/** What the demo says about itself, in the language it is being read in. */
const DEMO_NOTE: Record<Locale, string> = {
  en: "These examples are scripted. Connect a backend to ask anything.",
  ar: "هذه الأمثلة نصية مُعدّة مسبقًا. اربط خادمًا لطرح أي سؤال.",
};

function columnsFor(locale: Locale): ColumnDef<StaffRow>[] {
  const header = COLUMN_HEADERS[locale];
  return [
    {
      key: "person",
      sortable: true,
      header: header.person,
      accessor: (row) => row.person,
      editable: true,
    },
    {
      key: "team",
      sortable: true,
      header: header.team,
      accessor: (row) => row.team,
      editable: true,
    },
    {
      key: "status",
      sortable: true,
      header: header.status,
      accessor: (row) => row.status,
      editable: true,
    },
    {
      key: "salary",
      sortable: true,
      header: header.salary,
      accessor: (row) => row.salary,
      editable: true,
      editor: "number",
      aggregatable: true,
      editValue: (row) => String(row.salary),
    },
    {
      key: "started",
      sortable: true,
      header: header.started,
      accessor: (row) => row.started,
      editable: true,
    },
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

const STATUS_FILTER: FilterDef<StaffRow> = {
  key: "status",
  type: "multiSelect",
  label: "Status",
  options: ["Active", "On leave"].map((status) => ({
    value: status,
    label: status,
  })),
  getValue: (row) => row.status,
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

function applyField(row: StaffRow, key: string, value: unknown): StaffRow {
  if (key === "salary") return { ...row, salary: Number(value) };
  if (
    key === "person" ||
    key === "team" ||
    key === "status" ||
    key === "started"
  ) {
    return { ...row, [key]: String(value) };
  }
  return row;
}

function applyPatch(
  row: StaffRow,
  patch: Readonly<Record<string, unknown>>
): StaffRow {
  return Object.entries(patch).reduce(
    (current, [key, value]) => applyField(current, key, value),
    row
  );
}

function applyCell(
  rows: readonly StaffRow[],
  row: StaffRow,
  key: string,
  value: unknown
): StaffRow[] {
  return rows.map((current) =>
    current.id === row.id ? applyField(current, key, value) : current
  );
}

function applyRow(
  rows: readonly StaffRow[],
  row: StaffRow,
  patch: Readonly<Record<string, unknown>>
): StaffRow[] {
  return rows.map((current) =>
    current.id === row.id ? applyPatch(current, patch) : current
  );
}

function applyBatch(
  rows: readonly StaffRow[],
  edits: readonly BatchRowEdit<StaffRow>[]
): StaffRow[] {
  return rows.map((current) => {
    const hit = edits.find((edit) => edit.rowId === current.id);
    return hit ? applyPatch(current, hit.patch) : current;
  });
}

/** Which optional capabilities the reader has turned on. */
interface DemoToggles {
  readonly editingMode: DemoEditingMode;
  readonly grouping: boolean;
  readonly rowPinning: boolean;
  readonly columnPinning: boolean;
}

const INITIAL_TOGGLES: DemoToggles = {
  editingMode: "cell",
  grouping: false,
  rowPinning: true,
  columnPinning: true,
};

export function AiDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const [rtl, setRtl] = useState(readRtl);
  const [toggles, setToggles] = useState<DemoToggles>(INITIAL_TOGGLES);
  const [rows, setRows] = useState<StaffRow[]>(() => [...SEED]);
  const [hostFilters, setHostFilters] = useState<HostFilterState>({});
  const [pinnedRowIds, setPinnedRowIds] = useState<RowPinState>({
    top: [],
    bottom: [],
  });
  const [session, setSession] = useState<AgentSession | null>(null);
  // Handed over once by `tableAgent`, which publishes it inside the table —
  // below this component, so feature state cannot reach it from here. Held in
  // a ref because it is stable and calling it is what makes it current.
  const viewInputs = useRef<(() => AgentContextInputs) | null>(null);
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
  // The drawer's per-action answers in the shape the table takes them: one
  // entry per key the reader actually decided, so "use the default" is an
  // absence rather than a third policy the table has to interpret.
  const actionApproval = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(actionPolicy).map(([key, policy]) => [
          key,
          { approval: { policy } },
        ])
      ),
    [actionPolicy]
  );

  // Which capabilities the agent is offered, and how much it is told. Both
  // are the reader's to change in the drawer, and both visibly change what the
  // assistant suggests — which is the point of putting them there.
  const [excluded, setExcluded] = useState<readonly string[]>([]);
  const [contextProfile, setContextProfile] =
    useState<DemoContextProfile>("compact");
  const [webmcp, setWebmcp] = useState(false);
  const [webmcpNames, setWebmcpNames] = useState<readonly string[]>([]);
  // Rebuilt from the live rows every render, so the bulk example proposes
  // the salaries actually on screen rather than the ones it was written
  // against.
  const contextRef = useRef<DemoContext>({
    locale: "en",
    namedRowKey: "p1",
    pinnedColumnKey: "person",
    coreTeam: [],
  });
  contextRef.current = {
    locale,
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
    const canWrite = toggles.editingMode !== "off";
    const next: TableFeature<StaffRow>[] = [
      factories.filters([TEAM_FILTER, STATUS_FILTER]),
      tableAgent({
        tableId: "ai-assistant-demo",
        writePolicy: "allow",
        // Policy and presentation are separate questions, and the drawer
        // asks them separately. Turning cell editing off removes the action
        // rather than the approval, so the policy stays as the reader set it.
        approval: {
          policy: "writes",
          presentation,
          // Opt-in, and only for the one write where waving it through is a
          // reasonable thing for a reader to want. Deleting is never on this
          // list, and the neutral rule refuses it even if it were.
          alwaysAllow: ["edit.cells"],
        },
        // What the reader took away in the drawer. The table's own controls
        // are untouched: a person can still filter a table whose agent may not.
        excludeCapabilities: excluded,
        // Per-action answers from the same drawer. "Use the default" leaves the
        // key out entirely, so the table's shared policy decides.
        capabilityApproval: actionApproval,
        ...(webmcp ? { webmcp: { onRegister: setWebmcpNames } } : {}),
        // Staging needs the batch save path. Cell and row modes apply on
        // approve, so the reader is not dropped into always-open fields.
        commit: toggles.editingMode === "batch" ? commit : "immediate",
        // Labels in the reader's language: a column id is a developer key,
        // and the approval review shows this name rather than that key.
        columns: {
          person: {
            type: "string",
            writable: canWrite,
            label: COLUMN_HEADERS[locale].person,
          },
          team: {
            type: "string",
            writable: canWrite,
            label: COLUMN_HEADERS[locale].team,
          },
          status: {
            type: "string",
            writable: canWrite,
            label: COLUMN_HEADERS[locale].status,
          },
          salary: {
            type: "number",
            writable: canWrite,
            label: COLUMN_HEADERS[locale].salary,
          },
          started: {
            type: "string",
            writable: canWrite,
            label: COLUMN_HEADERS[locale].started,
          },
        },
        apply: {
          setFilters: (filters) => setHostFilters(hostFiltersFromBag(filters)),
        },
        bridge: {
          attach: setSession,
          publish: setManifest,
          // The inspector reads the same live view a turn is judged against,
          // rather than keeping a second copy of page, sort and filters.
          viewInputs: (read) => {
            viewInputs.current = read;
          },
          // `execute` does not return while the approval sits above the
          // table, so without this the panel would show "Working…" at a
          // turn that is actually waiting on the reader.
          approvals: setPendingApproval,
        },
      }),
    ];
    // Off by default so this is a normal table. Group by team is an
    // assistant example once this feature is on.
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
    if (toggles.editingMode === "off") return next;
    const editing: TableFeature<StaffRow>[] = [
      factories.approval(),
      factories.history(),
      factories.undo(),
    ];
    if (toggles.editingMode === "cell") {
      editing.push(
        factories.editing((row: StaffRow, key: string, value: unknown) => {
          setRows((current) => applyCell(current, row, key, value));
        })
      );
    }
    if (toggles.editingMode === "row") {
      editing.push(
        factories.rowEditing((row: StaffRow, patch) => {
          setRows((current) => applyRow(current, row, patch));
        })
      );
    }
    if (toggles.editingMode === "batch") {
      editing.push(
        factories.batch((edits: readonly BatchRowEdit<StaffRow>[]) => {
          setRows((current) => applyBatch(current, edits));
        })
      );
    }
    return [...editing, ...next];
  }, [
    factories,
    pinnedRowIds,
    toggles,
    presentation,
    commit,
    locale,
    excluded,
    actionApproval,
    webmcp,
  ]);

  // The same live view the assistant's turns are judged against, published by
  // `tableAgent`. Both the inspector and the assistant read it rather than
  // keeping a copy, so what the inspector shows is what a backend receives —
  // and the assistant can tell a turn that moved the table from one that did
  // not, which is what puts an undo beside the reply.
  const liveViewInputs = useCallback(() => viewInputs.current?.() ?? {}, []);

  const assistant = useTableAssistant({
    session: session ?? undefined,
    contextInputs: liveViewInputs,
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

  // Kit switches are a full page load. `#ai-demo` is not in the static HTML,
  // so the browser cannot scroll to it until this mount.
  useEffect(() => {
    if (window.location.hash !== "#ai-demo") return;
    document.getElementById("ai-demo")?.scrollIntoView();
  }, []);

  // The table never owns the data, so a filter the agent asks for is applied
  // here to the rows the table is given. Memoised because a fresh array on
  // every render would bump the revision and republish the manifest — a loop.
  const visibleRows = useMemo(
    () => applyHostFilters(rows, hostFilters),
    [rows, hostFilters]
  );

  const reset = useCallback(() => {
    // Explicit, and it cancels work in flight rather than leaving a reply to
    // land on a table that no longer matches it.
    assistant.stop();
    assistant.clear();
    setToggles(INITIAL_TOGGLES);
    setRows([...SEED]);
    setHostFilters({});
    setPinnedRowIds({ top: [], bottom: [] });
  }, [assistant]);

  /** Take one capability away from the agent, or give it back. */
  const toggleOffer = useCallback((key: string) => {
    setExcluded((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key]
    );
  }, []);

  // Three the reader can see the consequence of: the suggestion disappears,
  // and the table's own control keeps working exactly as it did.
  const exclusions: readonly DemoExclusion[] = useMemo(
    () =>
      [
        {
          key: "view.setFilters",
          label: "Filter the table",
          help: "Off: the filter suggestions go, and you can still filter it yourself.",
        },
        {
          key: "rows.read",
          label: "Read rows",
          help: "Off: it can change the view but can no longer answer questions about what is in it.",
        },
        {
          key: "edit.cells",
          label: "Edit cells",
          help: "Off: no write ever reaches the approval, because none is ever proposed.",
        },
      ].map((entry) => ({
        ...entry,
        offered: !excluded.includes(entry.key),
        onChange: () => {
          toggleOffer(entry.key);
        },
      })),
    [excluded, toggleOffer]
  );

  // Read once: whether this browser has the API at all decides whether the
  // switch is a choice or an explanation.
  const webmcpAvailable = useMemo(
    () =>
      typeof document !== "undefined" &&
      "modelContext" in (document as { modelContext?: unknown }),
    []
  );

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

  const toggle = (key: "grouping" | "rowPinning" | "columnPinning") => () => {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div id="ai-demo" className="ai-demo" data-adapter={adapter}>
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
                href={`../../${kit.key}/ai/#ai-demo`}
                aria-current={kit.key === adapter ? "page" : undefined}
              >
                {kit.label}
              </a>
            ))}
          </nav>
          <div className="ai-demo__toolbar">
            <Segmented
              label="Conversation source"
              value={
                connection.mode !== "simulated" || settingsOpen
                  ? "backend"
                  : "simulated"
              }
              onChange={(next) => {
                if (next === "simulated") {
                  setSettingsOpen(false);
                  if (connection.mode !== "simulated") {
                    setConnection({
                      mode: "simulated",
                      transport: scripted,
                      key: "demo",
                    });
                  }
                  return;
                }
                setSettingsOpen(true);
              }}
              options={[
                {
                  value: "simulated",
                  label: "Simulated demo",
                  testId: "ai-demo-mode",
                },
                {
                  value: "backend",
                  label:
                    connection.mode === "simulated"
                      ? "Try it for real"
                      : "Connected",
                  testId: "ai-demo-try-real",
                },
              ]}
            />
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
        </div>
        <AiDemoOptions
          open={demoOpen}
          onClose={() => {
            setDemoOpen(false);
          }}
          editingMode={toggles.editingMode}
          onEditingMode={(next) => {
            setToggles((current) => ({ ...current, editingMode: next }));
          }}
          features={[
            {
              key: "grouping",
              label: "Group by team",
              help: "Optional. Off by default so this starts as a normal table. A grouped table is a nested list, so row-pin examples leave while it is on.",
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
          contextProfile={contextProfile}
          onContextProfile={setContextProfile}
          exclusions={exclusions}
          webmcp={webmcp}
          onWebmcp={setWebmcp}
          webmcpAvailable={webmcpAvailable}
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
              dir={rtl ? "rtl" : "ltr"}
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
              dir={rtl ? "rtl" : "ltr"}
              open={assistant.open}
              onOpenChange={assistant.setOpen}
              presentation="floating"
              note={
                connection.mode === "simulated" ? DEMO_NOTE[locale] : undefined
              }
              approval={pendingApproval}
              onSettings={() => {
                setSettingsOpen(true);
              }}
              messageAction={(message) =>
                Object.values(UNSUPPORTED_REPLIES).includes(message.text)
                  ? {
                      label: CONNECT_ACTION[locale],
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
        <AiContextInspector
          session={session}
          manifest={manifest}
          contextInputs={liveViewInputs}
          profile={contextProfile}
          webmcpNames={webmcpNames}
          docsUrl={DOCS_URL}
        />
      </InspectorPortal>
    </div>
  );
}
