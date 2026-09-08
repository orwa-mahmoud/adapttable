---
"@adapttable/react": minor
---

`virtualize` now windows a paged table whose rows have been expanded. A page
size bounds the rows a page holds, not the entries drawn for them: group by
three fields with footers and thirty rows become a hundred and forty, all of
them in the DOM. Grouping and tree bodies are eligible for the window whatever
the pagination mode, so the page stays the size it says it is.
