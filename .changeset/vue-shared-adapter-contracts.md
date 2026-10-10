---
"@adapttable/vue": minor
---

Expose generic table props, slots and class hooks through
`@adapttable/vue/adapter`, with structural table Chrome and required native
control contracts for custom adapters. Add managed panel renderers, shared
compound presentations and scoped reactive element-ref handoff.

Public types remain nameable from the entry that returns them, including
focused feature entries. Generic controls and shallow-ref declarations support
the declared Vue floor; type-only re-exports do not claim runtime values. Native
Unstyled consumers forward the same contracts. Unused presentation components
can be removed by consumer bundlers.
