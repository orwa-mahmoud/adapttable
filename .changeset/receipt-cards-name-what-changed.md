---
"@adapttable/core": minor
"@adapttable/i18n": minor
"@adapttable/react": minor
"@adapttable/ai": minor
---

Assistant receipt cards name what changed. A turn that filters and sorts now
shows "Filter applied — Team is Platform" and "Sorted — Salary, descending"
instead of two cards reading "done". The built-in capabilities describe
themselves from what the session returned, so the card reports the filter the
table is holding rather than the one the model asked for, and an action that
was refused is never drawn as one that cleared something.

Columns and values travel as structured pairs and the new
`assistantReceiptTerms` label joins them, translated in all 17 locales.
`subjectFor` is exported for hosts driving the panel from their own transport.
