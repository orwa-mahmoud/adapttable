# Native view controls fixture

Open `/vue/unstyled/view-controls/` in the showcase. The fixture uses the native
table and its density, fullscreen, and saved-view entries, with English and Arabic
locale packs.

The Playwright contract covers saved density, independent tables, controlled
acceptance and rejection, keyboard focus, feature removal, fullscreen overlays,
mobile RTL, and a toolbar with search disabled.

Browser-owned Escape is checked in Linux CI with full Chromium running under
Xvfb and `xdotool`, enabled by `CI=1 FULLSCREEN_X11_DIAGNOSTIC=1`. The workflow
installs the input dependency and runs a single browser worker. A plain native
fullscreen control checks the same platform transition without Vue or overlays.
Outside this environment, native-input cases are explicitly skipped; those skips
do not establish fullscreen Escape support.

A separate DOM-keyboard case checks overlay dismissal, trigger focus, and the
fullscreen exit button. Browser protocol key dispatch exercises page handlers;
native XTest input also reaches Chromium's fullscreen accelerator. In Chromium,
the first native Escape exits fullscreen before reaching the page, and the next
Escape dismisses the still-open overlay and returns focus to its trigger.
