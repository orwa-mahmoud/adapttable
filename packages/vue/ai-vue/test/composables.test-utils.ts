import { type AgentSession, createTableAgentController } from "@adapttable/ai";
import { afterEach } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  type MaybeRefOrGetter,
  nextTick,
  type ShallowRef,
  shallowRef,
} from "vue";
const disposers = new Set<() => void>();
afterEach(() => {
  for (const dispose of disposers) dispose();
  disposers.clear();
});
export function mountComposable<TOptions, TResult>(
  options: TOptions,
  use: (input: MaybeRefOrGetter<TOptions>) => TResult,
  provide?: () => void
): {
  result: TResult;
  input: ShallowRef<TOptions>;
  deactivate: () => Promise<void>;
  activate: () => Promise<void>;
  dispose: () => void;
} {
  const input = shallowRef(options);
  const visible = shallowRef(true);
  let result: TResult | undefined;
  const Child = defineComponent({
    setup: () => {
      result = use(input);
      return () => h("div");
    },
  });
  const app = createApp({
    setup: () => {
      provide?.();
      return () =>
        h(KeepAlive, null, {
          default: () => (visible.value ? h(Child) : undefined),
        });
    },
  });
  app.mount(document.createElement("div"));
  const dispose = () => app.unmount();
  disposers.add(dispose);
  if (!result) throw new Error("Composable did not mount");
  return {
    result,
    input,
    deactivate: async () => {
      visible.value = false;
      await nextTick();
    },
    activate: async () => {
      visible.value = true;
      await nextTick();
    },
    dispose: () => {
      dispose();
      disposers.delete(dispose);
    },
  };
}
export function newSession(id = "people"): AgentSession {
  const controller = createTableAgentController({
    options: {
      current: {
        tableId: id,
        columns: { name: { type: "string" } },
        approval: "never",
      },
    },
    runtime: {
      current: {
        view: () => ({ rows: [], getRowId: () => "", rowLabel: () => "" }),
        labels: () => undefined,
        rowAt: () => undefined,
        featureIds: () => [],
      },
    },
    flushAdmission: () => undefined,
    flush: (run) => run(),
  });
  disposers.add(controller.disconnect);
  return controller.session();
}
