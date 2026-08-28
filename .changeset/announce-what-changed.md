---
"@adapttable/core": patch
"@adapttable/i18n": patch
---

Say what changed when the rows change. Sorting, filtering, paging and changing the page size rewrote
the table body with nothing a screen reader could perceive, so activating "Sort ascending" produced no
feedback at all. The table now announces politely: the new order when a sort settles ("Sorted by Name,
ascending", "Sorting cleared"), and otherwise the new count in the same words the footer shows
("Page 2 of 4. Showing 26–50 of 87"). A filter being typed announces once when the results arrive
rather than once per keystroke, and a filter that matches nothing is announced by the empty state.

Adapters render the announcement through the new `TableStatusAnnouncer`, and
`useTableStatusAnnouncement` computes the message for custom markup. Two new label keys, `sortedBy`
and `sortingCleared`, are translated in all 17 locales.
