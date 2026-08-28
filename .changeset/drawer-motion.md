---
"@adapttable/unstyled": patch
"@adapttable/shadcn": patch
"@adapttable/base-ui": patch
"@adapttable/radix": patch
"@adapttable/core": patch
---

The filter drawer now slides in and out in every kit.

`@adapttable/unstyled` — and so `@adapttable/shadcn` — mounted and unmounted the
panel on the same tick it opened, so it appeared and vanished with no motion.
It now travels in from the inline-end edge with the backdrop fading alongside,
and leaves the same way. While it leaves it is inert and out of the
accessibility tree, and focus returns to the trigger immediately rather than
when the animation ends.

`@adapttable/base-ui` had no transition on its drawer at all, which also meant
the swipe-to-dismiss gesture it already enabled moved nothing on screen. The
panel now follows the swipe and the backdrop fades with its progress.

`@adapttable/radix` ran its panel and Radix's own scrim on different durations
and curves, so they finished at different moments, and the panel lost its
opacity a moment before it started sliding. Both now run on one pair of tokens,
and reduced motion falls through to Radix's unanimated dialog.

Mantine, MUI, Chakra and Ant Design keep their own kit's drawer motion.
