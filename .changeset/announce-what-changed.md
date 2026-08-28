---
"@adapttable/core": patch
"@adapttable/i18n": patch
---

Say what changed when the rows change. Sorting, filtering, paging and changing the page size all
rewrite the table body with nothing a screen reader can perceive — the rows are simply different
ones — so activating "Sort ascending" produced no feedback at all. The table now announces politely:
the new order when a sort settles ("Sorted by Name, ascending", "Sorting cleared"), and otherwise the
new count in the same words the footer shows ("Page 2 of 4. Showing 26–50 of 87"). A filter that
matches nothing is left to the empty state, which is already a live region and announces itself.

The message is derived from the settled row set rather than from the controls, so a filter being
typed announces once when the results arrive instead of once per keystroke. The region announces
through `aria-live` without taking `role="status"`: it is present on every table, and the empty
state, the export announcer and the reorder announcer each hold that role while they are on screen.

Two new label keys, `sortedBy` and `sortingCleared`, are translated in all 17 locales; everything
else reuses labels the table already shipped. Adapters render the region through
`TableStatusAnnouncer`, and `useTableStatusAnnouncement` computes the message for custom markup.
