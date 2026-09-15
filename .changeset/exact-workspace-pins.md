---
"@adapttable/ai": patch
"@adapttable/ai-react": patch
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/i18n": patch
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/radix": patch
"@adapttable/react": patch
"@adapttable/server": patch
"@adapttable/shadcn": patch
"@adapttable/unstyled": patch
---

Publish exact AdaptTable runtime dependency versions rather than major-caret
ranges. Each package resolves the sibling versions it was released with;
consumers do not need to align package version numbers manually.
