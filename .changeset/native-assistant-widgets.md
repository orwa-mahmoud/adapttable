---
"@adapttable/react": minor
"@adapttable/core": minor
"@adapttable/i18n": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/antd": minor
"@adapttable/chakra": minor
"@adapttable/radix": minor
"@adapttable/base-ui": minor
"@adapttable/unstyled": minor
"@adapttable/shadcn": minor
---

Every kit ships an assistant panel on `@adapttable/<kit>/assistant` —
`TableAssistant` plus a `tableAssistant()` feature. It is its own entry point,
so a table that never imports it carries none of it.

The panel is built from each kit's own components: Mantine's Drawer, Paper,
Button, Textarea and Badge in Mantine; antd's Drawer, Card, Tag and
Input.TextArea in antd; a native `<dialog>`, `<button>` and `<textarea>` in
unstyled, which shadcn composes. Structure, keyboard and announcements are
shared, so the behaviour is identical everywhere.

Enter sends and Shift+Enter starts a line, while Enter during an IME
composition belongs to the IME. Send becomes Stop mid-turn. A disabled
composer says why. Roles are named rather than coloured, and a staged write
says it still needs saving in the table. New messages follow only when the
reader is already at the bottom; otherwise the panel offers to take them
there. Escape closes the panel unless something inside already answered, and
closing returns focus to the launcher. On a narrow viewport `presentation`
switches the panel for the kit's own modal sheet, which offers a way back to
the table.

Assistant strings are translated in all seventeen bundled locales.

MUI and antd now put `data-adapttable-part` and the host's `className` on the
same element as every other kit, so an app styling `assistant-input` reaches
the control rather than a wrapper.
