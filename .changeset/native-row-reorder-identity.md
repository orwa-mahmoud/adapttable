---
"@adapttable/core": patch
"@adapttable/react": minor
"@adapttable/antd": patch
---

Preserve row-only reorder runtime compatibility while retaining loaded-row and
owned-session safety checks. Expose the canonical `renderedRowsOf` projection
from the React adapter entry so native renderers can share the binding's row
inventory.

Use that inventory for Ant Design's reorder handles and drop targets, keeping
synthetic group headers out of data-row indexes so grouped moves confirm and
move the row that was grabbed.
