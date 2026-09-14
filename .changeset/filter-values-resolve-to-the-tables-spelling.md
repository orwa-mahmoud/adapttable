---
"@adapttable/ai": minor
---

The assistant resolves a published choice to the table's own spelling. Asking
for the "platform" team when the filter offers `Platform` now filters, instead
of refusing and asking the reader which value they meant. The same holds for a
column named in another case or by its label, a sort direction spelled `DESC`,
and an operator alias — each is matched against the list the table published,
and what gets applied is the published spelling, so the host sees exactly what
its own controls would have sent.

A value that matches nothing, or that two choices could equally be, is still
refused — and every one of those refusals now names what the table does take:
`"team" takes one of: Core, Platform, Data — not "Engineering"`. Free text is
untouched: a search string and a cell value are data, not choices.
