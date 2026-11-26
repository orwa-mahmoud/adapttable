---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/antd": patch
"@adapttable/cli": minor
---

The React editing feature publishes its bundle as `EDITING_STATE`, and the edit history stays on `EDIT_HISTORY_STATE`; the table chrome no longer carries `editing` or `editHistory`. `overlayChromeExtras(shell, base, channels)` and `TableRuntimePublisher.stage(chrome, actions, channels)` take what the features published (`RuntimeChannels`) apart from the chrome, so the runtime view carries editing and the filter definitions. `FeatureStateScope` accepts `undefined` to publish nothing. `adapttable migrate-v4` reports the removed names.
