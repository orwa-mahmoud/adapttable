---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/antd": patch
"@adapttable/cli": minor
---

A React table runs its column layout, grouping, tree, selection, row actions, pins, expansion, editing and edit history as chrome stages, each after the stages whose values it reads, so the order follows from what each feature reads and writes rather than a fixed list. Find marks its matches from its own stage. `CHROME_EXTRA_SLOT_ORDER`, `HistoryLiveGate`, `EDIT_HISTORY_LIVE` and its props and draw types are removed; `EDIT_HISTORY_STAGE`, `ChromeStageKey` and `LiveStagePhase` name the new pieces, and `adapttable migrate-v4` reports the removed names.
