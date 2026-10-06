---
"@adapttable/vue": patch
---

Keep column-menu target callbacks stable when managed kit overlays render their
anchor. Reactive ref-owner cleanup can now run without recursively rebuilding
the open panel, while disposed owners still reject new targets.
