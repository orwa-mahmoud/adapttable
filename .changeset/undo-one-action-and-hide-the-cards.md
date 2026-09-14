---
"@adapttable/ai": minor
"@adapttable/ai-react": minor
"@adapttable/react": minor
---

A turn that did more than one thing can be put back one action at a time. Each
receipt card carries its own Undo, and pressing it restores only what that
action changed — undoing a sort leaves the filter the same turn applied
standing. A turn that did one thing offers only the turn's own control, which
is already that action's undo. `AssistantStore.undoAction(idempotencyKey)` is
the entry point; a card draws the control only while its own offer stands.

`receipts={false}` on the assistant hides the cards for a host that keeps its
own account of a turn. The receipts stay in the conversation state either way.
