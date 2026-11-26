---
"@adapttable/core": patch
"@adapttable/react": patch
"@adapttable/vue": patch
"@adapttable/angular": patch
---

A kit locale whose labels fail to load no longer raises an unhandled promise rejection in React and Vue: the table keeps its current labels, logs the error with the locale, and loads the language on the next locale change or mount. In Angular the server-rendering task for the labels settles on a failure as it does on success.
