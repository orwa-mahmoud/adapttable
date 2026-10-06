/** Vue lifecycle and readonly refs over the neutral conversation controller. */
import {
  type AgentContextInputs,
  type AgentSession,
  type AlwaysAllowedState,
  createTableAssistant,
  type TableAssistantInputs,
  type TableAssistantSnapshot,
  type TableAssistantStore,
} from "@adapttable/ai";
import { type AgentApprovalPending, type AgentProgress } from "@adapttable/vue";
import {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  type TableAssistantView,
  useExternalStore,
  useFeatureState,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  nextTick,
  onScopeDispose,
  proxyRefs,
  shallowRef,
  toValue,
  watch,
} from "vue";

/** Live session, transport, conversation and controlled presentation. @public */
export interface TableAssistantOptions extends Omit<
  TableAssistantInputs,
  "session" | "approval" | "progress" | "alwaysAllowed" | "onRevokeAlwaysAllow"
> {
  readonly session: AgentSession | undefined;
  /** Bridge state for a panel outside the table subtree. */
  readonly approval?: AgentApprovalPending | null;
  readonly progress?: AgentProgress | null;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly alwaysAllow?: AlwaysAllowedState;
}

/** Destructurable readonly refs and stable actions for an adapter-owned panel. @public */
export type TableAssistantState = {
  readonly [
    K in
      | "status"
      | "busy"
      | "messages"
      | "draft"
      | "interrupted"
      | "resumable"
      | "progress"
      | "alwaysAllowed"
      | "suggestions"
      | "error"
      | "errorCode"
  ]: ComputedRef<TableAssistantSnapshot[K]>;
} & Pick<
  TableAssistantStore,
  | "setDraft"
  | "send"
  | "sendClip"
  | "stop"
  | "resume"
  | "clear"
  | "answer"
  | "undoTurn"
  | "undoAction"
  | "revokeAlwaysAllow"
  | "runSuggestion"
> & {
    readonly view: ComputedRef<TableAssistantView>;
    readonly approval: ComputedRef<AgentApprovalPending | null>;
    readonly open: ComputedRef<boolean>;
    readonly setOpen: (open: boolean) => void;
    readonly undo: ComputedRef<{
      readonly messageId: string;
      readonly available: boolean;
      readonly blockedCode?: string;
    } | null>;
  };

/** Construct inside setup or a caller-owned effect scope. @public */
export function useTableAssistant(
  options: MaybeRefOrGetter<TableAssistantOptions>
): TableAssistantState {
  const active = useScopeActivity();
  const approval = useFeatureState(AGENT_APPROVAL_STATE);
  const alwaysAllow = useFeatureState(AGENT_ALWAYS_ALLOW_STATE);
  const view = useFeatureState(AGENT_VIEW_STATE);
  const progress = useFeatureState(AGENT_PROGRESS_STATE);
  const inputs = (): TableAssistantInputs => {
    const current = toValue(options);
    const allow = current.alwaysAllow ?? alwaysAllow.value;
    const reader = view.value;
    const contextInputs =
      current.contextInputs ??
      (reader ? () => reader.read() as AgentContextInputs : undefined);
    return {
      ...current,
      approval:
        current.approval !== undefined
          ? current.approval
          : (approval.value ?? null),
      awaitingApproval:
        current.awaitingApproval ??
        Boolean(
          current.approval !== undefined ? current.approval : approval.value
        ),
      progress:
        current.progress !== undefined
          ? current.progress
          : (progress.value ?? null),
      contextInputs,
      alwaysAllowed: allow?.capabilities,
      onRevokeAlwaysAllow: allow?.revoke,
      onMessagesChange: (messages) =>
        toValue(options).onMessagesChange?.(messages),
      onDetach: (handle) => toValue(options).onDetach?.(handle),
    };
  };
  const store = createTableAssistant(inputs());
  const snapshot = useExternalStore({
    getSnapshot: store.getState,
    subscribe: store.subscribe,
  });
  const uncontrolledOpen = shallowRef(false);
  let generation = 0;
  const sync = () => store.update(inputs());
  watch(
    () => [toValue(options).session, toValue(options).transportKey] as const,
    () => {
      generation += 1;
    },
    { flush: "sync" }
  );
  watch(inputs, (next) => store.update(next), { flush: "sync" });
  watch(
    active,
    (enabled) => {
      if (enabled) {
        sync();
        store.connect();
      } else {
        generation += 1;
        store.disconnect();
      }
    },
    { immediate: true, flush: "sync" }
  );
  onScopeDispose(store.dispose);
  const field = <K extends keyof TableAssistantSnapshot>(
    key: K
  ): ComputedRef<TableAssistantSnapshot[K]> =>
    computed(() => snapshot.value[key]);
  // A method can be invoked in the same event that queued new parent props.
  // Let Vue deliver those props before handing work to the neutral controller.
  const admitted = async (run: () => void | Promise<void>): Promise<void> => {
    const admittedGeneration = generation;
    await Promise.resolve();
    await nextTick();
    if (!active.value || admittedGeneration !== generation) return;
    sync();
    await run();
  };
  const state: Omit<TableAssistantState, "view"> = {
    status: field("status"),
    busy: field("busy"),
    messages: field("messages"),
    draft: field("draft"),
    interrupted: field("interrupted"),
    resumable: field("resumable"),
    progress: field("progress"),
    alwaysAllowed: field("alwaysAllowed"),
    suggestions: field("suggestions"),
    error: field("error"),
    errorCode: field("errorCode"),
    approval: computed(() =>
      toValue(options).approval !== undefined
        ? (toValue(options).approval ?? null)
        : (approval.value ?? null)
    ),
    open: computed(() => toValue(options).open ?? uncontrolledOpen.value),
    setOpen: (open) => {
      const current = toValue(options);
      if (current.open === undefined) uncontrolledOpen.value = open;
      current.onOpenChange?.(open);
    },
    undo: computed(() => {
      const value = snapshot.value.undo;
      return value
        ? {
            messageId: value.messageId,
            available: value.available,
            ...(value.blocked ? { blockedCode: value.blocked.code } : {}),
          }
        : null;
    }),
    setDraft: store.setDraft,
    send: (text) => admitted(() => store.send(text)),
    sendClip: (clip) => admitted(() => store.sendClip(clip)),
    resume: () => admitted(store.resume),
    undoTurn: () => admitted(store.undoTurn),
    undoAction: (key) => admitted(() => store.undoAction(key)),
    runSuggestion: (id) => admitted(() => store.runSuggestion(id)),
    stop: () => {
      generation += 1;
      store.stop();
    },
    clear: () => {
      generation += 1;
      store.clear();
    },
    answer: (answer) => {
      void admitted(() => {
        store.answer(answer);
      });
    },
    revokeAlwaysAllow: (capability) => {
      sync();
      store.revokeAlwaysAllow(capability);
    },
  };
  return { ...state, view: computed(() => ({ ...proxyRefs(state) })) };
}
