/**
 * The table agent, as one controller any binding drives.
 *
 * This was React's provider, and almost none of it is about React: which
 * approval is open, what a click on it decides, what the reader waved through,
 * when the manifest is republished, when a browser agent is offered the table
 * and when it is told the tools are gone. A second framework rebuilding that
 * from the React source would be a second set of answers to the same
 * questions, and only one of them would get fixed.
 *
 * What stays in a binding is what only a framework can do:
 *
 * - keep {@link TableAgentControllerInputs.options} and
 *   {@link TableAgentControllerInputs.runtime} current on every render;
 * - commit its own pending state when asked (`flushAdmission`, `flush`);
 * - re-render on {@link TableAgentController.subscribe} and on the table's
 *   own changes ({@link TableAgentController.subscribeTable});
 * - call {@link TableAgentController.sync} after each commit, and
 *   {@link TableAgentController.disconnect} when it goes away;
 * - hand {@link TableAgentController.getState} to whatever its surfaces read.
 *
 * @packageDocumentation
 */
import type { AgentApprovalPending, AgentProgress } from "@adapttable/core";
import type { TableRuntime, TableRuntimeView } from "@adapttable/core/binding";

import { sharedApproval } from "./approvalConfig";
import {
  type ApprovalTransaction,
  assertAlwaysAllow,
  closeTransaction,
  createApprovalMemory,
  mayAlwaysAllow,
  openTransaction,
  type PendingApproval,
  recordDecision,
  settleDecisions,
} from "./approvalTransaction";
import {
  type AlwaysAllowedState,
  contractFingerprint,
  displayProposals,
  type TableAgentBridge,
} from "./binding";
import { tableActionSignature } from "./capabilities/actions";
import { capabilityDefinitionStamp } from "./capabilities/registry";
import type { AgentContextInputs } from "./context";
import { sampleColumns } from "./contextSampling";
import {
  alwaysAllowFor,
  bindLiveSession,
  capabilityKind,
  createRevisionCounter,
  exclusionKey,
  perItemRefusal,
  readerResolver,
  type RevisionCounter,
  sampledColumns,
  type TableAgentRuntimeOptions,
  viewInputsFromRuntime,
  viewRevisionStamp,
} from "./tableAgentRuntime";
import type { AgentSession, ApprovalResult, ApprovalSubject } from "./types";
import { registerWebMcpTools } from "./webmcp";

/**
 * Offering the table to a browser-resident agent.
 *
 * @public
 */
export interface TableAgentWebMcpOptions {
  readonly exposedTo?: readonly string[];
  /**
   * Told what was registered, and told `[]` when the registration goes.
   *
   * For a surface that lists the tools a browser agent can see. Nothing
   * depends on it: a page that does not care never passes it.
   */
  readonly onRegister?: (names: readonly string[]) => void;
}

/**
 * What a table agent is configured with.
 *
 * The runtime half — identity, policy, columns, the host's callbacks and
 * capabilities — is {@link TableAgentRuntimeOptions}. This adds where updates
 * are published and whether the table is offered to a browser-resident agent.
 *
 * @public
 */
export interface TableAgentControllerOptions extends TableAgentRuntimeOptions {
  /** Host callbacks for manifest and session attach. */
  readonly bridge?: TableAgentBridge<AgentApprovalPending>;
  /**
   * Offer this table's capabilities to a browser-resident agent.
   *
   * `true` offers everything the session permits; an object narrows the
   * surface. It narrows only — a capability the table excludes stays
   * unavailable, and a browser confirmation is in addition to the table's own
   * approval rather than instead of it. Does nothing in a browser without the
   * API, and nothing on a server.
   */
  readonly webmcp?: true | TableAgentWebMcpOptions;
}

/**
 * What {@link createTableAgentController} reads, each at the moment it needs
 * it.
 *
 * The references are read at call time rather than captured, so a controller
 * built once follows a binding whose options and runtime change after it was
 * built.
 *
 * @public
 */
export interface TableAgentControllerInputs {
  /** The binding's options as they stand. */
  readonly options: { readonly current: TableAgentControllerOptions };
  /** The live table as it stands. */
  readonly runtime: { readonly current: TableRuntime };
  /**
   * Commits a state change the binding still holds, before the session takes
   * its admission snapshot for a call.
   */
  readonly flushAdmission: () => void | Promise<void>;
  /**
   * Runs one view mutation and commits the state it changes before returning.
   */
  readonly flush: (run: () => void) => void;
}

/**
 * The table's live view and filter catalog, read when it is needed.
 *
 * @public
 */
export interface TableAgentViewReader {
  /** Read the table's live view and filter catalog, right now. */
  readonly read: () => AgentContextInputs;
}

/**
 * Everything a binding publishes to its surfaces.
 *
 * One value, replaced whenever any part of it changes, so a binding that
 * compares snapshots by identity re-renders exactly when it should.
 *
 * @public
 */
export interface TableAgentState {
  /** The live session, stable until the registry moves. */
  readonly session: AgentSession;
  /**
   * A write waiting on the table's own approval surface, or nothing.
   *
   * Always nothing when the host answers through `onApprove`.
   */
  readonly approval: AgentApprovalPending | null;
  /** What the reader has waved through, whether or not anything is open. */
  readonly alwaysAllow: AlwaysAllowedState;
  /** How far a running capability has got, and nothing once it stops. */
  readonly progress: AgentProgress | null;
  /** The live view, as the context builder wants it. */
  readonly view: TableAgentViewReader;
}

/**
 * One live table agent.
 *
 * @public
 */
export interface TableAgentController {
  /**
   * The live session.
   *
   * Rebuilt when the table's identity or what the agent may use changes —
   * the exclusions, who approves what, custom definitions and table actions —
   * because those are a different session rather than a different answer from the
   * same one. Safe to call while rendering.
   */
  readonly session: () => AgentSession;
  /** The current snapshot. Unchanged until something in it changes. */
  readonly getState: () => TableAgentState;
  /** Told when {@link getState} would return something new. */
  readonly subscribe: (listener: () => void) => () => void;
  /**
   * Where the table is, as a token that changes whenever it moves.
   *
   * A binding re-renders on it, because a table that moved is a manifest to
   * republish.
   */
  readonly tableStamp: () => string;
  /**
   * Told when the table moves, where the table can say so.
   *
   * Subscribes to the table current at the time of the call; a binding whose
   * table can be replaced subscribes again when it is.
   */
  readonly subscribeTable: (listener: () => void) => () => void;
  /**
   * Bring everything outside the controller up to date: republish a changed
   * manifest, hand the bridge the session, announce an approval that opened
   * or moved, sample the columns that asked, offer the tools to a browser
   * agent. Each happens only when what it depends on changed, so calling this
   * after every commit is the intended use.
   */
  readonly sync: () => void;
  /**
   * Let go of everything {@link sync} set up.
   *
   * An open approval is refused, an announced one retracted, a registration
   * withdrawn and a pending sample abandoned. A later {@link sync} starts
   * again, which is what a remount needs.
   */
  readonly disconnect: () => void;
}

/**
 * Create the controller behind a table agent.
 *
 * @param inputs - The binding's live options, runtime and commit hooks.
 * @returns A controller the binding subscribes to and syncs.
 *
 * @public
 */
export function createTableAgentController(
  inputs: TableAgentControllerInputs
): TableAgentController {
  const { options: optionsRef, runtime: runtimeRef } = inputs;
  const listeners = new Set<() => void>();
  const notify = () => {
    // Subscription changes during a publication apply to the next publication.
    const pendingListeners = [...listeners];
    for (const listener of pendingListeners) listener();
  };

  // --- the session -------------------------------------------------------

  // The registry is resolved when the session is built, so a change to what
  // the agent may use — or to who has to approve it — is a different session,
  // not a different answer from the same one.
  const registryKeyOf = (next: TableAgentControllerOptions): string =>
    `${exclusionKey(next.excludeCapabilities)}!${JSON.stringify(next.capabilityApproval ?? {})}!${tableActionSignature(runtimeRef.current.view()?.actions)}!${JSON.stringify((next.capabilities ?? []).map(capabilityDefinitionStamp))}`;
  let tableId: string | undefined;
  let registryKey: string | undefined;
  let revisions: RevisionCounter = createRevisionCounter();
  let session: AgentSession | null = null;
  let sessionGeneration = 0;
  let sessionRetirement: AbortController | undefined;
  let connected = true;
  const activeCalls = new Set<AbortController>();

  const bindLifecycle = (
    live: AgentSession,
    counter: RevisionCounter
  ): AgentSession => ({
    ...live,
    execute: async (key, args, expectedRevision, idempotencyKey, signal) => {
      // A retained bridge can outlive its table. Refuse before admission or
      // observation: even reading the runtime can touch a destroyed binding.
      if (!connected || signal?.aborted) {
        return {
          ok: false,
          revision: counter.current(),
          idempotencyKey,
          error: { code: "cancelled", message: "execute cancelled" },
        };
      }
      // Each call keeps its own cancellation after a reconnect. Fresh calls
      // can resume on the same session; old plans and approvals cannot.
      const controller = new AbortController();
      const abort = () => {
        controller.abort();
      };
      signal?.addEventListener("abort", abort, { once: true });
      activeCalls.add(controller);
      try {
        return await live.execute(
          key,
          args,
          expectedRevision,
          idempotencyKey,
          controller.signal
        );
      } finally {
        activeCalls.delete(controller);
        signal?.removeEventListener("abort", abort);
      }
    },
  });

  // Handed to the session once and read when it needs them, so the session is
  // never holding the first call's closure.
  const waitForChromeRef = {
    current: (subject: ApprovalSubject, signal?: AbortSignal) =>
      waitForChrome(subject, signal),
  };
  const reportProgressRef = {
    current: (report: AgentProgress | null) => {
      reportProgress(report);
    },
  };
  const flushAdmissionRef = { current: () => inputs.flushAdmission() };

  const currentSession = (): AgentSession => {
    const options = optionsRef.current;
    const key = registryKeyOf(options);
    if (session && tableId === options.tableId && registryKey === key) {
      return session;
    }
    const retired = sessionRetirement;
    const retirement = new AbortController();
    tableId = options.tableId;
    registryKey = key;
    revisions = createRevisionCounter();
    const boundGeneration = ++sessionGeneration;
    const boundTableId = options.tableId;
    const boundRegistryKey = key;
    const live = bindLiveSession({
      options: optionsRef,
      runtime: runtimeRef,
      revisions,
      flushAdmission: flushAdmissionRef,
      retirementSignal: retirement.signal,
      isCurrent: () =>
        connected &&
        boundGeneration === sessionGeneration &&
        boundTableId === optionsRef.current.tableId &&
        boundRegistryKey === registryKeyOf(optionsRef.current),
      waitForChrome: waitForChromeRef,
      reportProgress: reportProgressRef,
      flush: inputs.flush,
    });
    session = bindLifecycle(live, revisions);
    sessionRetirement = retirement;
    // Retiring a registry wakes only its admission wait. Already-running
    // handlers and approvals retain the session's existing revalidation rules.
    retired?.abort();
    return session;
  };

  // The contract the reader agreed about. A label, a permission or a
  // capability changing makes it a different table, and the memory clears.
  const contractVersion = (): string => {
    const live = currentSession();
    return contractFingerprint(live.manifest(), live.catalog());
  };

  const tableStamp = (): string => {
    const view = runtimeRef.current.view();
    // The session owns the source epoch. Reuse its observation revision so
    // replacing an engine at the same tuple also republishes the snapshot.
    return `${String(currentSession().manifest().viewRevision)}:${viewRevisionStamp(view)}`;
  };

  // --- approvals ---------------------------------------------------------

  // What the reader has said not to be asked about again. Scoped to the
  // contract, so it forgets the moment the table is not the one they agreed
  // about.
  const approvalMemory = createApprovalMemory();
  // Bumped whenever the remembered set changes, so the published list is
  // rebuilt. The memory cannot say so itself.
  let allowances = 0;
  let transaction: ApprovalTransaction | null = null;
  let pending: PendingApproval | null = null;
  let pendingSignal: AbortSignal | undefined;
  let transactionId = 0;
  let progress: AgentProgress | null = null;

  const setTransaction = (
    next:
      | ApprovalTransaction
      | null
      | ((current: ApprovalTransaction | null) => ApprovalTransaction | null)
  ) => {
    const value = typeof next === "function" ? next(transaction) : next;
    if (value === transaction) return;
    transaction = value;
    notify();
    // Answering the last row settles the write. A write that named no rows
    // has no last row to answer: it waits for an explicit whole decision —
    // an empty decision list is not "everything is decided", it is "there was
    // never anything to enumerate".
    if (
      value &&
      value.pending.proposals.length > 0 &&
      !value.decisions.includes("pending")
    ) {
      value.pending.resolve(settleDecisions(value.decisions, "rejected"));
    }
  };

  const alwaysAllowedFor = (capability: string | undefined): boolean => {
    const options = optionsRef.current;
    return mayAlwaysAllow({
      capability,
      kind: capabilityKind(currentSession(), capability),
      alwaysAllow: alwaysAllowFor(
        options.approval,
        options.capabilities,
        capability
      ),
    });
  };

  function waitForChrome(
    subject: ApprovalSubject,
    signal?: AbortSignal
  ): Promise<ApprovalResult> {
    if (pending) {
      return Promise.reject(new Error("an approval is already pending"));
    }
    // Consulted only here, after the session has already decided a human
    // would be asked. It can never turn `approval: "never"` into a write
    // nobody saw, and it never answers for a write that enumerates rows.
    const capability =
      subject.kind === "operation" ? subject.capability : undefined;
    if (
      alwaysAllowedFor(capability) &&
      capability !== undefined &&
      approvalMemory.allows(capability, contractVersion())
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
        // Settled once, whoever gets there first: the reader, an abort, a
        // disconnect, or the last row being answered. A second call is a
        // no-op rather than a second answer to one question.
        resolve: (result: ApprovalResult) => {
          if (settled) return;
          settled = true;
          if (pending === entry) {
            pending = null;
            pendingSignal = undefined;
          }
          setTransaction(closeTransaction(entry));
          signal?.removeEventListener("abort", onAbort);
          resolve(result);
        },
      };
      const onAbort = () => {
        entry.resolve(false);
      };
      pending = entry;
      pendingSignal = signal;
      // Identity and decisions in one write, so no snapshot ever shows this
      // write's rows beside the last write's answers. Resolved by the session
      // for THIS action, so an override of `ai.approval.presentation` reaches
      // the surface that draws it.
      transactionId += 1;
      setTransaction(
        openTransaction(transactionId, entry, subject.presentation)
      );
      if (signal?.aborted) {
        entry.resolve(false);
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  // A control left over from a settled approval finds a different id and
  // does nothing; a position that is not a row of THIS plan changes nothing
  // either.
  const decideAt = (id: number) => (index: number, approved: boolean) => {
    setTransaction((current) => recordDecision(current, id, index, approved));
  };

  const approvalFor = (open: ApprovalTransaction): AgentApprovalPending => ({
    proposals: open.pending.proposals,
    ...(open.pending.operation ? { operation: open.pending.operation } : {}),
    decisions: open.decisions,
    presentation: open.presentation,
    // "Approve remaining" is what these mean once rows have been decided: a
    // row already refused stays refused, or the control undoes the reader's
    // own work.
    //
    // A write that cannot be split is answered whole — a row move, a custom
    // operation, or one that enumerates no rows at all. Sending positions for
    // one of those reaches the session as a decision it is right to refuse,
    // and an empty list reads as "approved none".
    ...(alwaysAllowedFor(open.pending.capability)
      ? {
          alwaysAllow: () => {
            const capability = open.pending.capability;
            if (capability === undefined) return;
            approvalMemory.remember(capability, contractVersion());
            allowances += 1;
            open.pending.resolve(true);
          },
        }
      : {}),
    approve: () => {
      open.pending.resolve(
        open.pending.perItem
          ? settleDecisions(open.decisions, "approved")
          : true
      );
    },
    reject: (reason?: string) => {
      // A kit's button is wired `onClick={onReject}`, and the slot contract
      // says the handler takes nothing — so what actually arrives is a click
      // event. The declared type is a claim, not a fact: anything that is not
      // a stated reason is no reason at all.
      const stated = typeof reason === "string" ? reason.trim() : undefined;
      if (open.pending.perItem) {
        open.pending.resolve(perItemRefusal(open, stated));
        return;
      }
      // A write answered whole is a plain refusal unless the reader said
      // something, in which case an empty approval list carries the words.
      open.pending.resolve(stated ? { approved: [], reason: stated } : false);
    },
    ...(open.pending.perItem ? { decideAt: decideAt(open.id) } : {}),
  });

  const revoke = (capability: string) => {
    approvalMemory.revoke(capability);
    allowances += 1;
    notify();
  };

  // Both destinations, from the one report: the table's own surfaces read the
  // snapshot, and a panel mounted outside the table reads the bridge.
  function reportProgress(report: AgentProgress | null): void {
    progress = report;
    notify();
    optionsRef.current.bridge?.progress?.(report);
  }

  // --- the live view -----------------------------------------------------

  // Live values for the columns whose author opted in. Read once per set of
  // columns rather than once per turn: sampling is a read against the table,
  // and a table publishing ten sampled columns must not open ten reads every
  // time somebody types. Held here because the reader below is synchronous —
  // the context builder performs no I/O, which is the rule this keeps.
  let samples: Readonly<Record<string, readonly unknown[]>> = {};
  // Read through a stable function rather than captured: a turn reads it when
  // it starts and again when it settles, and a value taken earlier would
  // report that nothing moved between the two — which is exactly what
  // per-turn undo has to be able to tell.
  const view: TableAgentViewReader = {
    read: () => {
      const runtime = runtimeRef.current;
      const sameSource =
        sampling !== null &&
        !sampling.controller.signal.aborted &&
        sampling.table === runtime.view()?.neutralTable;
      return viewInputsFromRuntime(
        runtime,
        optionsRef.current,
        sameSource ? samples : {}
      );
    },
  };

  // --- the snapshot ------------------------------------------------------

  let snapshot: TableAgentState | null = null;
  let snapshotOf: {
    readonly session: AgentSession;
    readonly transaction: ApprovalTransaction | null;
    readonly progress: AgentProgress | null;
    readonly allowances: number;
    readonly stamp: string;
    readonly hostApproves: boolean;
  } | null = null;

  // The chrome path is the only one that parks: with `onApprove` the host
  // answers directly and nothing is ever left open here. Rebuilt only when the
  // transaction moved, because a decision inside it is a new transaction.
  const approvalNow = (
    hostApproves: boolean,
    kept: AgentApprovalPending | null | undefined
  ): AgentApprovalPending | null => {
    if (hostApproves || !transaction) return null;
    return kept ?? approvalFor(transaction);
  };

  const getState = (): TableAgentState => {
    const live = currentSession();
    const stamp = tableStamp();
    const hostApproves = optionsRef.current.onApprove !== undefined;
    const before = snapshotOf;
    if (
      snapshot !== null &&
      before !== null &&
      before.session === live &&
      before.transaction === transaction &&
      before.progress === progress &&
      before.allowances === allowances &&
      before.stamp === stamp &&
      before.hostApproves === hostApproves
    ) {
      return snapshot;
    }
    const same =
      snapshot !== null && before !== null && before.session === live;
    snapshot = {
      session: live,
      approval: approvalNow(
        hostApproves,
        same && before.transaction === transaction ? snapshot?.approval : null
      ),
      // A revoke, or the table moving: the memory cannot say so itself, and a
      // contract change is what clears it.
      alwaysAllow:
        same &&
        snapshot &&
        before.allowances === allowances &&
        before.stamp === stamp
          ? snapshot.alwaysAllow
          : {
              capabilities: approvalMemory.remembered(contractVersion()),
              revoke,
            },
      progress,
      view,
    };
    snapshotOf = {
      session: live,
      transaction,
      progress,
      allowances,
      stamp,
      hostApproves,
    };
    return snapshot;
  };

  // --- what sync keeps up to date ------------------------------------------

  let lastManifest = "";
  let attachedTo: {
    readonly bridge: TableAgentBridge<AgentApprovalPending> | undefined;
    readonly session: AgentSession;
  } | null = null;
  let sampling: {
    readonly session: AgentSession;
    readonly key: string;
    readonly table: TableRuntimeView["neutralTable"];
    readonly controller: AbortController;
  } | null = null;
  let checkedAllowances: {
    readonly session: AgentSession;
    readonly stamp: string;
  } | null = null;
  let registration: {
    readonly session: AgentSession;
    readonly webmcp: true | TableAgentWebMcpOptions;
    readonly version: string;
    readonly dispose: () => void;
  } | null = null;
  // Who is listening for approvals, and what they were last told. Compared by
  // the subscriber's own identity rather than the bridge's: a host that
  // rebuilds `bridge={{ ... }}` inline on every render still passes the same
  // `approvals` function, and re-announcing an unchanged state is noise a host
  // cannot filter.
  let approvalsSubscriber = optionsRef.current.bridge?.approvals;
  // The transaction last announced, not merely whether one was. A decision
  // taken inside an open approval changes what a subscriber should be
  // holding.
  let announced: ApprovalTransaction | null = null;
  let told: {
    readonly to: ((state: AlwaysAllowedState) => void) | undefined;
    readonly state: AlwaysAllowedState;
  } | null = null;

  const syncManifest = (live: AgentSession) => {
    const manifest = live.manifest();
    const encoded = JSON.stringify(manifest);
    if (encoded === lastManifest) return;
    lastManifest = encoded;
    optionsRef.current.bridge?.publish?.(manifest);
  };

  const syncBridge = (live: AgentSession) => {
    const bridge = optionsRef.current.bridge;
    if (
      attachedTo !== null &&
      attachedTo.bridge === bridge &&
      attachedTo.session === live
    ) {
      return;
    }
    attachedTo = { bridge, session: live };
    bridge?.attach?.(live);
    // The reader is stable for the life of the controller, so a host takes it
    // once and calls it whenever it needs the view — rather than being pushed
    // a copy on every change and having to keep it in step.
    bridge?.viewInputs?.(view.read);
  };

  // Registration belongs to a contract version: a table whose capabilities or
  // columns moved is a different set of tools, so the old ones go and the new
  // ones are offered.
  const syncWebMcp = (live: AgentSession) => {
    const webmcp = optionsRef.current.webmcp;
    const version = webmcp ? contractVersion() : "";
    if (
      registration?.session === live &&
      registration.webmcp === webmcp &&
      registration.version === version
    ) {
      return;
    }
    withdraw();
    if (!webmcp) return;
    const offer = webmcp === true ? {} : webmcp;
    const registered = registerWebMcpTools(live, {
      ...(offer.exposedTo ? { exposedTo: offer.exposedTo } : {}),
      onWarning: (warning) => {
        // A page whose policy forbids this is configured that way on purpose.
        // Saying so once beats throwing into a render.
        console.warn(`[adapttable] webmcp: ${warning.message}`);
      },
    });
    offer.onRegister?.(registered.names);
    registration = {
      session: live,
      webmcp,
      version,
      dispose: () => {
        registered.dispose();
        // Said plainly rather than left standing: the tools are gone, and a
        // surface listing them would otherwise show a set nothing can call.
        offer.onRegister?.([]);
      },
    };
  };

  const withdraw = () => {
    const previous = registration;
    registration = null;
    previous?.dispose();
  };

  // Sampled once for the source and set of columns that asked, never on an
  // ordinary data tick. A replacement source abandons the old read just as a
  // disconnect does: its values belong to a table the reader has left.
  const syncSamples = (live: AgentSession) => {
    const key = sampledColumns(live).join(" ");
    const table = runtimeRef.current.view()?.neutralTable;
    if (
      sampling?.session === live &&
      sampling.key === key &&
      sampling.table === table
    )
      return;
    sampling?.controller.abort();
    samples = {};
    const controller = new AbortController();
    sampling = { session: live, key, table, controller };
    const wanted = key === "" ? [] : key.split(" ");
    if (wanted.length === 0) return;
    void sampleColumns(live, wanted, controller.signal).then(
      (values) => {
        if (
          controller.signal.aborted ||
          runtimeRef.current.view()?.neutralTable !== table
        )
          return;
        samples = values;
      },
      () => {
        // A sample is an illustration, not a result. A table that cannot
        // supply one publishes the author's own examples and nothing else,
        // rather than failing a turn nobody has started.
        if (!controller.signal.aborted) samples = {};
      }
    );
  };

  const syncApprovals = () => {
    const approvals = optionsRef.current.bridge?.approvals;
    if (approvalsSubscriber !== approvals) {
      // A genuinely different subscriber. The one being replaced must not be
      // left believing an approval is still open, and the one arriving has
      // never been told anything.
      if (announced) approvalsSubscriber?.(null);
      approvalsSubscriber = approvals;
      announced = null;
    }
    const state = getState();
    const next = state.approval ? transaction : null;
    if (announced === next) return;
    announced = next;
    approvals?.(state.approval);
  };

  // Checked once per contract, where the configuration first meets a live
  // catalog. A key this table does not offer is a control the developer
  // believes they shipped and the reader never sees, so it is an error rather
  // than a silence.
  const syncAllowanceCheck = (live: AgentSession) => {
    const stamp = tableStamp();
    if (
      checkedAllowances?.session === live &&
      checkedAllowances.stamp === stamp
    )
      return;
    checkedAllowances = { session: live, stamp };
    assertAlwaysAllow(
      sharedApproval(optionsRef.current.approval).alwaysAllow,
      live.catalog().map((entry) => entry.key)
    );
  };

  // Published the same way the manifest and the approval are: a panel mounted
  // beside the table cannot read the table's own state, so a reader who waved
  // a capability through would have nowhere to take it back.
  const syncAllowed = () => {
    const to = optionsRef.current.bridge?.alwaysAllowed;
    const state = getState().alwaysAllow;
    if (told !== null && told.to === to && told.state === state) return;
    told = { to, state };
    to?.(state);
  };

  return {
    session: currentSession,
    getState,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    tableStamp,
    subscribeTable: (listener) => {
      const table = runtimeRef.current.view()?.neutralTable;
      return table ? table.subscribe("all", listener) : () => undefined;
    },
    sync: () => {
      connected = true;
      const live = currentSession();
      syncManifest(live);
      syncWebMcp(live);
      syncBridge(live);
      syncSamples(live);
      syncApprovals();
      syncAllowanceCheck(live);
      syncAllowed();
    },
    disconnect: () => {
      connected = false;
      withdraw();
      const refusedSignal = pendingSignal;
      pending?.resolve(false);
      const admitted = [...activeCalls];
      activeCalls.clear();
      for (const controller of admitted) {
        // The open chrome approval is already terminally refused above.
        // Preserve that receipt instead of racing its refusal with an abort.
        if (controller.signal !== refusedSignal) controller.abort();
      }
      sampling?.controller.abort();
      sampling = null;
      // Going away is a close. Without this the host is left showing
      // "waiting for you" for an approval whose table no longer exists.
      if (announced) {
        announced = null;
        approvalsSubscriber?.(null);
      }
      attachedTo = null;
      checkedAllowances = null;
      told = null;
    },
  };
}
