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

A write parked on a human approval now says so. `bridge.approvals` reports
one opening and closing, `useTableAssistant` takes it as `awaitingApproval`,
and the panel carries `busy` separately from the status it shows — so Stop
stays available on a turn that is waiting rather than working.

`messageAction` puts one offer at the end of a reply the host recognises —
a demo that cannot answer a question can hand back the way past it rather
than leaving the reader to find it.

A write the assistant proposes is reviewed in the conversation it was asked
for. A strip above the table and a dialog of the kit's own remain, chosen
with `approval: { presentation }`, and exactly one of them draws the
controls. A long write opens with what it is — "12 proposed changes across 8
rows" — and its first three changes; the rest open inside the same surface.

A reader can approve some rows of a bulk write and refuse the rest. Approved
rows run, refused rows never do, and the receipt reports `partial`. Approve
all becomes Approve remaining once any row is decided, beside a running
tally. A write that enumerates no rows is named and answered whole.

`approval` takes `{ policy, presentation }` alongside the policy string it
already took, and a row action, bulk action or capability may override either
field on its own through `ai`. `onApprove` receives a typed `ApprovalSubject`
rather than `unknown`, and may answer with approved positions instead of a
boolean; `partial: "supported"` is how a capability opts in.

`approvalReview` builds the model every surface reads, for hosts drawing
their own.

`useEscapeClose` closes an overlay on Escape wherever focus sits, and takes
`ignoreWithin` for controls inside that answer the key first. Cancelling a
column rename closes the editor; the Escape after it closes the menu.
