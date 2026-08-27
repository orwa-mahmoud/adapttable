# Accessible React data table — keyboard, screen readers, labelled controls

▶ **See it working:** [arrow through a Mantine table and read the live-region transcript](https://orwa-mahmoud.github.io/adapttable/demo/mantine/accessibility/) — Tab in, arrow between cells, and every announcement appears as text. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind. Keyboard walk is documented in [cell navigation](./cell-navigation.md).

An accessible data table is one a person can use without a mouse, and one a
screen reader can describe. AdaptTable ships that way. There is no
`accessible` prop to turn on.

**Related:** [Keyboard & cell navigation](./cell-navigation.md) ·
[i18n & RTL](./i18n-rtl.md) · [FAQ](./faq.md)

## What is on by default

Every table you render already:

- uses a real `<table>` with header and body cells
- names every control it draws (Filters, checkboxes, close, Done — not icon-only)
- marks sortable headers with `aria-sort`
- states the real dataset size when only part of it is in the DOM — a virtualized or paged
  table carries `aria-rowcount` with each row's absolute `aria-rowindex`, and the mobile card
  list carries `aria-setsize` with each card's `aria-posinset`, so a screen reader says "row
  40,001 of 50,000" instead of counting the handful of rows it can reach
- honours `prefers-reduced-motion` when rows animate in

Every adapter is audited with `axe` in CI, on desktop and mobile card layouts.

## Try it yourself

On the [accessibility demo](https://orwa-mahmoud.github.io/adapttable/demo/mantine/accessibility/):

1. Press **Tab** until a cell shows a focus ring.
2. Press the **arrow keys**. The ring moves cell to cell.
3. Open a cell with Enter or a double-click; Escape cancels.

If Tab never enters the table or arrows do nothing, that page is failing.

## What this page is not

The optional spreadsheet grid — one Tab stop, arrow keys through every cell,
`role="grid"` — is a separate feature. See
[keyboard & cell navigation](./cell-navigation.md). Omit that prop and the
grid extras are absent; the default table above still stands.

## Notes

- Works in all eight adapters. The demo is the same walk on each kit.
- Labels you pass through `labels` are the accessible names, including in
  Arabic and the other [bundled locales](./i18n-rtl.md).
