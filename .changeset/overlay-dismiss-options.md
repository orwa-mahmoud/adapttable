---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/mui": patch
"@adapttable/mantine": patch
"@adapttable/antd": patch
---

`watchOverlayDismiss` and `usePointerDismiss` take `OverlayDismissOptions`: nodes that count as inside without a selector, a nested dropdown that takes Escape first, and what runs after Escape. An Escape that an input method is composing with, or that an earlier handler took, no longer closes an overlay. The MUI, Mantine and Ant Design filters popovers close through it, so all three ignore the press that opened them, close on touch as well as mouse, and hand focus back to the Filters button after Escape.
