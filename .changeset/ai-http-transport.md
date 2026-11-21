---
"@adapttable/ai": patch
---

The HTTP transport keeps each connection's state apart and bounds every reply. A backend's session handle stays with the connection that was issued it, so two connections to one table each send their own and resetting one leaves the other intact. A timeout or cancel now also covers header resolution, a streamed reply holds one abort listener instead of one per chunk, and the upstream body is cancelled after the terminal event. JSON replies are refused at 512,000 bytes while reading, or before reading when their length says so, and a failed reply reads only the first 4 KB it shows as its diagnostic.
