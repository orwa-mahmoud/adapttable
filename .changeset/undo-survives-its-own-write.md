---
"@adapttable/ai": patch
---

The assistant's Undo survives the write that made it worth offering. A turn
that narrowed the view and proposed an edit used to draw an Undo that was dead
before the reader could reach it: approving the edit moved the revision, and
the offer was retired over a change it never touched.

The offer now ends when a field it would put back has moved under it, rather
than on any movement at all. A reader who pages or sorts on their own still
retires it — undoing their gesture instead of the turn's is the thing the
guard exists to prevent.
