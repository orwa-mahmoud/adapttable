# `@adapttable/ai-react`

[![AdaptTable AI — ask the table to filter, group, and aggregate](https://orwa-mahmoud.github.io/adapttable/media/ai/demo.gif)](https://orwa-mahmoud.github.io/adapttable/demo/mantine/ai/)

React bindings for AdaptTable AI. `tableAgent` publishes a live capability
manifest from a table. `useTableAssistant` owns the conversation.

Use these bindings with any model/backend bridge. A ready chat surface lives
in each kit's optional `@adapttable/<kit>/assistant` subpath; it is not required.

```ts
import { tableAgent, useTableAssistant } from "@adapttable/ai-react";
```

`@adapttable/ai` is installed transitively. Add it as a direct dependency only
when your application imports its provider-neutral helpers itself.

`@adapttable/ai` stays React-free. Kit widgets stay on
`@adapttable/<kit>/assistant`.

Requires React and React DOM **18 or 19**, and Node.js **22.12.0 or newer**;
packed releases are tested on Node 22.12 and Node 24.

## See it work

`tableAgent` plus the kit assistant — same clips as `@adapttable/ai`.

**Filter, sort, and page size** — active people, salary high first, then 10 rows a page

![filter-sort](https://orwa-mahmoud.github.io/adapttable/media/ai/parts/filter-sort.gif)

**Group and aggregate** — group by team, average then min salary, then only active

![group-average](https://orwa-mahmoud.github.io/adapttable/media/ai/parts/group-average.gif)

**Date range** — only rows that started between 2020 and 2022

![date-range](https://orwa-mahmoud.github.io/adapttable/media/ai/parts/date-range.gif)

**Column management** — hide Person, show it again, Status first, then pin it

![column-management](https://orwa-mahmoud.github.io/adapttable/media/ai/parts/column-management.gif)

[Integration guide](https://orwa-mahmoud.github.io/adapttable/ai-integrations/) ·
[API reference](https://orwa-mahmoud.github.io/adapttable/ai/)
