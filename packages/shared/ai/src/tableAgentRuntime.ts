/**
 * A live table runtime, mapped onto an agent session.
 *
 * A binding publishes its table as a `TableRuntime`: the latest composed view
 * and the setters beside it. This module reads that view as an observation,
 * serves row reads and row resolution from it, routes view changes and cell
 * writes through its setters, and binds all of it to one `AgentSession`. What
 * stays with the binding is its lifecycle — when a session is rebuilt, how a
 * pending state change is committed, and where an approval is drawn.
 */
import { type TableRuntimeView } from "@adapttable/core/binding";

import { contractFingerprint } from "./binding";
import { tableActionCapabilities } from "./capabilities/actions";
import { capabilityDefinitionStamp } from "./capabilities/registry";
import { createLiveApplyCoordinator } from "./controlledApply";
import { viewRevisionStamp } from "./runtimeViewStamp";
import { createAgentSessionInternal } from "./session";
export { viewRevisionStamp } from "./runtimeViewStamp";
import {
  currentApply,
  type LiveSessionInputs,
  waitForAdmission,
} from "./tableAgentLive";
import { observationFromRuntime } from "./tableAgentObservation";
import { asCallable, BINDING_VIEW_MUTATIONS } from "./tableAgentPolicy";
import type {
  AgentApply,
  AgentCapabilityDefinition,
  AgentObservation,
  AgentSession,
  ApprovalSubject,
} from "./types";
export type { LiveSessionInputs, RevisionCounter } from "./tableAgentLive";
export { createRevisionCounter } from "./tableAgentLive";
export type { TableAgentRuntimeOptions } from "./tableAgentObservation";
export {
  alwaysAllowFor,
  capabilityKind,
  exclusionKey,
  perItemRefusal,
  readerResolver,
  sampledColumns,
  viewInputsFromRuntime,
} from "./tableAgentPolicy";

/**
 * One agent session over a live table runtime.
 *
 * The session observes the runtime view on every call and applies through its
 * setters, with the host's own `apply` callbacks laid over them. Its
 * capabilities are the host's definitions followed by one per row and bulk
 * action the table composed. A view mutation this mapping implements runs
 * inside `flush`, so the revision it produces is attributed to that call, and
 * every `execute` commits the binding's pending state first through
 * `flushAdmission`, so a reader's own change is refused as foreign rather than
 * swept into the agent's call.
 *
 * @public
 */
export function bindLiveSession(inputs: LiveSessionInputs): AgentSession {
  const {
    options: optionsRef,
    runtime: runtimeRef,
    revisions: revisionCounter,
    flushAdmission,
    waitForChrome,
    reportProgress,
    flush,
  } = inputs;
  const apply = new Proxy<AgentApply>(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") return undefined;
        const live = currentApply(
          optionsRef.current,
          runtimeRef.current
        ) as Record<string, unknown>;
        if (!(prop in live)) return undefined;
        return (...args: unknown[]) => {
          const options = optionsRef.current;
          const latest = currentApply(options, runtimeRef.current) as Record<
            string,
            unknown
          >;
          const fn = asCallable(latest[prop]);
          if (!fn) return undefined;
          const host = options.apply as Record<string, unknown> | undefined;
          if (BINDING_VIEW_MUTATIONS.has(prop) && !asCallable(host?.[prop])) {
            let result: unknown;
            flush(() => {
              result = fn(...args);
            });
            return result;
          }
          return fn(...args);
        };
      },
    }
  );
  let observedTable: TableRuntimeView["neutralTable"];
  let sourceEpoch = 0;
  let hasObservedView = false;
  let observedRevision: number | undefined;
  let observationEpoch = 0;
  const trackedObservation = (
    observation: AgentObservation
  ): AgentObservation => {
    if (
      observedRevision !== undefined &&
      observedRevision !== observation.viewRevision
    )
      observationEpoch += 1;
    observedRevision = observation.viewRevision;
    return observation;
  };
  const trackSource = (view: TableRuntimeView | undefined): void => {
    const table = view?.neutralTable;
    if (table !== observedTable) {
      observedTable = table;
      sourceEpoch += 1;
    }
  };
  const observe = () => {
    const options = optionsRef.current;
    if (options.observe) {
      // Controlled delivery still belongs to one runtime source, while the
      // host keeps ownership of the observation object and revision numbering.
      if (inputs.settleApply) trackSource(runtimeRef.current.view());
      return trackedObservation(options.observe());
    }
    const runtimeView = runtimeRef.current.view();
    trackSource(runtimeView);
    // Bindings can observe before their first view is published. That is
    // bootstrap, not a previous source: reserve revision 1 for the first
    // real view. Once published, absence is a transition like any other.
    if (runtimeView) hasObservedView = true;
    const viewRevision = hasObservedView
      ? revisionCounter.bumpFromStamp(
          `${String(sourceEpoch)}:${viewRevisionStamp(runtimeView)}`
        )
      : revisionCounter.current();
    return trackedObservation(
      observationFromRuntime(options, runtimeRef.current, viewRevision, apply)
    );
  };
  const onApprove = (subject: ApprovalSubject, signal?: AbortSignal) => {
    const options = optionsRef.current;
    if (options.onApprove) return options.onApprove(subject, signal);
    // No second policy decision here. The session already resolved whether a
    // human is asked, for THIS capability, with the action's own override
    // applied — so a table that asks for nothing by default can still mark
    // one action always-ask.
    return waitForChrome.current(subject, signal);
  };
  const customCapabilities = (optionsRef.current.capabilities ?? []).map(
    (definition): AgentCapabilityDefinition => {
      const stamp = capabilityDefinitionStamp(definition);
      // Read metadata from the original and bind methods to it. A custom
      // definition can be a class whose getters and handlers use private state.
      return {
        key: definition.key,
        summary: definition.summary,
        guide: definition.guide,
        kind: definition.kind,
        discovery: definition.discovery,
        presentation: definition.presentation,
        staging: definition.staging,
        partial: definition.partial,
        idempotent: definition.idempotent,
        ai: definition.ai,
        plan: definition.plan?.bind(definition),
        execute: definition.execute.bind(definition),
        isEnabled: (observation) => {
          const current = optionsRef.current.capabilities?.find(
            (candidate) => candidate.key === definition.key
          );
          // A retained session must not run an old handler after the host
          // removed or replaced its definition, including after approval.
          return (
            current !== undefined &&
            capabilityDefinitionStamp(current) === stamp &&
            current.isEnabled(observation)
          );
        },
      };
    }
  );
  const settlement = inputs.settleApply;
  const coordinator = settlement
    ? createLiveApplyCoordinator({
        view: () => runtimeRef.current.view(),
        observe,
        contract: () => contractFingerprint(inner.manifest(), inner.catalog()),
        sourceEpoch: () => sourceEpoch,
        revisionEpoch: () => observationEpoch,
        isCurrent: () => inputs.isCurrent?.() !== false,
        retirementSignal: inputs.retirementSignal,
        bindingOwned: (method) =>
          typeof optionsRef.current.apply?.[method] !== "function",
        invoke: (method, args) => {
          const latest = currentApply(optionsRef.current, runtimeRef.current);
          const fn = asCallable(Reflect.get(latest, method));
          if (!fn) throw new Error(`${method} is not wired`);
          fn(...args);
        },
        flush,
        settle: settlement,
      })
    : undefined;
  const inner = createAgentSessionInternal(
    {
      observe,
      apply,
      onApprove,
      // Read at call time, like everything else here. The session is built once
      // and a host may wire where progress goes after that, so what a capability
      // reports is delivered through the reference rather than through whatever
      // was configured when the session was made.
      onProgress: (report) => {
        reportProgress.current(report);
      },
      // The host's own definitions, then one per row and bulk action the table
      // composed. The action set is part of the registry key, so a table that
      // gains or loses an action gets a session that offers exactly those.
      capabilities: [
        ...customCapabilities,
        ...tableActionCapabilities(runtimeRef.current.view()?.actions, {
          actions: () => runtimeRef.current.view()?.actions,
          rowFor: (rowKey) => {
            const view = runtimeRef.current.view();
            return view?.rows.find((row) => view.getRowId(row) === rowKey);
          },
          selectedIds: () => {
            const selection = runtimeRef.current.view()?.selection;
            return selection ? [...selection.selectedIds] : undefined;
          },
        }),
      ],
      ...(optionsRef.current.capabilityApproval
        ? { capabilityApproval: optionsRef.current.capabilityApproval }
        : {}),
      ...(optionsRef.current.excludeCapabilities
        ? { excludeCapabilities: optionsRef.current.excludeCapabilities }
        : {}),
    },
    coordinator
  );
  return {
    catalog: () => inner.catalog(),
    describe: (key: string) => inner.describe(key),
    execute: async (
      key: string,
      args: unknown,
      expectedRevision: number,
      idempotencyKey: string,
      signal?: AbortSignal
    ) => {
      // The binding may still hold a reader's earlier state change. It is
      // committed before the session takes its admission snapshot, so that
      // change is refused as foreign, never swept into the revision of the
      // agent call below. The mapping's own mutation is committed in `apply`
      // above.
      if (signal?.aborted) {
        return {
          ok: false,
          revision: revisionCounter.current(),
          idempotencyKey,
          error: { code: "cancelled", message: "execute cancelled" },
        };
      }
      if (inputs.retirementSignal?.aborted) {
        return {
          ok: false,
          revision: revisionCounter.current(),
          idempotencyKey,
          error: {
            code: "not-wired",
            message: `capability "${key}" is not wired on this table`,
          },
        };
      }
      const admission = flushAdmission.current();
      if (admission && typeof admission.then === "function") {
        try {
          await waitForAdmission(admission, signal, inputs.retirementSignal);
        } catch (error) {
          if (!signal?.aborted && !inputs.retirementSignal?.aborted)
            throw error;
        }
      }
      // A disconnect permanently aborts this call. Check it before a validity
      // reader can touch the runtime, including after a rejected barrier.
      if (signal?.aborted) {
        return {
          ok: false,
          revision: revisionCounter.current(),
          idempotencyKey,
          error: { code: "cancelled", message: "execute cancelled" },
        };
      }
      if (inputs.retirementSignal?.aborted || inputs.isCurrent?.() === false) {
        return {
          ok: false,
          revision: revisionCounter.current(),
          idempotencyKey,
          error: {
            code: "not-wired",
            message: `capability "${key}" is not wired on this table`,
          },
        };
      }
      const result = await inner.execute(
        key,
        args,
        expectedRevision,
        idempotencyKey,
        signal
      );
      return result;
    },
    manifest: () => inner.manifest(),
  };
}
