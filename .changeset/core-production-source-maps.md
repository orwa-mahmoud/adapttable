---
"@adapttable/core": patch
---

Production source maps cover every module. The 16 modules whose development warnings are compiled out of the production build now map back to their source, so a stack trace from them points at the original file and line in both the ESM and CommonJS builds.
