/** Scoped Vue lifecycle around the neutral table-agent controller. */
import {
  createTableAgentController,
  TABLE_AGENT_STATE,
  type TableAgentBridge as NeutralBridge,
  type TableAgentControllerOptions,
} from "@adapttable/ai";
import {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  type AgentApprovalPending,
  eraseTableRuntime,
  type FeatureMountContext,
} from "@adapttable/vue/adapter";
import type { StaticTableFeature } from "@adapttable/vue/features";
import {
  computed,
  type MaybeRefOrGetter,
  nextTick,
  onScopeDispose,
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
  return {
    id: "table-agent",
    mount: (context) => mountAgent(options, context),
  };
}
function mountAgent<TRow>(
  options: MaybeRefOrGetter<TableAgentOptions>,
  context: FeatureMountContext<TRow>
): () => void {
  const resolved = computed(() => toValue(options));
  const controller = createTableAgentController({
    options: {
      get current() {
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
    void nextTick(() => {
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
