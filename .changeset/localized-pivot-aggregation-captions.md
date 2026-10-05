---
"@adapttable/core": minor
"@adapttable/vue": patch
---

Add an optional aggregation caption map to `measureLabel` and `pivotPanelZones` so hosts can localize pivot measure captions without changing field keys, aggregation keys, or pivot configuration. Existing default captions and authored measure labels remain unchanged.

Use the shared localized aggregation captions in Vue pivot chips and remove controls, matching the aggregation selector.
