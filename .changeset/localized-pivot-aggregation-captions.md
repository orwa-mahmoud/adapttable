---
"@adapttable/core": minor
"@adapttable/vue": patch
---

Allow `measureLabel` and `pivotPanelZones` to receive aggregation captions so hosts
can localize pivot measure labels without changing field/aggregation keys or
configuration. Default captions and authored labels remain unchanged. Vue pivot
chips and remove controls use the same localized captions as their selector.
