---
"@adapttable/shadcn": minor
---

Export `SavedViewsPanelProps`, the shape `<SavedViewsPanel>` accepts: the views,
the five handlers, `labels`, `footer`, `className`, and a `classNames` map merged
per key over the shadcn preset. Typing a wrapper around the panel meant restating
those fields or reaching into core's chrome props for them.
