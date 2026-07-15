---
"@adapttable/unstyled": patch
---

Keep the filters popover inside the viewport on narrow screens. The card is
anchored to the trigger's inline edge, so on a phone it could hang past the
screen (a 320px card under a button near the edge rendered ~170px off-screen,
cutting off the filter controls). It now shifts back inside after opening and
on resize, and is capped to the viewport width. `@adapttable/shadcn` inherits
the fix.
