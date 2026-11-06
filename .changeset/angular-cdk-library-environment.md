---
"@adapttable/angular": patch
"@adapttable/angular-cdk": patch
---

Angular CDK tables follow `Directionality`, including a parent `dir` and the document direction. An explicit `dir` still wins. An omitted direction stays left to right when CDK has no direction of its own. CDK has no app-wide locale, size, or motion switch.
