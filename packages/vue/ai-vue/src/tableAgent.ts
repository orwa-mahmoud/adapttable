/** Scoped Vue lifecycle around the neutral table-agent controller. */
import {
  type TableAgentBridge as NeutralBridge,
  type TableAgentControllerOptions,
} from "@adapttable/ai";
import {
  createTableAgentController,
  TABLE_AGENT_STATE,
} from "@adapttable/ai/agent";
import type {
  AgentApprovalPending,
  FeatureMountContext,
  StaticTableFeature,
} from "@adapttable/vue";
import {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  eraseTableRuntime,
  scheduleTick,
} from "@adapttable/vue/adapter";
import {
  computed,
  type MaybeRefOrGetter,
  nextTick,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
} from "vue";

export { TABLE_AGENT_STATE };
export type { SharedApproval, TableAgentColumnPatch } from "@adapttable/ai";
/** Neutral governance and callback options, unchanged. @public */
export type TableAgentOptions = TableAgentControllerOptions;
/** Host notifications from one live Vue table. @public */
export type TableAgentBridge = NeutralBridge<AgentApprovalPending>;
/**
 * Opt into a live table agent; no assistant UI or transport is installed.
 * Getter inputs follow Vue computed semantics: read changing refs or reactive
 * props inside the getter so each dependency change creates one new snapshot.
 * @public
 */
export function tableAgent(
  options: MaybeRefOrGetter<TableAgentOptions>
): StaticTableFeature {
  const feature: TableAgentFeature = {
    id: "table-agent",
    agentOptions: options,
    mount: (context) =>
      mountAgent(() => agentOptionsOf(context.feature(), options), context),
  };
  return feature;
}
/** The declaration's agent options, so a re-declared agent reads its latest. */
interface TableAgentFeature extends StaticTableFeature {
  readonly agentOptions: MaybeRefOrGetter<TableAgentOptions>;
}
function agentOptionsOf(
  feature: object,
  fallback: MaybeRefOrGetter<TableAgentOptions>
): MaybeRefOrGetter<TableAgentOptions> {
  return "agentOptions" in feature
    ? (feature as TableAgentFeature).agentOptions
    : fallback;
}
function mountAgent<TRow>(
  latest: () => MaybeRefOrGetter<TableAgentOptions>,
  context: FeatureMountContext<TRow>
): () => void {
  // Kept across re-declarations: each read follows the latest declaration,
  // and a ref or getter keeps Vue's computed snapshot semantics.
  // Wrapped, so a ref the host passed stays the host's own.
  const source = shallowRef({ options: latest() });
  const resolved = computed(() => toValue(source.value.options));
  const controller = createTableAgentController({
    options: {
      get current() {
        const next = latest();
        if (next !== source.value.options) source.value = { options: next };
        return resolved.value;
      },
    },
    runtime: { current: eraseTableRuntime(context.runtime) },
    flushAdmission: () => context.flushAdmission(),
    flush: (run) => context.flush(run),
    settleApply: (capture) =>
      nextTick(() => {
        capture(() => context.reconcile());
      }),
  });
  let disposed = false;
  let scheduled = false;
  let generation = 0;
  let table: NonNullable<
    ReturnType<typeof context.runtime.view>
  >["neutralTable"];
  let unsubscribeTable: () => void = () => undefined;
  const clear = () => {
    context.state.set(TABLE_AGENT_STATE, undefined);
    context.state.set(AGENT_APPROVAL_STATE, undefined);
    context.state.set(AGENT_ALWAYS_ALLOW_STATE, undefined);
    context.state.set(AGENT_VIEW_STATE, undefined);
    context.state.set(AGENT_PROGRESS_STATE, undefined);
  };
  const publish = () => {
    if (disposed || !context.active.value) return;
    const state = controller.getState();
    context.state.set(TABLE_AGENT_STATE, state.session);
    context.state.set(AGENT_APPROVAL_STATE, state.approval);
    context.state.set(AGENT_ALWAYS_ALLOW_STATE, state.alwaysAllow);
    context.state.set(AGENT_VIEW_STATE, state.view);
    context.state.set(AGENT_PROGRESS_STATE, state.progress);
  };
  const scheduleSync = () => {
    if (disposed || !context.active.value || scheduled) return;
    scheduled = true;
    const currentGeneration = generation;
    scheduleTick(() => {
      if (currentGeneration !== generation) return;
      scheduled = false;
      if (disposed || !context.active.value) return;
      controller.sync();
      publish();
    });
  };
  const unsubscribe = controller.subscribe(() => {
    publish();
    scheduleSync();
  });
  const watcher = watch(
    () =>
      [resolved.value, context.runtime.view(), context.active.value] as const,
    ([, view, active]) => {
      if (!active) {
        generation += 1;
        scheduled = false;
        unsubscribeTable();
        unsubscribeTable = () => undefined;
        table = undefined;
        controller.disconnect();
        clear();
        return;
      }
      context.reconcile();
      const current = view?.neutralTable;
      if (current !== table) {
        unsubscribeTable();
        table = current;
        const before = controller.tableStamp();
        unsubscribeTable = controller.subscribeTable(scheduleSync);
        if (before !== controller.tableStamp()) scheduleSync();
      }
      scheduleSync();
    },
    { immediate: true, flush: "post" }
  );
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    generation += 1;
    scheduled = false;
    watcher();
    unsubscribeTable();
    unsubscribe();
    controller.disconnect();
    clear();
  };
  onScopeDispose(dispose);
  return dispose;
}
