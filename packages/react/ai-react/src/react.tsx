/**
 * Opt-in table feature — `@adapttable/ai-react`.
 *
 * `@adapttable/ai` stays React-free. This package mounts a provider that
 * drives `@adapttable/ai`'s table agent controller from React: it keeps the
 * controller's inputs current, re-renders on its snapshot and the table's
 * changes, and publishes what the controller holds as feature state.
 */
import {
  type AgentSession,
  type TableAgentBridge as NeutralBridge,
  type TableAgentController,
  type TableAgentControllerOptions,
} from "@adapttable/ai";
import {
  createTableAgentController,
  TABLE_AGENT_STATE,
} from "@adapttable/ai/agent";
import {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  type AgentApprovalPending,
  type FeatureProviderProps,
  FeatureStateScope,
  type StaticTableFeature,
  useTableRuntime,
} from "@adapttable/react/adapter";
import {
  type ReactNode,
  useCallback,
  useDebugValue,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";

export type { SharedApproval, TableAgentColumnPatch } from "@adapttable/ai";

// The bridge contract is `@adapttable/ai`'s — a manifest, a session and a
// pending approval are what any binding publishes, none of it React. Named
// here with this binding's own pending shape so every existing import keeps
// working.
export type TableAgentBridge = NeutralBridge<AgentApprovalPending>;

// The live session's key is `@adapttable/ai`'s, so every agent binding
// publishes and reads the same one.
export { TABLE_AGENT_STATE };

/**
 * Options for {@link tableAgent}.
 *
 * The same options `@adapttable/ai`'s table agent controller takes: the
 * runtime half — identity, policy, columns, the host's callbacks and
 * capabilities — plus where updates are published and whether the table is
 * offered to a browser-resident agent.
 *
 * @public
 */
export type TableAgentOptions = TableAgentControllerOptions;

interface TableAgentFeature extends StaticTableFeature {
  readonly options: TableAgentOptions;
}

function TableAgentProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const options = (feature as TableAgentFeature).options;
  const runtime = useTableRuntime();
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;
  // A concrete provider update, rather than an empty `flushSync`, makes React
  // finish controlled-state work already queued by the reader before the
  // session takes its admission snapshot.
  const [admissionTick, setAdmissionTick] = useState(0);
  const flushAdmission = useRef<() => void>(() => undefined);
  flushAdmission.current = () => {
    flushSync(() => {
      setAdmissionTick(admissionTick + 1);
    });
  };

  // Built once and never during a render that is thrown away twice: the
  // controller opens nothing until `sync`, which only an effect calls.
  const controllerRef = useRef<TableAgentController | null>(null);
  controllerRef.current ??= createTableAgentController({
    options: optionsRef,
    runtime: runtimeRef,
    flushAdmission: () => {
      flushAdmission.current();
    },
    flush: flushSync,
  });
  const controller = controllerRef.current;

  // The table as a store: subscribe where there is one to subscribe to, and
  // read the stamp on every render either way. React re-reads the stamp after
  // it attaches, so a table that moved between the render and the
  // subscription is caught rather than missed. The value is not rendered;
  // re-rendering is the point, because that republishes the manifest.
  const neutralTable = runtime.view()?.neutralTable;
  // The controller subscribes to the table current at the call, so a
  // replaced table is a new subscription.
  const subscribeToTable = useCallback(
    (onStoreChange: () => void) =>
      neutralTable ? controller.subscribeTable(onStoreChange) : () => undefined,
    [controller, neutralTable]
  );
  const stamp = useSyncExternalStore(
    subscribeToTable,
    controller.tableStamp,
    controller.tableStamp
  );
  useDebugValue(stamp);

  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState
  );

  // Every commit: the controller decides what changed and tells only those
  // who need telling. A layout effect, so a host reading the manifest in its
  // own effects already has this render's.
  useLayoutEffect(() => {
    controller.sync();
  });

  // Going away is a close. Strict Mode's setup/cleanup/setup lands here too:
  // the cleanup releases everything, and the next sync sets it up again.
  useEffect(
    () => () => {
      controller.disconnect();
    },
    [controller]
  );

  // A new value every render on purpose. The table publishes its runtime
  // while its children render, after this provider has, so a surface below
  // learns what the session now offers only by re-rendering with it — and it
  // re-renders because the value it holds is a different one.
  const session = state.session;
  const published: AgentSession = {
    catalog: () => session.catalog(),
    describe: (key) => session.describe(key),
    execute: (key, args, expectedRevision, idempotencyKey, signal) =>
      session.execute(key, args, expectedRevision, idempotencyKey, signal),
    manifest: () => session.manifest(),
  };

  return (
    <FeatureStateScope stateKey={TABLE_AGENT_STATE} value={published}>
      <FeatureStateScope stateKey={AGENT_APPROVAL_STATE} value={state.approval}>
        <FeatureStateScope
          stateKey={AGENT_ALWAYS_ALLOW_STATE}
          value={state.alwaysAllow}
        >
          <FeatureStateScope stateKey={AGENT_VIEW_STATE} value={state.view}>
            <FeatureStateScope
              stateKey={AGENT_PROGRESS_STATE}
              value={state.progress}
            >
              {children}
            </FeatureStateScope>
          </FeatureStateScope>
        </FeatureStateScope>
      </FeatureStateScope>
    </FeatureStateScope>
  );
}

/**
 * Observe a live table and publish a deterministic capability manifest.
 *
 * Omitting this feature from `features` ships no agent bytes.
 *
 * @public
 */
export function tableAgent(options: TableAgentOptions): StaticTableFeature {
  const feature: TableAgentFeature = {
    id: "table-agent",
    options,
    provider: { Provider: TableAgentProvider },
  };
  return feature;
}
