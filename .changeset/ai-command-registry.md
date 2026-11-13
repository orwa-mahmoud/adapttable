---
"@adapttable/ai": patch
---

Each built-in agent capability is defined once — its schema, argument reading, live guide, preview and apply step in one command object — and the session runs every capability, built-in or custom, through the same registry. `@adapttable/ai/openai` no longer loads the capability guides, which takes about 2.7 KB gzipped off that entry.
