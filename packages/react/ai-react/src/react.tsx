/**
 * Opt-in table feature — `@adapttable/ai-react`.
 *
 * `@adapttable/ai` stays React-free. This package mounts a provider that
 * observes the live table and publishes a versioned manifest.
 */
import {
  type AgentContextInputs,
  type AgentSession,
  alwaysAllowFor,
  type ApprovalResult,
  type ApprovalSubject,
  type ApprovalTransaction,
  assertAlwaysAllow,
  bindLiveSession,
  capabilityKind,
  closeTransaction,
  contractFingerprint,
  createApprovalMemory,
  createRevisionCounter,
  displayProposals,
  exclusionKey,
  mayAlwaysAllow,
  openTransaction,
  type PendingApproval,
  perItemRefusal,
  readerResolver,
  recordDecision,
  registerWebMcpTools,
  revisionToken,
  sampledColumns,
  settleDecisions,
  type SharedApproval,
  sharedApproval,
  tableActionSignature,
  type TableAgentBridge as NeutralBridge,
  type TableAgentColumnPatch,
  type TableAgentRuntimeOptions,
  viewInputsFromRuntime,
  viewRevisionStamp,
} from "@adapttable/ai";
import { sampleColumns } from "@adapttable/ai/context";
import {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  type AgentAlwaysAllowState,
  type AgentApprovalPending,
  type AgentProgress,
  type AgentViewState,
  type FeatureProviderProps,
  featureStateKey,
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
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";

export type { SharedApproval, TableAgentColumnPatch };

// The bridge contract is `@adapttable/ai`'s — a manifest, a session and a
// pending approval are what any binding publishes, none of it React. Named
// here with this binding's own pending shape so every existing import keeps
// working.
export type TableAgentBridge = NeutralBridge<AgentApprovalPending>;

/**
 * Feature-state key for the live {@link AgentSession}.
 *
 * @public
 */
export const TABLE_AGENT_STATE = featureStateKey<AgentSession>("table-agent");

/**
 * Options for {@link tableAgent}.
 *
 * The runtime half — identity, policy, columns, the host's callbacks and
 * capabilities — is `@adapttable/ai`'s {@link TableAgentRuntimeOptions}. This
 * binding adds where it publishes updates and whether it offers the table to a
 * browser-resident agent.
 *
 * @public
 */
export interface TableAgentOptions extends TableAgentRuntimeOptions {
  /** Host callbacks for manifest and session attach. */
  readonly bridge?: TableAgentBridge;
  /**
   * Offer this table's capabilities to a browser-resident agent.
   *
   * `true` offers everything the session permits; an object narrows the
   * surface. It narrows only — a capability the table excludes stays
   * unavailable, and a browser confirmation is in addition to the table's own
   * approval rather than instead of it. Does nothing in a browser without the
   * API, and nothing on a server.
   */
  readonly webmcp?:
    | true
    | {
        readonly exposedTo?: readonly string[];
        /**
         * Told what was registered, and told `[]` when the registration goes.
         *
         * For a surface that lists the tools a browser agent can see. Nothing
         * depends on it: a page that does not care never passes it.
         */
        readonly onRegister?: (names: readonly string[]) => void;
      };
}

interface TableAgentFeature extends StaticTableFeature {
  readonly options: TableAgentOptions;
}

/** One open approval, whichever shape the write took. */
function TableAgentProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const options = (feature as TableAgentFeature).options;
  const runtime = useTableRuntime();
  const revisionCounterRef = useRef(createRevisionCounter());
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

  // The session is built here, before anything reads it. Several callbacks
  // below name it in a dependency array, which React evaluates during render
  // — so a `const` declared after them is read before it exists.
  //
  // `waitForChrome` is a ref whose handler is assigned further down; the
  // session only calls it once a write is actually proposed, so declaring the
  // ref early costs nothing and is what lets the session move up here.
  const waitForChrome = useRef<
    (subject: ApprovalSubject, signal?: AbortSignal) => Promise<ApprovalResult>
  >(() => Promise.resolve(false));
  // The same arrangement for progress: the session is built once and reports
  // through this, and what it reports goes both to the table's own feature
  // state and to a bridge a host wired.
  const reportProgress = useRef<(report: AgentProgress | null) => void>(
    () => undefined
  );
  const tableIdRef = useRef(options.tableId);
  // The registry is resolved when the session is built, so a change to what
  // the agent may use — or to who has to approve it — is a different session,
  // not a different answer from the same one.
  const registryKeyOf = (next: TableAgentOptions): string =>
    `${exclusionKey(next.excludeCapabilities)}!${JSON.stringify(next.capabilityApproval ?? {})}!${tableActionSignature(runtime.view()?.actions)}`;
  const registryRef = useRef(registryKeyOf(options));
  const registryKey = registryKeyOf(options);
  const sessionRef = useRef<AgentSession | null>(null);
  if (
    tableIdRef.current !== options.tableId ||
    registryRef.current !== registryKey
  ) {
    tableIdRef.current = options.tableId;
    registryRef.current = registryKey;
    sessionRef.current = null;
    revisionCounterRef.current = createRevisionCounter();
  }
  sessionRef.current ??= bindLiveSession({
    options: optionsRef,
    runtime: runtimeRef,
    revisions: revisionCounterRef.current,
    flushAdmission,
    waitForChrome,
    reportProgress,
    flush: flushSync,
  });
  const session = sessionRef.current;
  // Bumped when the reader takes an allowance back, so the published list is
  // rebuilt. The memory itself is a ref and cannot notify React on its own.
  const [revocations, setRevocations] = useState(0);
  // What a running capability last said about itself, and nothing once it
  // stops. The session reports it through `reportProgress` above.
  const [progress, setProgress] = useState<AgentProgress | null>(null);
  const [transaction, setTransaction] = useState<ApprovalTransaction | null>(
    null
  );
  const pendingRef = useRef<PendingApproval | null>(null);
  const transactionId = useRef(0);

  // The table as a store: subscribe where there is one to subscribe to, and
  // read the stamp on every render either way. React re-reads the stamp after
  // it attaches, so a table that moved between the render and the
  // subscription is caught rather than missed — which is what the old
  // dependency-free effect was standing in for. The value is not rendered;
  // re-rendering is the point, because that republishes the manifest.
  const neutralTable = runtime.view()?.neutralTable;
  const readStamp = useCallback(
    () =>
      neutralTable
        ? revisionToken(neutralTable.revisions)
        : viewRevisionStamp(runtime.view()),
    [neutralTable, runtime]
  );
  const subscribeToTable = useCallback(
    (onStoreChange: () => void) =>
      neutralTable
        ? neutralTable.subscribe("all", onStoreChange)
        : () => undefined,
    [neutralTable]
  );
  const stamp = useSyncExternalStore(subscribeToTable, readStamp, readStamp);
  useDebugValue(stamp);

  const hostApprove = options.onApprove;
  // What the reader has said not to be asked about again. Scoped to the
  // contract, so it forgets the moment the table is not the one they agreed
  // about.
  const approvalMemory = useRef(createApprovalMemory());
  // The contract the reader agreed about. A label, a permission or a
  // capability changing makes it a different table, and the memory clears.
  const contractVersion = useCallback(
    () => contractFingerprint(session.manifest(), session.catalog()),
    [session]
  );

  const webmcp = options.webmcp;
  // Registration belongs to a contract version: a table whose capabilities or
  // columns moved is a different set of tools, so the old ones go and the new
  // ones are offered. Effects never run on the server, which is also where
  // `document` would be missing.
  const webmcpVersion = webmcp ? contractVersion() : "";
  useEffect(() => {
    if (!webmcp) return;
    const options = webmcp === true ? {} : webmcp;
    const registration = registerWebMcpTools(session, {
      ...(options.exposedTo ? { exposedTo: options.exposedTo } : {}),
      onWarning: (warning) => {
        // A page whose policy forbids this is configured that way on purpose.
        // Saying so once beats throwing into a render.
        console.warn(`[adapttable] webmcp: ${warning.message}`);
      },
    });
    options.onRegister?.(registration.names);
    return () => {
      registration.dispose();
      // Said plainly rather than left standing: the tools are gone, and a
      // surface listing them would otherwise show a set nothing can call.
      options.onRegister?.([]);
    };
  }, [session, webmcp, webmcpVersion]);
  waitForChrome.current = (subject, signal) => {
    if (pendingRef.current) {
      return Promise.reject(new Error("an approval is already pending"));
    }
    // Consulted only here, after the session has already decided a human
    // would be asked. It can never turn `approval: "never"` into a write
    // nobody saw, and it never answers for a write that enumerates rows.
    const capability =
      subject.kind === "operation" ? subject.capability : undefined;
    if (
      mayAlwaysAllow({
        capability,
        kind: capabilityKind(session, capability),
        alwaysAllow: alwaysAllowFor(
          optionsRef.current.approval,
          optionsRef.current.capabilities,
          capability
        ),
      }) &&
      capability !== undefined &&
      approvalMemory.current.allows(capability, contractVersion())
    ) {
      return Promise.resolve(true);
    }
    return new Promise<ApprovalResult>((resolve) => {
      // A write is either rows the reader can decide one at a time, or one
      // operation a backend performs whole — "set every status to Active"
      // names no rows at all. The session says which; nothing here guesses
      // from the runtime shape of a value.
      const rows = subject.kind === "rows";
      let settled = false;
      const entry: PendingApproval = {
        ...(rows ? {} : { capability: subject.capability }),
        // What the reader is shown, resolved from their own table. The
        // model's own `before` values stay in the session and never reach
        // this side.
        proposals: rows
          ? displayProposals(
              subject.proposals,
              readerResolver(runtimeRef.current, optionsRef.current.columns)
            )
          : [],
        perItem: rows && subject.perItem,
        ...(rows
          ? {}
          : {
              operation: {
                capability: subject.capability,
                ...(subject.title ? { title: subject.title } : {}),
                arguments: subject.arguments,
              },
            }),
        // Settled once, whoever gets there first: the reader, an abort, an
        // unmount, or the last row being answered. A second call is a no-op
        // rather than a second answer to one question.
        resolve: (result: ApprovalResult) => {
          if (settled) return;
          settled = true;
          if (pendingRef.current === entry) pendingRef.current = null;
          setTransaction(closeTransaction(entry));
          signal?.removeEventListener("abort", onAbort);
          resolve(result);
        },
      };
      const onAbort = () => entry.resolve(false);
      pendingRef.current = entry;
      // Identity and decisions in one write, so no render ever shows this
      // write's rows beside the last write's answers.
      transactionId.current += 1;
      // Resolved by the session for THIS action, so an override of
      // `ai.approval.presentation` reaches the surface that draws it.
      setTransaction(
        openTransaction(transactionId.current, entry, subject.presentation)
      );
      if (signal?.aborted) {
        entry.resolve(false);
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  };

  useEffect(
    () => () => {
      pendingRef.current?.resolve(false);
    },
    []
  );

  const published: AgentSession = {
    catalog: () => session.catalog(),
    describe: (key) => session.describe(key),
    execute: (key, args, expectedRevision, idempotencyKey, signal) =>
      session.execute(key, args, expectedRevision, idempotencyKey, signal),
    manifest: () => session.manifest(),
  };

  // The live view, as the context builder wants it. Read through a stable
  // callback rather than captured: the store calls it when a turn starts and
  // again when it settles, and a value taken at render time would report that
  // nothing moved between the two — which is exactly what per-turn undo has
  // to be able to tell.
  // Live values for the columns whose author opted in. Read once per contract
  // rather than once per turn: sampling is a read against the table, and a
  // table publishing ten sampled columns must not open ten reads every time
  // somebody types. Held in a ref because the reader below is synchronous —
  // the context builder performs no I/O, which is the rule this keeps.
  const samplesRef = useRef<Readonly<Record<string, readonly unknown[]>>>({});
  const viewStateValue = useRef<AgentViewState>({
    read: () =>
      viewInputsFromRuntime(
        runtimeRef.current,
        optionsRef.current,
        samplesRef.current
      ),
  }).current;

  useEffect(() => {
    options.bridge?.attach?.(session);
    // The reader is stable for the life of this feature, so a host takes it
    // once and calls it whenever it needs the view — rather than being pushed
    // a copy on every change and having to keep it in step.
    options.bridge?.viewInputs?.(
      viewStateValue.read as () => AgentContextInputs
    );
  }, [options.bridge, session, viewStateValue]);

  const last = useRef<string>("");
  useLayoutEffect(() => {
    const published = session.manifest();
    const encoded = JSON.stringify(published);
    if (encoded === last.current) return;
    last.current = encoded;
    options.bridge?.publish?.(published);
  });

  // Sampled once for the set of columns that asked, and again only when that
  // set changes. Abandoned on unmount: a read that comes back to a table the
  // reader has left must not write into it.
  const sampledKey = sampledColumns(session).join(" ");
  useEffect(() => {
    const wanted = sampledKey === "" ? [] : sampledKey.split(" ");
    if (wanted.length === 0) {
      samplesRef.current = {};
      return;
    }
    const controller = new AbortController();
    void sampleColumns(session, wanted, controller.signal).then(
      (values) => {
        if (controller.signal.aborted) return;
        samplesRef.current = values;
      },
      () => {
        // A sample is an illustration, not a result. A table that cannot
        // supply one publishes the author's own examples and nothing else,
        // rather than failing a turn nobody has started.
        if (!controller.signal.aborted) samplesRef.current = {};
      }
    );
    return () => controller.abort();
  }, [session, sampledKey, samplesRef]);

  // The chrome path is the only one that parks: with `onApprove` the host
  // answers directly and nothing is ever left open here.
  const chromePending = !hostApprove && transaction !== null;

  // Who is listening, and what they were last told.
  //
  // The subscriber is compared by its own identity rather than the bridge's:
  // a host that rebuilds `bridge={{ ... }}` inline on every render still
  // passes the same `approvals` function, and re-announcing an unchanged
  // state on every render is noise a host cannot filter.
  const approvals = options.bridge?.approvals;
  const approvalsRef = useRef(approvals);
  // The transaction last announced, not merely whether one was. A decision
  // taken inside an open approval changes what a subscriber should be
  // holding, and announcing only open-versus-closed left a panel outside the
  // table rendering the state from before the reader touched it.
  const announcedRef = useRef<ApprovalTransaction | null>(null);
  // What a subscriber would be handed right now. Held in a ref because the
  // published value is built below, and the announcement must not care about
  // declaration order.
  const publishedRef = useRef<AgentApprovalPending | null>(null);

  useEffect(() => {
    const previous = approvalsRef.current;
    if (previous !== approvals) {
      // A genuinely different subscriber. The one being replaced must not be
      // left believing an approval is still open, and the one arriving has
      // never been told anything.
      if (announcedRef.current) previous?.(null);
      approvalsRef.current = approvals;
      announcedRef.current = null;
    }
    const next = chromePending ? transaction : null;
    if (announcedRef.current === next) return;
    announcedRef.current = next;
    approvals?.(next ? publishedRef.current : null);
  }, [approvals, chromePending, transaction]);

  // Going away is a close. Without this the host is left showing "waiting for
  // you" for an approval whose provider no longer exists — and resolving the
  // promise below cannot help, because no effect runs after an unmount to
  // announce it. Strict Mode's setup/cleanup/setup lands here too: the
  // cleanup retracts, and the effect above re-announces on the second setup.
  useEffect(
    () => () => {
      if (!announcedRef.current) return;
      announcedRef.current = null;
      approvalsRef.current?.(null);
    },
    []
  );

  // A pure state update, bound to the transaction it was made for. A control
  // left over from a settled approval finds a different id and does nothing;
  // a position that is not a row of THIS plan changes nothing either.
  const decideAt = (id: number) => (index: number, approved: boolean) => {
    setTransaction((current) => recordDecision(current, id, index, approved));
  };

  // Answering the last row settles the write. This belongs in an effect and
  // not in the updater that produced the decisions: a state updater may be
  // replayed, and replaying one that resolves a promise would answer the
  // session twice.
  useEffect(() => {
    if (!transaction) return;
    // A write that named no rows has no last row to answer. It waits for an
    // explicit whole decision — an empty decision list is not "everything is
    // decided", it is "there was never anything to enumerate".
    if (transaction.pending.proposals.length === 0) return;
    if (transaction.decisions.includes("pending")) return;
    transaction.pending.resolve(
      settleDecisions(transaction.decisions, "rejected")
    );
  }, [transaction]);

  // Rebuilt every render on purpose: the published value is what subscribers
  // compare, and memoizing it hides a decision that changed inside it.
  const approvalValue =
    hostApprove || !transaction
      ? null
      : {
          proposals: transaction.pending.proposals,
          ...(transaction.pending.operation
            ? { operation: transaction.pending.operation }
            : {}),
          decisions: transaction.decisions,
          presentation: transaction.presentation,
          // "Approve remaining" is what these mean once rows have been
          // decided: a row already refused stays refused, or the control
          // undoes the reader's own work.
          //
          // A write that cannot be split is answered whole — a row move, a
          // custom operation, or one that enumerates no rows at all. Sending
          // positions for one of those reaches the session as a decision it
          // is right to refuse, and an empty list reads as "approved none".
          ...(mayAlwaysAllow({
            capability: transaction.pending.capability,
            kind: capabilityKind(session, transaction.pending.capability),
            alwaysAllow: alwaysAllowFor(
              optionsRef.current.approval,
              optionsRef.current.capabilities,
              transaction.pending.capability
            ),
          })
            ? {
                alwaysAllow: () => {
                  const capability = transaction.pending.capability;
                  if (capability === undefined) return;
                  approvalMemory.current.remember(
                    capability,
                    contractVersion()
                  );
                  transaction.pending.resolve(true);
                },
              }
            : {}),
          approve: () =>
            transaction.pending.resolve(
              transaction.pending.perItem
                ? settleDecisions(transaction.decisions, "approved")
                : true
            ),
          reject: (reason?: string) => {
            // A kit's button is wired `onClick={onReject}`, and the slot
            // contract says the handler takes nothing — so what actually
            // arrives is a click event. The declared type is a claim, not a
            // fact: anything that is not a stated reason is no reason at all.
            const stated =
              typeof reason === "string" ? reason.trim() : undefined;
            if (transaction.pending.perItem) {
              transaction.pending.resolve(perItemRefusal(transaction, stated));
              return;
            }
            // A write answered whole is a plain refusal unless the reader
            // said something, in which case an empty approval list carries
            // the words.
            transaction.pending.resolve(
              stated ? { approved: [], reason: stated } : false
            );
          },
          ...(transaction.pending.perItem
            ? { decideAt: decideAt(transaction.id) }
            : {}),
        };

  publishedRef.current = approvalValue;

  // What the reader has waved through, published whether or not an approval is
  // open — a reader goes looking for the list precisely when nothing is
  // waiting. `remembered` is read during render, and `revocations` is what
  // makes a revoke reach this render rather than the next approval.
  // Checked once per contract, where the configuration first meets a live
  // catalog. A key this table does not offer is a control the developer
  // believes they shipped and the reader never sees, so it is an error rather
  // than a silence — the same treatment `include` gets in the context builder.
  useEffect(() => {
    assertAlwaysAllow(
      sharedApproval(optionsRef.current.approval).alwaysAllow,
      session.catalog().map((entry) => entry.key)
    );
  }, [session, stamp]);

  const alwaysAllowValue = useMemo<AgentAlwaysAllowState>(
    () => ({
      capabilities: approvalMemory.current.remembered(contractVersion()),
      revoke: (capability: string) => {
        approvalMemory.current.revoke(capability);
        setRevocations((count) => count + 1);
      },
    }),
    // A revoke, or the table moving — the memory is a ref, so neither tells
    // React on its own, and a contract change is what clears the memory.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revocations, stamp, contractVersion]
  );

  // Published the same way the manifest and the approval are: a panel mounted
  // beside the table cannot read feature state from inside it, so a reader
  // who waved a capability through would have nowhere to take it back.
  const alwaysAllowedBridge = optionsRef.current.bridge?.alwaysAllowed;
  useEffect(() => {
    alwaysAllowedBridge?.(alwaysAllowValue);
  }, [alwaysAllowedBridge, alwaysAllowValue]);

  // Both destinations, from the one report: the table's own panel reads the
  // feature state, and a panel mounted outside it reads the bridge. Assigned
  // on every render for the same reason the approval handler is — the session
  // is built once and must not be holding the first render's closure.
  reportProgress.current = (report) => {
    setProgress(report);
    optionsRef.current.bridge?.progress?.(report);
  };

  return (
    <FeatureStateScope stateKey={TABLE_AGENT_STATE} value={published}>
      <FeatureStateScope stateKey={AGENT_APPROVAL_STATE} value={approvalValue}>
        <FeatureStateScope
          stateKey={AGENT_ALWAYS_ALLOW_STATE}
          value={alwaysAllowValue}
        >
          <FeatureStateScope stateKey={AGENT_VIEW_STATE} value={viewStateValue}>
            <FeatureStateScope stateKey={AGENT_PROGRESS_STATE} value={progress}>
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
