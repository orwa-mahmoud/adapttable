/** Angular's lifecycle around the framework-neutral table agent controller. */
import {
  createTableAgentController,
  TABLE_AGENT_STATE,
  type TableAgentBridge as NeutralBridge,
  type TableAgentControllerOptions,
} from "@adapttable/ai";
import {
  type AdaptTableFeature,
  type FeatureMountContext,
  type MaybeSignal,
  readMaybe,
} from "@adapttable/angular";
import {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  type AgentApprovalPending,
} from "@adapttable/angular/adapter";
import { effect, PendingTasks, untracked } from "@angular/core";

export type { SharedApproval, TableAgentColumnPatch } from "@adapttable/ai";
export { TABLE_AGENT_STATE };

/** Host notifications from the live Angular table. @public */
export type TableAgentBridge = NeutralBridge<AgentApprovalPending>;
/** Neutral agent policy, identity, callbacks and browser-agent exposure. @public */
export type TableAgentOptions = TableAgentControllerOptions;

/**
 * Mount a live agent with a table, leaving all agent logic in `@adapttable/ai`.
 * Pass a signal to update policy and host callbacks without remounting.
 * @public
 */
export function tableAgent(
  options: MaybeSignal<TableAgentOptions>
): AdaptTableFeature {
  return {
    id: "table-agent",
    mount: (context) => mountAgent(options, context),
  };
}

function mountAgent(
  options: MaybeSignal<TableAgentOptions>,
  context: FeatureMountContext
): () => void {
  const controller = createTableAgentController({
    options: {
      get current() {
        return readMaybe(options);
      },
    },
    runtime: { current: context.runtime },
    flushAdmission: () => context.flushAdmission(),
    flush: (run) => context.flush(run),
  });
  const pendingTasks = context.injector.get(PendingTasks);
  let releasePending: (() => void) | undefined;
  let stopped = false;
  let scheduled = false;
  let table: NonNullable<
    ReturnType<typeof context.runtime.view>
  >["neutralTable"];
  let unsubscribeTable: () => void = () => undefined;
  const publish = () => {
    const state = controller.getState();
    context.state.set(TABLE_AGENT_STATE, state.session);
    context.state.set(AGENT_APPROVAL_STATE, state.approval);
    context.state.set(AGENT_ALWAYS_ALLOW_STATE, state.alwaysAllow);
    context.state.set(AGENT_VIEW_STATE, state.view);
    context.state.set(AGENT_PROGRESS_STATE, state.progress);
  };
  const scheduleSync = () => {
    if (stopped || scheduled) return;
    scheduled = true;
    const release = pendingTasks.add();
    let released = false;
    const finish = () => {
      if (released) return;
      released = true;
      release();
    };
    releasePending = finish;
    // A controller may start sampling during sync. Admission commits Angular
    // synchronously, so synchronization must run after Angular's current tick,
    // rather than recursively entering ApplicationRef.tick from its effect.
    queueMicrotask(() => {
      scheduled = false;
      try {
        if (stopped) return;
        untracked(() => {
          controller.sync();
          publish();
        });
      } finally {
        finish();
        if (releasePending === finish) releasePending = undefined;
      }
    });
  };
  const unsubscribe = controller.subscribe(() => {
    if (stopped) return;
    untracked(publish);
    scheduleSync();
  });
  const watcher = effect(
    () => {
      readMaybe(options);
      const current = context.runtime.view()?.neutralTable;
      untracked(() => {
        if (current !== table) {
          unsubscribeTable();
          table = current;
          // Read both sides of attachment: a revision can move during subscribe.
          const before = controller.tableStamp();
          unsubscribeTable = controller.subscribeTable(scheduleSync);
          const after = controller.tableStamp();
          if (before !== after) scheduleSync();
        }
        scheduleSync();
      });
    },
    { injector: context.injector, manualCleanup: true }
  );
  return () => {
    stopped = true;
    releasePending?.();
    watcher.destroy();
    unsubscribeTable();
    unsubscribe();
    controller.disconnect();
    context.state.set(TABLE_AGENT_STATE, undefined);
    context.state.set(AGENT_APPROVAL_STATE, undefined);
    context.state.set(AGENT_ALWAYS_ALLOW_STATE, undefined);
    context.state.set(AGENT_VIEW_STATE, undefined);
    context.state.set(AGENT_PROGRESS_STATE, undefined);
  };
}
