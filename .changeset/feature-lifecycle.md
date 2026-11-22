---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/vue": minor
"@adapttable/angular": minor
"@adapttable/ai": patch
"@adapttable/ai-vue": patch
"@adapttable/ai-angular": patch
"@adapttable/cli": minor
---

A feature's `setup(host)` only registers; what outlives a render goes in its `mount(context)`, which returns what releases it. Every binding keeps a mounted feature by id: declaring it again with new options, inline included, keeps the resource and hands `context.feature()` the new declaration, and only removing the feature, changing its `dependencies` or unmounting the table releases it, exactly once. A render the framework discards acquires nothing, and a failed mount rolls back what its pass acquired. React publishes the table runtime and its feature ids in layout effects, so AI and event callbacks read the last committed table; `PublishTableRuntime` is the chrome's publisher. `createFeatureMounts` and `composeMounts` on `@adapttable/core/binding` are the shared lifecycle. A `setup` that returns a cleanup is refused, and `onDispose` is no longer on the feature host. Vue's and Angular's table agent follows its latest declaration's options. `adapttable migrate-v4` reports `onDispose` calls.
