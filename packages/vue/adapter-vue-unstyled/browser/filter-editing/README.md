# Native filters and editing fixture

Open `/vue/unstyled/filter-editing/` in the showcase. Query options are `rtl`,
`mobile`, `mode=drawer`, and `unit=row|batch|cell`.

Host saves stay pending until **Accept save** or **Reject save**. The write
counter makes duplicate commits observable. The Playwright contract covers native
popover placement, RTL, focus restoration, mobile drawers, validation, and
asynchronous row and batch saves.
