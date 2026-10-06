# @adapttable/reka-ui

Reka UI controls for the AdaptTable Vue binding. AdaptTable owns table models
and state; Reka supplies accessible interaction primitives. This adapter adds a
compact, neutral theme with violet accents and CSS custom properties for your
application's design system.

## Component mapping

- Selection and boolean fields: `CheckboxRoot` and `CheckboxIndicator`
- Choices: `SelectRoot`, `SelectTrigger`, `SelectContent` and the related item,
  value, viewport and portal primitives
- Plain buttons and text inputs: Reka's `Primitive` with the corresponding native
  tag. Reka does not provide separate Button or TextField widgets.

Reka owns select keyboard navigation, focus scopes and portal lifetime. The adapter connects controlled requests
to the existing Vue binding. It does not duplicate the table's state machines.

## Attribute and ref ownership

The selection marker, class, ARIA attributes and DOM ref target the
`CheckboxRoot` button. The filter checkbox's `filter-checkbox` styling marker
belongs to its `Label` host; its inner `CheckboxRoot` owns the checked state,
keyboard behavior and accessible name.

Select markers, classes, ARIA labels and DOM refs belong to `SelectTrigger`, which
is the focusable combobox. Value, disabled state and form participation belong to
`SelectRoot`. Empty-string choices are encoded at the adapter boundary because
Reka reserves an empty item value for its clearing behavior.

Component refs resolve through Reka's public `$el` forwarding. No descendant
queries, internal instance access or post-render attribute patching are used.

## Upstream

- [Reka UI documentation](https://reka-ui.com/docs/overview/introduction)
- [Composition](https://reka-ui.com/docs/guides/composition)
- [Reka UI source and MIT license](https://github.com/unovue/reka-ui)
