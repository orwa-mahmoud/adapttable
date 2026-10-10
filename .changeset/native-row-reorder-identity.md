---
"@adapttable/react": minor
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/radix": patch
"@adapttable/unstyled": patch
---

Expose `renderedRowsOf` from the React adapter entry and retain row-only reorder
compatibility with loaded-row/session safety. Ant Design uses that inventory for
handles/drop targets, so synthetic group headers cannot redirect a row move.

Ant Design, Base UI, Chakra, Mantine, MUI, Radix and Unstyled mobile cards retain
their full content height in constrained layouts. Base UI loads drawer motion CSS
only when its drawer renders while preserving shared theme tokens. Chakra native
portals retain dark semantic colors and rename inputs focus on each open.
MUI restores saved-view name focus after saving. Radix header filters preserve
native nested Select interactions. Unstyled search and filter popovers fit narrow
viewports and flip above low triggers while keeping keyboard dismissal/focus.
