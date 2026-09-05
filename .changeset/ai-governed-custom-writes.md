---
"@adapttable/ai": minor
---

A custom capability declared `kind: "write"` or `"destructive"` is now governed
like a built-in one: the session enforces write policy and commit mode,
requests approval, and revalidates the revision before the handler runs. A
handler that never calls `onApprove` no longer writes unapproved. Declare
`staging: "supported"` for a capability that can honour `commit: "stage"`;
without it a staged table rejects the call instead of committing it.

`rows.read` no longer returns more than the current declaration permits, and an
idempotency key reused with different arguments fails instead of replaying an
unrelated result.
