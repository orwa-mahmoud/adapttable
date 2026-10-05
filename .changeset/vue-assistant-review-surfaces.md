---
"@adapttable/vue": minor
"@adapttable/vue-unstyled": patch
---

Add optional controlled expansion callbacks to approval review Chrome and
show full widget approvals in their own conversation surface with Back and
Escape focus return. Preserve review state across decision snapshots and
retire it when its approval or conversation is replaced.

Restore semantic receipt groups, scoped per-action and turn undo, visible
blocked explanations, speaker and question structures, and a dedicated
approval live region. The native examples control now uses a keyboard
accessible disclosure with command descriptions, disabled-state handling,
and lifecycle cleanup.

Bind receipt, turn and host-message actions to their displayed lifetime and
captured callback, retiring retained handlers on removal, replacement and
KeepAlive suspension. The multi-action undo example uses sort and search,
whose actual view state is supported by the neutral undo contract.
