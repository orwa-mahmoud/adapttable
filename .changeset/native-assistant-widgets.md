---
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

Add an optional native table assistant on `@adapttable/<kit>/assistant`:
`TableAssistant` and the `tableAssistant()` feature. Tables that do not
import it do not include the widget. Developers can instead build their own
UI on the headless assistant controller and approval contracts.

The assistant supports floating, panel and sheet presentations, a container
boundary, and native mobile overlays. It includes prompt cards, an integrated
composer, transcript navigation, readable action receipts, pending-approval
status and Stop. Enter sends, Shift+Enter inserts a line, and IME composition
is respected. Labels are available in all 17 locales.

Approval can be presented inside the conversation, above the table or in a
native modal, with one active surface. Reviews show a summary and the first
three changes, with expansion inside the selected surface. Independently
executable changes support individual decisions and remaining-item actions.
`approvalReview` exposes the shared review model for custom renderers.

Each adapter supplies its own controls, with shared structure, keyboard
behavior and part hooks. Overlays are viewport-contained, nested controls
can handle Escape before the surrounding overlay, and focus returns to the
appropriate trigger.
