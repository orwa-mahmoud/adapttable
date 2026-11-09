---
"@adapttable/angular": minor
---

A table bundles only the code of the features it composes. Editing, edit history, find, CSV export, filters, header filters, grouping, the grouping panel, row reorder, row pinning and the tree each bring their implementation on the feature, so every Angular kit's plain table is about 32 KiB smaller gzipped (the unstyled kit: 129.0 KiB to 97.4 KiB). New exports: `withFeatureImplementation`, `featureImplementation` and the `FEATURE_IMPLEMENTATIONS` keys with their implementation types.
