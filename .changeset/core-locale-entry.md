---
"@adapttable/core": minor
---

The shared locale-tag resolver has an entry of its own: `@adapttable/core/locale` exports `resolveLocaleTag` and `normalizeLocaleTag` and loads nothing else, so a package that only picks a language reaches it in a single small module.
