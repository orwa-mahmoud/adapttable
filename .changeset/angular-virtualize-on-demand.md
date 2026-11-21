---
"@adapttable/angular": minor
---

Row windowing ships with `virtualize()`. A table that does not compose it no longer bundles the virtualizer: the Unstyled table drops from 95.7 to 87.0 KiB gzip and the lean structural host from 46.8 to 38.0 KiB. `FEATURE_IMPLEMENTATIONS.virtualize` and its `VirtualizeImplementation` type carry the windowing code.
