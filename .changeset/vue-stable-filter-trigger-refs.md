---
"@adapttable/vue": patch
---

Keep filter and header-filter trigger ref callbacks stable across model updates.
Reactive native ref owners can now release and reacquire anchors without
recursively rebuilding the filter model, while retired instances stay inactive.
