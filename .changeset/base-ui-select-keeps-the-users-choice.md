---
"@adapttable/base-ui": patch
---

Keep the value the user chose in a select whose option list depends on that
value. The rows-per-page select offers the current size alongside the standard
ones, so choosing a new size changes the length of the list; Base UI reconciles
its own value when the item registry changes shape and reports it as
`reason: "none"`, which landed after the selection and reverted it to the size
the select mounted with. Only user-driven changes are forwarded now.

Verified against `@base-ui/react` 1.7.0; the supported peer range is unchanged.
