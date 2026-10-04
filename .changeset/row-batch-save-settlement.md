---
"@adapttable/core": minor
---

Add optional validation and asynchronous save state to the row and batch editing stores. Keep drafts available while a host save is pending or rejected, validate a batch before sending it, and discard stale continuations after cancellation, reconfiguration or disposal. Synchronous saves retain their existing callback order.
