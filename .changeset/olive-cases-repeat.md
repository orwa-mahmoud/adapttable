---
"@adapttable/antd": patch
---

Keep the filters popover inside the viewport on narrow screens. The card was
anchored to a corner placement, which antd can only flip — not slide — so on a
phone it rendered partly off-screen with the filter controls cut off. It now
centres under the trigger (antd slides that placement into view) and its width
is capped to the viewport.
