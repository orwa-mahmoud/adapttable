---
"@adapttable/vue": patch
---

Keep mobile-sort and page-size layout wrappers neutral so kit selects can own
their native labels without invalid nested labels. Preserve the localized
control names and native targets through server rendering and hydration.
