# @adapttable/shadcn-vue

shadcn-vue presentation for AdaptTable's headless Vue binding. Table state,
feature lifetimes, query ownership, and structural Chrome belong to
`@adapttable/vue`; this package supplies copied, licensed shadcn-vue controls.

## Styles

The stylesheet build compiles utilities without Tailwind Preflight. Its output
can be imported once without requiring an application Tailwind build.
The stylesheet reads the standard shadcn CSS tokens (`--background`,
`--foreground`, `--primary`, `--border`, `--input`, and `--ring`) and provides
neutral fallback colors. Portaled controls read tokens from their actual host.

## Component source

shadcn-vue distributes editable component source rather than an aggregate
runtime component package. This adapter vendors the New York v4 registry at
[b251d9fd](https://github.com/unovue/shadcn-vue/tree/b251d9fd92aa496495e127137a7734704fb34a29/apps/v4/registry/new-york-v4/ui).
Its components compose Reka UI. The upstream MIT license is preserved in
`THIRD_PARTY_NOTICES.md`.

Local adaptations use relative utility imports, logical select icon spacing,
an explicit select focus target, controlled-value rejection reconciliation,
and the binding's required slot contracts. No kit imports another kit's controls.

## Semantic targets

- Button: caller attributes, part name, class, keyboard events, and focus ref
  reach the `button` rendered by the shadcn `Primitive`.
- Input: those attributes reach the actual input.
- Native Select: part name, class, label, disabled state, keyboard events, and
  focus ref reach the select. `hostClass` styles the decorative wrapper.
- Checkbox: part name, class, label, keyboard events, and focus ref reach the
  Reka checkbox button. Selection uses one model-update event per request.
  An indeterminate value is represented by `aria-checked="mixed"`.
- Popover: content is portaled without a backdrop; Reka owns Escape,
  outside-click dismissal, and focus behavior.
- Sheet: content and its real dimming overlay use the Reka Dialog primitives.

## Opt-in controls

The `density.ts` and `fullscreen.ts` entries provide `densityChooser` and
`fullscreen`. Both contribute only presentation to
the binding feature. Optional controls are absent until requested.
