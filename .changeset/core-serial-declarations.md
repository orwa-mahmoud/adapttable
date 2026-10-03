---
"@adapttable/core": patch
---

Build production JavaScript and both declaration formats in separate bounded
phases. Keep test sources and globals in normal typechecking and coverage while
excluding them from production declaration inputs. Preserve public signatures
and embed declaration-map sources before cleaning temporary build files.
