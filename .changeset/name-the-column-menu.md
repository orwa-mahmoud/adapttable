---
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/chakra": patch
"@adapttable/antd": patch
"@adapttable/radix": patch
"@adapttable/base-ui": patch
---

Give the column menu an accessible name in every adapter. The trigger announced that it had expanded
something, and what it had expanded could not be identified: four kits opened a `dialog` with no
name, and two put the column list inside a wrapper their kit had already marked `presentation` or
`tooltip`. The panel is now named in all eight — as the kit's own `dialog` where the kit provides
one, and as a named `group` where it does not.
