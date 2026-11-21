---
"@adapttable/server": minor
---

`prepareQuerySchema(schema)` reads a schema's allowed columns, declared filters, their parameters and static choices once, for a route that checks every request against the same schema. `parseTableQuery` takes the prepared schema in place of the schema and answers exactly as the schema would; a schema built per request is checked fresh as before.
