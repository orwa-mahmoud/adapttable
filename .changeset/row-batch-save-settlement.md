---
"@adapttable/core": minor
---

Add optional validation and asynchronous save state to row and batch editing.
Drafts remain available while a host save is pending or rejected, and batches
validate before submission. Ignore stale continuations after cancellation,
reconfiguration or disposal. Synchronous saves retain their callback order.
