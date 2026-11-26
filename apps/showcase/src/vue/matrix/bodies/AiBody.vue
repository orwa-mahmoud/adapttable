<script setup lang="ts">
/**
 * A table you talk to: the kit's own assistant panel over the shipped
 * controller, the same staff, scripted examples, options, connection and
 * developer inspector as every other framework's AI page. What this page
 * adds is a transport: the fixed script, or the reader's own endpoint.
 */
import "../../../assistantShowcase.css";

import type {
  AgentContextInputs,
  AgentManifest,
  AgentSession,
  AlwaysAllowedState,
} from "@adapttable/ai";
import { tableAgent, useTableAssistant } from "@adapttable/ai-vue";
import type {
  ApprovalPresentation,
  BatchRowEdit,
  RowPinState,
} from "@adapttable/core";
import { getLabels } from "@adapttable/i18n/catalog";
import type { AgentApprovalPending, TableFeature } from "@adapttable/vue";
import { computed, shallowRef } from "vue";

import {
  scriptedConnection,
  type ShowcaseConnection,
} from "../../../aiBackendConnection";
import { builtAdapters, pathOf } from "../../../matrix/content";
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
  salaryText,
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
} from "../../../shared/aiDemo";
import { demoTransport, UNSUPPORTED_REPLIES } from "../../../shared/aiScenario";
import { vueHref } from "../routes";
import { useShowcaseKit } from "../showcaseKit";
import AiConnectDialog from "./ai/AiConnectDialog.vue";
import AiContextInspector from "./ai/AiContextInspector.vue";
import AiDemoOptions from "./ai/AiDemoOptions.vue";

const kit = useShowcaseKit();
const rtl = shallowRef(staffStartsRtl());
const locale = computed(() => (rtl.value ? "ar" : "en"));
const dir = computed(() => (rtl.value ? "rtl" : "ltr"));
const labels = computed(() => getLabels(locale.value));
const toggles = shallowRef<DemoToggles>(INITIAL_TOGGLES);
const rows = shallowRef<readonly StaffRow[]>([...STAFF]);
const pinnedRowIds = shallowRef<RowPinState>({ top: [], bottom: [] });
const session = shallowRef<AgentSession>();
const manifest = shallowRef<AgentManifest>();
const alwaysAllowed = shallowRef<AlwaysAllowedState>();
const pending = shallowRef<AgentApprovalPending | null>(null);
// Bumped by Reset: remounting is how the table returns to its defaults.
const tableGeneration = shallowRef(0);
const panelOpen = shallowRef(false);
const settingsOpen = shallowRef(false);
const demoOpen = shallowRef(false);
const presentation = shallowRef<ApprovalPresentation>("widget");
const commit = shallowRef<"stage" | "immediate">("stage");
const actionPolicy = shallowRef<Readonly<Record<string, ApprovalOverride>>>({});
const excluded = shallowRef<readonly string[]>([]);
const contextProfile = shallowRef<DemoContextProfile>("full");
const webmcp = shallowRef(false);
const webmcpNames = shallowRef<readonly string[]>([]);
const webmcpOffered = webmcpAvailable();
let readView: (() => AgentContextInputs) | undefined;

const columns = computed(() =>
  staffColumns(locale.value).map((column) =>
    column.key === "salary"
      ? {
          ...column,
          cell: ({ row }: { row: StaffRow }) => salaryText(row.salary),
        }
      : column
  )
);
const suggestions = computed(() => staffSuggestions(locale.value));
const scripted = demoTransport(() => staffContext(rows.value, locale.value));
const connection = shallowRef<ShowcaseConnection>(scriptedConnection(scripted));

// Stable for the page's life, so the session is not rebuilt on every edit.
const raiseTeam = raiseTeamCapability(({ team, percent }) => {
  rows.value = staffRaised(rows.value, team, percent);
  return rows.value.filter((row) => row.team === team).length;
});

const features = computed((): TableFeature<StaffRow>[] => {
  const current = toggles.value;
  const canWrite = current.editingMode !== "off";
  // Staging needs the batch save path; cell and row modes apply on approve.
  const effectiveCommit =
    current.editingMode === "batch" ? commit.value : "immediate";
  const next: TableFeature<StaffRow>[] = [
    kit.filters<StaffRow>([...STAFF_FILTERS]),
    // Selection and one bulk action over it, through the kit's own bar.
    kit.bulkActions([
      markOnLeaveAction(
        locale.value,
        effectiveCommit === "immediate",
        (keys) => {
          rows.value = staffOnLeave(rows.value, keys);
        }
      ),
    ]),
    tableAgent({
      tableId: "ai-assistant-demo",
      writePolicy: "allow",
      approval: {
        policy: "writes",
        presentation: presentation.value,
        // Only the one write a reader can reasonably agree to once; deleting
        // is never on this list, and the neutral rule refuses it anyway.
        alwaysAllow: ["staff.raiseTeam"],
      },
      excludeCapabilities: excluded.value,
      capabilityApproval: capabilityApproval(actionPolicy.value),
      capabilities: [raiseTeam],
      ...(webmcp.value
        ? {
            webmcp: {
              onRegister: (names: readonly string[]) => {
                webmcpNames.value = names;
              },
            },
          }
        : {}),
      commit: effectiveCommit,
      columns: staffAgentColumns(locale.value, canWrite),
      apply: {
        // Disposable data, and the one destructive capability on the page:
        // Reset and a refresh bring the rows back, and it always asks first.
        deleteRows: (keys: readonly string[]) => {
          rows.value = staffWithout(rows.value, keys);
        },
      },
      bridge: {
        attach: (value: AgentSession) => {
          session.value = value;
        },
        publish: (value: AgentManifest) => {
          manifest.value = value;
        },
        viewInputs: (read: () => AgentContextInputs) => {
          readView = read;
        },
        approvals: (value: AgentApprovalPending | null) => {
          pending.value = value;
        },
        alwaysAllowed: (value: AlwaysAllowedState) => {
          alwaysAllowed.value = value;
        },
      },
    }),
  ];
  // Off by default so this is a normal table until something groups it.
  if (current.grouping) next.push(kit.groupingPanel<StaffRow>());
  if (current.rowPinning)
    next.push(
      kit.rowPinning({
        pinnedRowIds: () => pinnedRowIds.value,
        onPinnedRowIdsChange: (value: RowPinState) => {
          pinnedRowIds.value = value;
        },
      })
    );
  if (current.columnPinning) next.push(kit.columnMenu());
  if (current.editingMode === "off") return next;
  const editing: TableFeature<StaffRow>[] = [
    kit.agentApproval(),
    kit.editHistory(),
    kit.undoRedoButtons(),
  ];
  if (current.editingMode === "cell")
    editing.push(
      kit.editing<StaffRow>((row, key, value) => {
        rows.value = staffWithCell(rows.value, row, key, value);
      })
    );
  if (current.editingMode === "row")
    editing.push(
      kit.rowEditing<StaffRow>((row, patch) => {
        rows.value = staffWithRow(rows.value, row, patch);
      })
    );
  if (current.editingMode === "batch")
    editing.push(
      kit.batchEditing<StaffRow>((edits: readonly BatchRowEdit<StaffRow>[]) => {
        rows.value = staffWithBatch(rows.value, edits);
      })
    );
  return [...editing, ...next];
});

/** The live view a turn is judged against, as the table publishes it. */
const liveViewInputs = (): AgentContextInputs => readView?.() ?? {};

const assistant = useTableAssistant(() => ({
  session: session.value,
  contextInputs: liveViewInputs,
  transport: connection.value.transport,
  // Only a genuine transport swap re-establishes the conversation.
  transportKey: connection.value.key,
  // The backend keeps the thread; a turn carries the reader's own message.
  conversation: 0,
  suggestions: suggestions.value,
  approval: pending.value,
  ...(alwaysAllowed.value ? { alwaysAllow: alwaysAllowed.value } : {}),
  open: panelOpen.value,
  onOpenChange: (value: boolean) => {
    panelOpen.value = value;
  },
}));

const approvals = computed(() =>
  actionApprovals(manifest.value?.capabilities ?? [], actionPolicy.value)
);

function answerApproval(key: string, next: ApprovalOverride | "inherit"): void {
  actionPolicy.value = withApprovalOverride(actionPolicy.value, key, next);
}

function toggle(key: DemoFeatureKey): void {
  toggles.value = { ...toggles.value, [key]: !toggles.value[key] };
}

function editingMode(mode: DemoEditingMode): void {
  toggles.value = { ...toggles.value, editingMode: mode };
}

function toggleOffer(key: string): void {
  excluded.value = excluded.value.includes(key)
    ? excluded.value.filter((entry) => entry !== key)
    : [...excluded.value, key];
}

/** Cancel work in flight and put the data, settings and table back. */
function reset(): void {
  assistant.stop();
  assistant.clear();
  toggles.value = INITIAL_TOGGLES;
  rows.value = [...STAFF];
  pinnedRowIds.value = { top: [], bottom: [] };
  tableGeneration.value += 1;
}

const sourceIsBackend = computed(
  () => connection.value.mode !== "simulated" || settingsOpen.value
);

function chooseSource(next: "simulated" | "backend"): void {
  if (next === "backend") {
    settingsOpen.value = true;
    return;
  }
  settingsOpen.value = false;
  if (connection.value.mode !== "simulated")
    connection.value = scriptedConnection(scripted);
}

/** A reply the script could not carry out offers the way past it. */
function messageAction(message: { readonly text: string }) {
  return Object.values(UNSUPPORTED_REPLIES).includes(message.text)
    ? {
        label: CONNECT_ACTION[locale.value],
        onRun: () => {
          settingsOpen.value = true;
        },
      }
    : undefined;
}

const otherKits = builtAdapters("vue").map((other) => ({
  key: other.key,
  label: other.label,
  href: vueHref(pathOf(other) + "/ai") + "#ai-demo",
}));
</script>

<template>
  <div id="ai-demo" class="ai-demo" :data-adapter="kit.key">
    <header class="ai-demo__hero">
      <p class="ai-demo__lede">{{ AI_PAGE_TEXT.lede }}</p>
      <figure class="ai-demo__watch">
        <figcaption>{{ WATCH_TEXT.caption }}</figcaption>
        <video
          class="ai-demo__watch-video"
          :src="`${AI_DEMO_MEDIA}/demo.mp4`"
          :poster="`${AI_DEMO_MEDIA}/poster.png`"
          controls
          playsinline
          preload="none"
          width="960"
          height="474"
        >
          <track
            kind="captions"
            :src="`${AI_DEMO_MEDIA}/captions.vtt`"
            srclang="en"
            label="English"
          />
        </video>
        <p class="ai-demo__watch-note">{{ WATCH_TEXT.note }}</p>
      </figure>
      <div class="ai-demo__controls">
        <nav class="ai-demo__kits" :aria-label="AI_PAGE_TEXT.otherKits">
          <a
            v-for="other in otherKits"
            :key="other.key"
            :href="other.href"
            :aria-current="other.key === kit.key ? 'page' : undefined"
            >{{ other.label }}</a
          >
        </nav>
        <div class="ai-demo__toolbar">
          <div class="seg" role="group" :aria-label="AI_PAGE_TEXT.source">
            <button
              type="button"
              class="seg__btn"
              :class="{ 'is-on': !sourceIsBackend }"
              :aria-pressed="!sourceIsBackend"
              data-testid="ai-demo-mode"
              @click="chooseSource('simulated')"
            >
              {{ AI_PAGE_TEXT.simulated }}
            </button>
            <button
              type="button"
              class="seg__btn"
              :class="{ 'is-on': sourceIsBackend }"
              :aria-pressed="sourceIsBackend"
              data-testid="ai-demo-try-real"
              @click="chooseSource('backend')"
            >
              {{
                connection.mode === "simulated"
                  ? AI_PAGE_TEXT.tryReal
                  : AI_PAGE_TEXT.connected
              }}
            </button>
          </div>
          <button
            type="button"
            class="ai-demo__options-trigger"
            data-testid="ai-demo-options"
            :aria-expanded="demoOpen"
            @click="demoOpen = !demoOpen"
          >
            {{ AI_PAGE_TEXT.options }}
          </button>
        </div>
      </div>
      <AiDemoOptions
        :open="demoOpen"
        :toggles="toggles"
        :actions="approvals"
        :presentation="presentation"
        :commit="commit"
        :rtl="rtl"
        :context-profile="contextProfile"
        :excluded="excluded"
        :webmcp="webmcp"
        :webmcp-available="webmcpOffered"
        @close="demoOpen = false"
        @editing-mode="editingMode"
        @toggle="toggle"
        @approval="answerApproval"
        @presentation="presentation = $event"
        @commit="commit = $event"
        @rtl="rtl = $event"
        @context-profile="contextProfile = $event"
        @offer="toggleOffer"
        @webmcp="webmcp = $event"
        @reset="reset"
      />
    </header>

    <!-- The direction lives on the table and the overlays it owns; the page
         around it stays as it is. -->
    <div class="ai-demo__stage" :dir="dir">
      <component
        :is="kit.DataTable"
        :key="tableGeneration"
        :data="rows"
        :columns="columns"
        :labels="labels"
        :dir="dir"
        :lang="locale"
        :row-key="staffKey"
        :url-sync="false"
        v-bind="
          toggles.paging
            ? {
                defaults: { limit: STAFF_PAGE_LIMIT },
                paginationMode: 'paged',
              }
            : {}
        "
        :features="features"
      />
      <div class="ai-demo__assistant">
        <component
          :is="kit.TableAssistant"
          :assistant="assistant.view.value"
          :approval="pending"
          :open="assistant.open.value"
          :on-open-change="assistant.setOpen"
          presentation="floating"
          :class-name="
            kit.key === 'vue-unstyled'
              ? 'mx-assistant-layout mx-native-assistant'
              : 'mx-assistant-layout'
          "
          :dir="dir"
          :labels="labels"
          greeting=""
          :on-settings="
            () => {
              settingsOpen = true;
            }
          "
          :message-action="messageAction"
        />
        <AiConnectDialog
          :open="settingsOpen"
          :session="session"
          :connection="connection"
          :demo-transport="scripted"
          @change="connection = $event"
          @close="settingsOpen = false"
        />
      </div>
    </div>

    <!-- One inspector, shown in the documentation column beside the
         integration example. -->
    <Teleport defer to="#mx-inspector-slot">
      <AiContextInspector
        :session="session"
        :manifest="manifest"
        :context-inputs="liveViewInputs"
        :profile="contextProfile"
        :webmcp-names="webmcpNames"
      />
    </Teleport>
  </div>
</template>
