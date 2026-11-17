/**
 * A table you talk to: the kit's own assistant panel over the shipped
 * controller, the same staff, scripted examples, options, connection and
 * developer inspector as every other framework's AI page. What this page
 * adds is a transport: the fixed script, or the reader's own endpoint.
 */
import type {
  AgentContextInputs,
  AgentManifest,
  AgentSession,
  AlwaysAllowedState,
} from "@adapttable/ai";
import { injectTableAssistant, tableAgent } from "@adapttable/ai-angular";
import type {
  AdaptTableFeature,
  ColumnDef,
  TableAssistantProps,
} from "@adapttable/angular";
import type { AgentApprovalPending } from "@adapttable/angular/adapter";
import type {
  ApprovalPresentation,
  BatchRowEdit,
  RowPinState,
} from "@adapttable/core";
import { getLabels } from "@adapttable/i18n";
import { Component, computed, inject, signal } from "@angular/core";

import {
  scriptedConnection,
  type ShowcaseConnection,
} from "../aiBackendConnection";
import { builtAdapters } from "../matrix/content";
import {
  actionApprovals,
  AI_DEMO_MEDIA,
  AI_PAGE_TEXT,
  type ApprovalOverride,
  capabilityApproval,
  CONNECT_ACTION,
  type DemoContextProfile,
  type DemoEditingMode,
  type DemoFeatureKey,
  type DemoToggles,
  INITIAL_TOGGLES,
  markOnLeaveAction,
  raiseTeamCapability,
  STAFF,
  STAFF_FILTERS,
  STAFF_PAGE_LIMIT,
  staffAgentColumns,
  staffColumns,
  staffContext,
  staffKey,
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
} from "../shared/aiDemo";
import { demoTransport, UNSUPPORTED_REPLIES } from "../shared/aiScenario";
import { AiSalaryCell, AiTextCell } from "./aiCells";
import { AiConnectDialog } from "./aiConnectDialog";
import { AiContextInspector } from "./aiContextInspector";
import { AiDemoOptions, type ApprovalAnswer } from "./aiDemoOptions";
import { AdaptShowcaseAssistant, AdaptShowcaseTable } from "./kitComponents";
import { SHOWCASE_KIT } from "./showcaseKit";

/** The feature body mounted by the Angular matrix's AI page. */
@Component({
  selector: "adapt-showcase-ai",
  imports: [
    AdaptShowcaseTable,
    AdaptShowcaseAssistant,
    AiConnectDialog,
    AiContextInspector,
    AiDemoOptions,
  ],
  templateUrl: "./aiBody.html",
})
export class AiBody {
  readonly kit = inject(SHOWCASE_KIT);
  readonly text = AI_PAGE_TEXT;
  readonly watch = WATCH_TEXT;
  readonly media = AI_DEMO_MEDIA;
  readonly pageLimit = STAFF_PAGE_LIMIT;
  readonly rtl = signal(staffStartsRtl());
  readonly locale = computed(() => (this.rtl() ? "ar" : "en"));
  readonly dir = computed(() => (this.rtl() ? "rtl" : "ltr"));
  readonly labels = computed(() => getLabels(this.locale()));
  readonly toggles = signal<DemoToggles>(INITIAL_TOGGLES);
  readonly rows = signal<readonly StaffRow[]>([...STAFF]);
  readonly rowKey = staffKey;
  readonly pinnedRowIds = signal<RowPinState>({ top: [], bottom: [] });
  readonly session = signal<AgentSession | undefined>(undefined);
  readonly manifest = signal<AgentManifest | undefined>(undefined);
  private readonly alwaysAllowed = signal<AlwaysAllowedState | undefined>(
    undefined
  );
  readonly pending = signal<AgentApprovalPending | null>(null);
  /** Bumped by Reset: remounting is how the table returns to its defaults. */
  readonly tableGeneration = signal(0);
  readonly panelOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly demoOpen = signal(false);
  readonly presentation = signal<ApprovalPresentation>("widget");
  readonly commit = signal<"stage" | "immediate">("stage");
  private readonly actionPolicy = signal<
    Readonly<Record<string, ApprovalOverride>>
  >({});
  readonly excluded = signal<readonly string[]>([]);
  readonly contextProfile = signal<DemoContextProfile>("full");
  readonly webmcp = signal(false);
  readonly webmcpNames = signal<readonly string[]>([]);
  readonly webmcpOffered = webmcpAvailable();
  private readView: (() => AgentContextInputs) | undefined;

  readonly columns = computed((): ColumnDef<StaffRow>[] =>
    staffColumns(this.locale()).map((column) => {
      if (column.key === "salary") return { ...column, cell: AiSalaryCell };
      // Staff read as text: the showcase's people cells read a different row.
      if (column.key === "person" || column.key === "status")
        return { ...column, cell: AiTextCell };
      return column;
    })
  );
  readonly scripted = demoTransport(() =>
    staffContext(this.rows(), this.locale())
  );
  readonly connection = signal<ShowcaseConnection>(
    scriptedConnection(this.scripted)
  );

  // Stable for the page's life, so the session is not rebuilt on every edit.
  private readonly raiseTeam = raiseTeamCapability(({ team, percent }) => {
    this.rows.update((rows) => staffRaised(rows, team, percent));
    return this.rows().filter((row) => row.team === team).length;
  });

  readonly features = computed((): readonly AdaptTableFeature[] => {
    const current = this.toggles();
    const canWrite = current.editingMode !== "off";
    // Staging needs the batch save path; cell and row modes apply on approve.
    const effectiveCommit =
      current.editingMode === "batch" ? this.commit() : "immediate";
    const next: AdaptTableFeature[] = [
      this.kit.filters<StaffRow>([...STAFF_FILTERS]),
      // Selection and one bulk action over it, through the kit's own bar.
      this.kit.bulkActions([
        markOnLeaveAction(
          this.locale(),
          effectiveCommit === "immediate",
          (keys) => {
            this.rows.update((rows) => staffOnLeave(rows, keys));
          }
        ),
      ]),
      tableAgent({
        tableId: "ai-assistant-demo",
        writePolicy: "allow",
        approval: {
          policy: "writes",
          presentation: this.presentation(),
          // Only the one write a reader can reasonably agree to once;
          // deleting is never on this list, and the neutral rule refuses it.
          alwaysAllow: ["staff.raiseTeam"],
        },
        excludeCapabilities: this.excluded(),
        capabilityApproval: capabilityApproval(this.actionPolicy()),
        capabilities: [this.raiseTeam],
        ...(this.webmcp()
          ? {
              webmcp: {
                onRegister: (names: readonly string[]) => {
                  this.webmcpNames.set(names);
                },
              },
            }
          : {}),
        commit: effectiveCommit,
        columns: staffAgentColumns(this.locale(), canWrite),
        apply: {
          // Disposable data, and the one destructive capability on the page:
          // Reset and a refresh bring the rows back, and it always asks first.
          deleteRows: (keys: readonly string[]) => {
            this.rows.update((rows) => staffWithout(rows, keys));
          },
        },
        bridge: {
          attach: (session: AgentSession) => {
            this.session.set(session);
          },
          publish: (manifest: AgentManifest) => {
            this.manifest.set(manifest);
          },
          viewInputs: (read: () => AgentContextInputs) => {
            this.readView = read;
          },
          approvals: (pending: AgentApprovalPending | null) => {
            this.pending.set(pending);
          },
          alwaysAllowed: (state: AlwaysAllowedState) => {
            this.alwaysAllowed.set(state);
          },
        },
      }),
    ];
    // Off by default so this is a normal table until something groups it.
    if (current.grouping) next.push(this.kit.groupingPanel<StaffRow>());
    if (current.rowPinning)
      next.push(
        this.kit.rowPinning({
          pinnedRowIds: this.pinnedRowIds,
          onPinnedRowIdsChange: (value: RowPinState) => {
            this.pinnedRowIds.set(value);
          },
        })
      );
    if (current.columnPinning) next.push(this.kit.columnMenu());
    if (current.editingMode === "off") return next;
    const editing: AdaptTableFeature[] = [
      this.kit.agentApproval(),
      this.kit.editHistory(),
      this.kit.undoRedoButtons(),
    ];
    if (current.editingMode === "cell")
      editing.push(
        this.kit.editing<StaffRow>((row, key, value) => {
          this.rows.update((rows) => staffWithCell(rows, row, key, value));
        })
      );
    if (current.editingMode === "row")
      editing.push(
        this.kit.rowEditing<StaffRow>((row, patch) => {
          this.rows.update((rows) => staffWithRow(rows, row, patch));
        })
      );
    if (current.editingMode === "batch")
      editing.push(
        this.kit.batchEditing<StaffRow>(
          (edits: readonly BatchRowEdit<StaffRow>[]) => {
            this.rows.update((rows) => staffWithBatch(rows, edits));
          }
        )
      );
    return [...editing, ...next];
  });

  /** The live view a turn is judged against, as the table publishes it. */
  readonly liveViewInputs = (): AgentContextInputs => this.readView?.() ?? {};

  readonly assistant = injectTableAssistant(
    computed(() => {
      const alwaysAllowed = this.alwaysAllowed();
      return {
        session: this.session(),
        contextInputs: this.liveViewInputs,
        transport: this.connection().transport,
        // Only a genuine transport swap re-establishes the conversation.
        transportKey: this.connection().key,
        // The backend keeps the thread; a turn carries the reader's message.
        conversation: 0,
        suggestions: staffSuggestions(this.locale()),
        awaitingApproval: this.pending() !== null,
        ...(alwaysAllowed ? { alwaysAllow: alwaysAllowed } : {}),
        open: this.panelOpen(),
        onOpenChange: (open: boolean) => {
          this.panelOpen.set(open);
        },
      };
    })
  );

  readonly assistantProps = computed((): TableAssistantProps => ({
    assistant: this.assistant(),
    approval: this.pending(),
    open: this.panelOpen(),
    onOpenChange: (open) => {
      this.panelOpen.set(open);
    },
    presentation: "floating",
    className: ["unstyled", "aria"].includes(this.kit.key)
      ? "mx-assistant-layout mx-native-assistant"
      : "mx-assistant-layout",
    dir: this.dir(),
    labels: this.labels(),
    greeting: "",
    onSettings: () => {
      this.settingsOpen.set(true);
    },
    // A reply the script could not carry out offers the way past it.
    messageAction: (message) =>
      Object.values(UNSUPPORTED_REPLIES).includes(message.text)
        ? {
            label: CONNECT_ACTION[this.locale()],
            onRun: () => {
              this.settingsOpen.set(true);
            },
          }
        : undefined,
  }));

  readonly approvals = computed(() =>
    actionApprovals(this.manifest()?.capabilities ?? [], this.actionPolicy())
  );

  readonly sourceIsBackend = computed(
    () => this.connection().mode !== "simulated" || this.settingsOpen()
  );

  readonly otherKits = builtAdapters("angular").map((other) => ({
    key: other.key,
    label: other.label,
    href: `../../${other.key}/ai/#ai-demo`,
  }));

  answerApproval(answer: ApprovalAnswer): void {
    this.actionPolicy.update((current) =>
      withApprovalOverride(current, answer.key, answer.next)
    );
  }

  toggle(key: DemoFeatureKey): void {
    this.toggles.update((current) => ({ ...current, [key]: !current[key] }));
  }

  editingMode(mode: DemoEditingMode): void {
    this.toggles.update((current) => ({ ...current, editingMode: mode }));
  }

  toggleOffer(key: string): void {
    this.excluded.update((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key]
    );
  }

  /** Cancel work in flight and put the data, settings and table back. */
  reset(): void {
    const assistant = this.assistant();
    assistant.stop();
    assistant.clear();
    this.toggles.set(INITIAL_TOGGLES);
    this.rows.set([...STAFF]);
    this.pinnedRowIds.set({ top: [], bottom: [] });
    this.tableGeneration.update((current) => current + 1);
  }

  chooseSource(next: "simulated" | "backend"): void {
    if (next === "backend") {
      this.settingsOpen.set(true);
      return;
    }
    this.settingsOpen.set(false);
    if (this.connection().mode !== "simulated")
      this.connection.set(scriptedConnection(this.scripted));
  }
}
