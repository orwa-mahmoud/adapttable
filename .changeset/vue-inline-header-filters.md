---
"@adapttable/vue": minor
"@adapttable/vue-unstyled": minor
---

Add reusable compact header-filter models and Chrome with required adapter
controls, plus native FilterHeaderControl and FilterHeaderRow components.
Keep edits controlled by the host and retire retained callbacks when their
field or component lifetime changes.

Give native filter drawers separate foreground and backdrop elements, with
focus restoration and pointer gestures owned by the active dialog. Import
`@adapttable/vue-unstyled/styles.css` to apply the component-scoped native
dialog backdrop rule; the adapter remains responsible for the visible scrim.
