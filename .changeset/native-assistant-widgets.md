---
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
"@adapttable/i18n": minor
---

Add optional native table assistants through `TableAssistant` and
`tableAssistant()` on `@adapttable/<kit>/assistant`. Importing a table
without this feature does not include the widget; custom interfaces can use
the headless controller and approval contracts instead.

### Conversation experience

The panel supports floating, panel and sheet presentations, container
boundaries and native mobile overlays. Messages lead the conversation;
action details open on request beneath a reply. Receipts name the columns,
values and operations involved, distinguish proposals from completed
changes, and offer eligible view Undo controls. `receipts={false}` hides
the action UI without removing the underlying receipts from conversation
state.

While a long capability works, the conversation counts what it has done rather
than spinning. A released connection reads as work that may still be running,
with a control that rejoins it, and a turn the reader stopped reads as stopped.

Suggested prompts open from the composer menu and reflect the table's
available capabilities. Structured questions appear in the conversation with
choices and optional free-text answers. Streaming text, Stop, dictation and
a language chooser use the same conversation interface.

Hosts can customize the greeting and `avatars`; a name can supply initials
instead of a custom React element. Remembered approval allowances have
readable names and a revoke control.

### Approval and accessibility

Approvals use one active presentation: in the widget, above the table or in
a native modal. Reviews pair before/after values, summarize bulk changes and
show an initial preview with expansion. Independently executable changes
support individual and remaining-item decisions; a single change receives a
single decision. `approvalReview` exposes the shared review model.

Every kit supplies its own controls over shared structure, keyboard behavior
and part hooks. The composer supports Enter, Shift+Enter and IME input.
Opening and closing manage focus, nested controls can handle Escape, overlays
respect viewport boundaries and RTL direction, and motion respects reduced
motion preferences. Labels are available in all 17 locales.
