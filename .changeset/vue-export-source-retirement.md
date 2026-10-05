---
"@adapttable/vue": patch
---

Retire active exports when their source is replaced, including pending host
requests that cannot be canceled. Ignore their late outcomes and prevent
retained controls from acting on the replacement source. Preserve active jobs
across ordinary snapshots from the same built-in source.
