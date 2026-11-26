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
import "./assistantShowcase.css";

import type {
  AgentContextInputs,
  AgentManifest,
  AgentSession,
  AlwaysAllowedState,
} from "@adapttable/ai";
import { tableAgent, useTableAssistant } from "@adapttable/ai-react";
import type { ApprovalPresentation, RowPinState } from "@adapttable/core";
import { getLabels } from "@adapttable/i18n/catalog";
import type { BatchRowEdit, CellProps, ColumnDef } from "@adapttable/react";
import {
  type AgentApprovalPending,
  assistantIsBusy,
} from "@adapttable/react/adapter";
import type { TableFeature } from "@adapttable/react/features";
import {
  type ReactElement,
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
import { scriptedConnection } from "./aiBackendConnection";
import { AiContextInspector } from "./AiContextInspector";
import {
  AiDemoOptions,
  type DemoActionApprovalControl,
  type DemoExclusion,
} from "./AiDemoOptions";
import { AI_KIT_FEATURES, type AiKitKey } from "./aiKitFeatures";
import { setAssistantActive } from "./assistantActivity";
import type { Locale } from "./data";
import { DemoFallback, Segmented } from "./kitDemos";
import { kitClassNames, KitProvider, kitTable } from "./kitProviders";
import { builtAdapters, docsUrl } from "./matrix/content";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import {
  actionApprovals,
  AI_DEMO_MEDIA,
  AI_PAGE_TEXT,
  type ApprovalOverride,
  capabilityApproval,
  CONNECT_ACTION,
  DEMO_EXCLUSIONS,
  DEMO_FEATURES,
  type DemoContextProfile,
  type DemoFeatureKey,
  type DemoToggles,
  INITIAL_TOGGLES,
  markOnLeaveAction,
  raiseTeamCapability,
  salaryText,
  STAFF,
  STAFF_FILTERS,
  STAFF_PAGE_LIMIT,
  staffAgentColumns,
  staffColumns,
  staffContext,
  staffOnLeave,
  staffRaised,
  type StaffRow,
  staffStartsRtl,
  staffSuggestions,
  staffWithBatch,
  staffWithCell,
  staffWithout,
  staffWithRow,
  WATCH_TEXT,
  webmcpAvailable,
  withApprovalOverride,
} from "./shared/aiDemo";
import {
  type DemoContext,
  demoTransport,
  UNSUPPORTED_REPLIES,
} from "./shared/aiScenario";

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

/**
 * Display only. `accessor` stays the number, so sorting, grouping and the
 * average still work on the value rather than on the text around it.
 */
function SalaryCell({ row }: CellProps<StaffRow>): ReactElement {
  return <>{salaryText(row.salary)}</>;
}

/** The staff columns, with this page's money cell. */
function columnsFor(locale: Locale): ColumnDef<StaffRow>[] {
  return staffColumns(locale).map((column) =>
    column.key === "salary" ? { ...column, Cell: SalaryCell } : column
  );
}

/**
 * Visible player, no autoload: the poster is what paints, and the file
 * waits until the reader presses play (`preload="none"`).
 */
function AiDemoWatch(): ReactElement {
  return (
    <figure className="ai-demo__watch">
      <figcaption>{WATCH_TEXT.caption}</figcaption>
      <video
        className="ai-demo__watch-video"
        src={`${AI_DEMO_MEDIA}/demo.mp4`}
        poster={`${AI_DEMO_MEDIA}/poster.png`}
        controls
        playsInline
        preload="none"
        width={960}
        height={474}
      >
        <track
          kind="captions"
          src={`${AI_DEMO_MEDIA}/captions.vtt`}
          srcLang="en"
          label="English"
        />
      </video>
      <p className="ai-demo__watch-note">{WATCH_TEXT.note}</p>
    </figure>
  );
}

export function AiDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const [rtl, setRtl] = useState(staffStartsRtl);
  const [toggles, setToggles] = useState<DemoToggles>(INITIAL_TOGGLES);
  const [rows, setRows] = useState<StaffRow[]>(() => [...STAFF]);
  // What the custom capability counts against. The updater below has to stay
  // pure — React may call it twice — so the count is read from here instead.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [pinnedRowIds, setPinnedRowIds] = useState<RowPinState>({
    top: [],
    bottom: [],
  });
  const [session, setSession] = useState<AgentSession | null>(null);
  // Bumped by Reset. Remounting is how the table returns to its defaults.
  const [tableGeneration, setTableGeneration] = useState(0);
  const [alwaysAllowed, setAlwaysAllowed] = useState<AlwaysAllowedState | null>(
    null
  );
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
  const suggestions = useMemo(() => staffSuggestions(locale), [locale]);
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
    Readonly<Record<string, ApprovalOverride>>
  >({});
  // The drawer's per-action answers in the shape the table takes them: one
  // entry per key the reader actually decided, so "use the default" is an
  // absence rather than a third policy the table has to interpret.
  const actionApproval = useMemo(
    () => capabilityApproval(actionPolicy),
    [actionPolicy]
  );

  // Which capabilities the agent is offered, and how much it is told. Both
  // are the reader's to change in the drawer, and both visibly change what the
  // assistant suggests — which is the point of putting them there.
  const [excluded, setExcluded] = useState<readonly string[]>([]);
  // The library's own default, so the demo shows what a host gets without
  // tuning anything — column descriptions included, which is how the salary
  // column gets to say it counts thousands.
  const [contextProfile, setContextProfile] =
    useState<DemoContextProfile>("full");
  const [webmcp, setWebmcp] = useState(false);
  const [webmcpNames, setWebmcpNames] = useState<readonly string[]>([]);
  // Rebuilt from the live rows every render, so the bulk example proposes
  // the salaries actually on screen rather than the ones it was written
  // against.
  const contextRef = useRef<DemoContext>(staffContext(STAFF, "en"));
  // Deliberately not one of the rows the edit examples name, and read from the
  // live rows: once it has been deleted the example stops being offered rather
  // than proposing a row the table no longer has.
  contextRef.current = staffContext(rows, locale);

  const scripted = useMemo(() => demoTransport(() => contextRef.current), []);
  const [connection, setConnection] = useState<AiConnection>(() =>
    scriptedConnection(scripted)
  );

  const Table = kitTable<StaffRow>(adapter);
  const factories =
    AI_KIT_FEATURES[adapter as AiKitKey] ?? AI_KIT_FEATURES.mantine;
  const Assistant = factories.Assistant;

  // Stable across renders so the session is not rebuilt on every keystroke,
  // and closed over `setRows` rather than over the rows themselves.
  const raiseTeam = useMemo(
    () =>
      raiseTeamCapability(({ team, percent }) => {
        setRows((current) => staffRaised(current, team, percent));
        return rowsRef.current.filter((row) => row.team === team).length;
      }),
    []
  );

  const features = useMemo((): TableFeature<StaffRow>[] => {
    const canWrite = toggles.editingMode !== "off";
    // Staging needs the batch save path. Cell and row modes apply on approve,
    // so the reader is not dropped into always-open fields.
    const effectiveCommit =
      toggles.editingMode === "batch" ? commit : "immediate";
    const next: TableFeature<StaffRow>[] = [
      factories.filters([...STAFF_FILTERS]),
      // Selection and one bulk action over it, through the kit's own bar. The
      // agent reaches it as `bulkAction.markOnLeave` after `view.setSelection`.
      factories.bulkActions([
        markOnLeaveAction(locale, effectiveCommit === "immediate", (keys) => {
          setRows((current) => staffOnLeave(current, keys));
        }),
      ]),
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
          // A cell edit enumerates rows, so the control never appears for it;
          // the team raise is one operation, which is the shape a reader can
          // agree to once. Deleting is never on this list, and the neutral
          // rule refuses it even if it were.
          alwaysAllow: ["staff.raiseTeam"],
        },
        // What the reader took away in the drawer. The table's own controls
        // are untouched: a person can still filter a table whose agent may not.
        excludeCapabilities: excluded,
        // Per-action answers from the same drawer. "Use the default" leaves the
        // key out entirely, so the table's shared policy decides.
        capabilityApproval: actionApproval,
        // One custom write, wired to this page's own data the same way every
        // other write here is: the table asks, the host does.
        capabilities: [raiseTeam],
        ...(webmcp ? { webmcp: { onRegister: setWebmcpNames } } : {}),
        commit: effectiveCommit,
        // Labels in the reader's language: a column id is a developer key,
        // and the approval review shows this name rather than that key.
        columns: staffAgentColumns(locale, canWrite),
        apply: {
          // `setFilters` is deliberately NOT overridden. Filtering is view
          // state the table already owns — team, status and started are
          // declared to its own filter feature, and the popover drives
          // them. Applying the agent's filter beside that would leave the
          // reader looking at a filtered table whose Filters panel is empty
          // and whose Clear all does nothing.
          //
          // Disposable data, and deliberately destructive: this is the one
          // capability on the page that removes something. The rows are seeded
          // in memory, so Reset and an ordinary page refresh both bring them
          // back — and `rows.delete` is `destructive`, which the neutral rule
          // refuses to let `alwaysAllow` wave through, so the reader is asked
          // every time however the drawer is set.
          deleteRows: (keys) => {
            setRows((current) => staffWithout(current, keys));
          },
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
          // The panel sits beside the table, so what a reader waved through
          // has to be handed out the same way — otherwise "Always allow" is
          // a decision with no way back.
          alwaysAllowed: setAlwaysAllowed,
        },
      }),
    ];
    // Off by default so this is a normal table. The panel is what offers
    // setGroupBy — empty, not already grouped by team, so the model still
    // has a grouping to apply. A static `grouping("team")` both starts
    // grouped and reimposes that key on every render.
    if (toggles.grouping) next.push(factories.grouping());
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
          setRows((current) => staffWithCell(current, row, key, value));
        })
      );
    }
    if (toggles.editingMode === "row") {
      editing.push(
        factories.rowEditing((row: StaffRow, patch) => {
          setRows((current) => staffWithRow(current, row, patch));
        })
      );
    }
    if (toggles.editingMode === "batch") {
      editing.push(
        factories.batch((edits: readonly BatchRowEdit<StaffRow>[]) => {
          setRows((current) => staffWithBatch(current, edits));
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
    raiseTeam,
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
    // The backend keeps the thread against its session, so a turn carries the
    // reader's own message and nothing else. The panel still shows all of it:
    // this is what travels, not what is read.
    conversation: 0,
    suggestions,
    awaitingApproval,
    ...(alwaysAllowed ? { alwaysAllow: alwaysAllowed } : {}),
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

  const reset = useCallback(() => {
    // Explicit, and it cancels work in flight rather than leaving a reply to
    // land on a table that no longer matches it.
    assistant.stop();
    assistant.clear();
    setToggles(INITIAL_TOGGLES);
    setRows([...STAFF]);
    setPinnedRowIds({ top: [], bottom: [] });
    // The view belongs to the table, so Reset puts the table back rather than
    // reaching in to unset filter, sort, search and grouping one at a time —
    // and a filter the assistant applied is the table's, like any other.
    setTableGeneration((current) => current + 1);
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
      DEMO_EXCLUSIONS.map((entry) => ({
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
  const webmcpOffered = useMemo(webmcpAvailable, []);

  // Generated from what the table actually wires right now, so turning a
  // feature off removes its row rather than leaving a dead switch behind.
  // Labels come from each capability's own presentation; the key is never
  // shown to a reader.
  const answerApproval = useCallback(
    (key: string, next: ApprovalOverride | "inherit") => {
      setActionPolicy((current) => withApprovalOverride(current, key, next));
    },
    []
  );
  const approvals: readonly DemoActionApprovalControl[] = useMemo(
    () =>
      actionApprovals(manifest?.capabilities ?? [], actionPolicy).map(
        (action) => ({
          ...action,
          onChange: (next: ApprovalOverride | "inherit") => {
            answerApproval(action.key, next);
          },
        })
      ),
    [manifest, actionPolicy, answerApproval]
  );

  const toggle = (key: DemoFeatureKey) => () => {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div id="ai-demo" className="ai-demo" data-adapter={adapter}>
      {/* The demo's own controls stay in the page's language: they are
          scaffolding around the table, not part of it, and flipping English
          prose leaves its punctuation on the wrong side. Only the table and
          the assistant follow the RTL switch. */}
      <header className="ai-demo__hero">
        <p className="ai-demo__lede">{AI_PAGE_TEXT.lede}</p>
        <AiDemoWatch />
        <div className="ai-demo__controls">
          <nav className="ai-demo__kits" aria-label={AI_PAGE_TEXT.otherKits}>
            {builtAdapters().map((kit) => (
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
              label={AI_PAGE_TEXT.source}
              value={
                connection.mode !== "simulated" || settingsOpen
                  ? "backend"
                  : "simulated"
              }
              onChange={(next) => {
                if (next === "simulated") {
                  setSettingsOpen(false);
                  if (connection.mode !== "simulated") {
                    setConnection(scriptedConnection(scripted));
                  }
                  return;
                }
                setSettingsOpen(true);
              }}
              options={[
                {
                  value: "simulated",
                  label: AI_PAGE_TEXT.simulated,
                  testId: "ai-demo-mode",
                },
                {
                  value: "backend",
                  label:
                    connection.mode === "simulated"
                      ? AI_PAGE_TEXT.tryReal
                      : AI_PAGE_TEXT.connected,
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
              {AI_PAGE_TEXT.options}
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
          features={DEMO_FEATURES.map((feature) => ({
            ...feature,
            on: toggles[feature.key],
            onChange: toggle(feature.key),
          }))}
          actions={approvals}
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
          webmcpAvailable={webmcpOffered}
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
              key={tableGeneration}
              data={rows}
              columns={columns}
              labels={labels}
              dir={rtl ? "rtl" : "ltr"}
              rowKey={(row: StaffRow) => row.id}
              urlSync={false}
              {...(toggles.paging
                ? {
                    defaults: { limit: STAFF_PAGE_LIMIT },
                    paginationMode: "paged" as const,
                  }
                : {})}
              features={features}
              classNames={kitClassNames(adapter)}
            />
          </Suspense>
          <div className="ai-demo__assistant">
            <Assistant
              className={
                ["tailwind", "shadcn", "unstyled"].includes(adapter)
                  ? "mx-assistant-layout mx-native-assistant"
                  : "mx-assistant-layout"
              }
              assistant={assistant}
              labels={labels}
              dir={rtl ? "rtl" : "ltr"}
              // The panel's own words are the page's, not the conversation's:
              // a backend never sees them, so a model answering the reader's
              // first line writes its own opener under an identical one. Empty
              // is a host saying nothing, and the reader's message is the
              // first thing in the panel.
              greeting=""
              open={assistant.open}
              onOpenChange={assistant.setOpen}
              presentation="floating"
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
          docsUrl={docsUrl}
        />
      </InspectorPortal>
    </div>
  );
}
