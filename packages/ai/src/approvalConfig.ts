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
    };

/** Both questions answered, with nothing left to inherit. @public */
export interface ResolvedApproval {
  /** Which capabilities need a human. */
  readonly policy: ApprovalPolicy;
  /** Where the reader is asked. */
  readonly presentation: ApprovalPresentation;
}

/** Asking for writes, in the conversation. What a table gets by saying nothing. */
const SHARED_DEFAULT: ResolvedApproval = {
  policy: "writes",
  presentation: "widget",
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
