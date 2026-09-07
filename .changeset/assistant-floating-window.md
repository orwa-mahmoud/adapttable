---
"@adapttable/ai": minor
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/antd": minor
"@adapttable/base-ui": minor
"@adapttable/chakra": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/radix": minor
"@adapttable/shadcn": minor
"@adapttable/unstyled": minor
---

The table assistant opens as a floating conversation window over the page,
so the table keeps its full width and stays usable behind it. Set
`presentation="floating"`; `panel` and `sheet` behave as before, and a
floating window becomes the kit's own modal sheet on a viewport too narrow
for both. `boundary` places the window inside an application container
instead of the viewport.

Action receipts read as what changed — "Filter applied — Team is Core",
"Edit staged — not saved" — from the arguments that ran rather than from the
model's reply. Supply `AssistantReceiptSubject` alongside a result to name
the row, column and before/after values; capability keys move to the
developer details.

The panel's header is one compact row of icon controls, suggested prompts
are cards with a title and the request they send, and the composer is a
single surface with Send inside it. Every string is translated in all 17
locales.
