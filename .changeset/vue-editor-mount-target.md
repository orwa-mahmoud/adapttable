---
"@adapttable/vue": patch
---

Retain native editor targets registered before their parent mounts so existing
cell and row editing sessions receive focus. Keep focus activity checks and
reject targets from retired sessions or disposed owners.
