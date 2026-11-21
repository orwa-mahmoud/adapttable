---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/vue": patch
"@adapttable/angular": patch
---

Feature notices and disabled-control reasons take their text from the resolved labels only, in every locale: `collectFeatureNotices`, `chromeFeatureNotices` and `resolveExportDisabledReason` take resolved labels, `capabilityReason(capability, labels)` reads the `"grouping"` or `"exportScope"` sentence from them, and React's `useExportHandler(handler, labels)` requires them. A plain Unstyled table measures 64.2 KiB gzip instead of 64.4.
