---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/ai": minor
"@adapttable/i18n": minor
---

Column defaults now drive the calculation and the first server request, not
only the panel. Reader suppression is gated the same way as operation
choice; custom operation ids survive URL and saved-view round-trips; date
min/max compare ISO values; grouped columns stay aggregatable; and
`view.setAggregations` is the agent command for the same model.
