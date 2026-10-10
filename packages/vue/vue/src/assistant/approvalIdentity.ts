import type { AgentApprovalPending } from "@adapttable/core";

/** Legacy hosts must replace proposal/operation references for a new approval. */
export function approvalIdentity(
  pending: AgentApprovalPending | null | undefined
): object | undefined {
  return pending?.identity ?? pending?.operation ?? pending?.proposals;
}
