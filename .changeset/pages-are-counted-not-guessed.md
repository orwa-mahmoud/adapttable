---
"@adapttable/ai": minor
"@adapttable/ai-react": patch
"@adapttable/react": patch
---

The assistant is told what a table's pages actually are: the current page and
size, the sizes the host offers, the counted total for the current query where
a source has one, the page count divided from it, and whether a further page
exists. A source that has not counted keeps an unknown total instead of being
handed the rows on screen, and "no next page" stays distinct from "nobody
knows".

A page request is checked against those numbers before the table is asked, so a
page past the end is refused with both sides named rather than reported as a
move that happened.

`useDataTable`'s runtime view carries the source's filtered total, which is
what a server-backed binding needs to publish any of this.
