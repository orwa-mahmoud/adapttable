/**
 * Where an approval is asked, and whether it is asked at all.
 *
 * Two independent questions that are easy to confuse. **Policy** decides
 * whether a human is asked; **presentation** decides where. Turning approval
 * off does not move a surface, and choosing a surface does not authorize
 * anything.
 *
 * Both resolve the same way: the shared assistant configuration is the
 * default, and an action may override either FIELD on its own. Overriding
 * only the policy leaves the presentation as the shared one, which is what
 * lets a table say "review in the widget" once and then mark two sensitive
 * actions as always-ask without repeating itself.
 */
import type {
  ActionAiOptions,
  ActionApprovalPolicy,
  ApprovalPresentation,
} from "@adapttable/core";

import type { ApprovalPolicy } from "./keys";

/**
 * The assistant's own approval defaults.
 *
 * The string form is the policy alone, so a table that only cares whether
 * writes are confirmed keeps writing `approval: "writes"`.
 *
 * @public
 */
export type SharedApproval =
  | ApprovalPolicy
  | {
      /** Which capabilities need a human. Defaults to `"writes"`. */
      readonly policy?: ApprovalPolicy;
      /** Where they are asked. Defaults to `"widget"`. */
      readonly presentation?: ApprovalPresentation;
      /**
       * Capabilities a reader may wave through for the session.
       *
       * Off by default, and an opt-in rather than an opt-out: the control is
       * absent for every key not named here, so a developer who says nothing
       * ships a table where "don't ask again" does not exist. Built-in keys
       * are {@link CapabilityKey} values; a custom capability's own key works
       * the same way.
       *
       * It only ever narrows. A destructive capability, an action whose own
       * configuration demands a human, a host `onApprove` and the backend's
       * own authorization all still win — naming a key here cannot reach past
       * any of them.
       */
      readonly alwaysAllow?: false | readonly string[];
    };

/** Both questions answered, with nothing left to inherit. @public */
export interface ResolvedApproval {
  /** Which capabilities need a human. */
  readonly policy: ApprovalPolicy;
  /** Where the reader is asked. */
  readonly presentation: ApprovalPresentation;
  /**
   * Capabilities the reader may wave through, as the developer opted them in.
   *
   * Empty is the default and means the control is never drawn.
   */
  readonly alwaysAllow: readonly string[];
}

/** Asking for writes, in the conversation. What a table gets by saying nothing. */
const SHARED_DEFAULT: ResolvedApproval = {
  policy: "writes",
  presentation: "widget",
  alwaysAllow: [],
};

/** Read the shared configuration, in either of its two spellings. */
export function sharedApproval(
  approval: SharedApproval | undefined
): ResolvedApproval {
  if (approval === undefined) return SHARED_DEFAULT;
  if (typeof approval === "string") {
    return { ...SHARED_DEFAULT, policy: approval };
  }
  return {
    policy: approval.policy ?? SHARED_DEFAULT.policy,
    presentation: approval.presentation ?? SHARED_DEFAULT.presentation,
    // `false` and absence are the same answer, spelled two ways: nobody opted
    // anything in.
    alwaysAllow:
      approval.alwaysAllow === false ? [] : (approval.alwaysAllow ?? []),
  };
}

/**
 * Apply one action's overrides to the shared configuration.
 *
 * Field by field, never wholesale: an action that names a presentation and
 * no policy keeps the shared policy, and vice versa. An absent `ai` object
 * changes nothing — a missing key never means "authorized".
 *
 * @param shared - The resolved shared configuration.
 * @param action - The action's own overrides, if it has any.
 * @returns Both questions answered for this action.
 *
 * @public
 */
export function resolveApproval(
  shared: ResolvedApproval,
  action: ActionAiOptions | undefined
): ResolvedApproval {
  const override = action?.approval;
  if (!override) return shared;
  return {
    policy: policyOf(override.policy, shared.policy),
    presentation: override.presentation ?? shared.presentation,
    // An action that demands a human keeps demanding one. "Don't ask again"
    // is the reader's convenience, never a way around a rule the table set.
    alwaysAllow: override.policy === "required" ? [] : shared.alwaysAllow,
  };
}

/**
 * An action's answer to "is a human asked", or the table's if it has none.
 *
 * `required` and `automatic` answer the same question the shared policy
 * answers, so they replace it rather than sitting beside it: an action that
 * must be confirmed asks on a table that asks for nothing, and an automatic
 * one skips the human on a table that asks for writes.
 */
function policyOf(
  override: ActionApprovalPolicy | undefined,
  shared: ApprovalPolicy
): ApprovalPolicy {
  if (override === undefined) return shared;
  return override === "required" ? "writes" : "never";
}
