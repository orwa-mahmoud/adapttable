---
"@adapttable/core": minor
"@adapttable/react": patch
---

Add `FindController.flush()` so view capture can include a query still waiting
for its URL debounce. Keep each pending write attached to the adapter and
namespace that accepted it, and synchronize React source changes after render.

Retire pending grid clipboard results when their row or column context changes
or the controller disconnects, without redirecting them to a replacement view.
