---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/vue": patch
"@adapttable/angular": patch
---

Feature notices and disabled-control reasons take their text from the resolved labels only, in every locale: `collectFeatureNotices`, `chromeFeatureNotices` and `resolveExportDisabledReason` take resolved labels, `capabilityReason(capability, labels)` reads the `"grouping"` or `"exportScope"` sentence from them, and React's `useExportHandler(handler, labels)` requires them. A plain Unstyled table measures 64.2 KiB gzip instead of 64.4. Every other built-in string a model or chrome falls back to is its label group's default, so English lives only in the label groups: `defaultPendingRows` is gone, React's assistant shortcuts menu reads "Shortcuts" like Vue and Angular, and its revoke button names the capability ("Ask about editing cells again").
