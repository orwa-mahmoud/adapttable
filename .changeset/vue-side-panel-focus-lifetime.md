---
"@adapttable/vue": patch
"@adapttable/vue-unstyled": patch
---

Retire side-panel callbacks and queued focus when their model, renderer or mounted
session changes. Preserve ordinary native keyboard selection with stable control
slots, keep externally moved focus in place, and derive valid tab IDs from opaque
panel keys without changing the host's keys.
