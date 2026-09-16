"""A minimal AdaptTable agent backend, in Python.

The wire is a wire. This is the same contract `examples/ai-http-backend.ts`
serves, in another language and with no model: it reads the permitted context
out of the request, decides one tool call from the reader's own words, and
answers in the shape the client parses. Swap `decide` for a real model call and
nothing else about the shape changes.

Standard library only — no framework, no provider SDK, no `requests`.

Run it with uv, never the system Python:

    uv run --python 3.12 examples/ai-http-backend.py

Then point the showcase's Connect backend at http://127.0.0.1:8788.

What this deliberately does NOT do, because the client does it:

  * decide whether a capability may run — the table's own executor does,
    and a call this backend invents for an excluded key is simply refused;
  * see a cell the table marks unreadable — it never arrives here;
  * retry anything. A call whose outcome is unknown is never sent twice.
"""

from __future__ import annotations

import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

SCHEMA = "adapttable.agent.v1"
HOST = "127.0.0.1"
PORT = 8788
MAX_BODY = 64 * 1024

# Contracts this process has pinned, by session id. A real backend would put a
# time limit on these; the client is told the one it gets.
PINS: dict[str, dict[str, Any]] = {}
PIN_TTL_MS = 10 * 60 * 1000


def capabilities(context: dict[str, Any]) -> list[str]:
    """Every capability key the table said this agent may use."""
    contract = context.get("contract") or {}
    return [
        entry["key"]
        for entry in contract.get("capabilities", [])
        if isinstance(entry, dict) and "key" in entry
    ]


def decide(message: str, offered: list[str], view: dict[str, Any]) -> dict[str, Any]:
    """One turn, without a model.

    Deliberately literal: it matches words, and every branch checks that the
    capability is actually offered before naming it. A key that is not in the
    contract is one the table excluded, and proposing it would only produce a
    refusal the reader has to read.
    """
    text = message.lower()

    def call(name: str, args: dict[str, Any], said: str) -> dict[str, Any]:
        if name not in offered:
            return {
                "text": (
                    "This table does not offer that, so I have not tried it."
                )
            }
        return {"text": said, "toolCalls": [{"id": "c1", "name": name, "args": args}]}

    page = re.search(r"page\s+(\d+)", text)
    if page and "view.setPage" in offered:
        wanted = int(page.group(1))
        return call("view.setPage", {"page": wanted}, f"Page {wanted}.")

    if "next page" in text and "view.setPage" in offered:
        current = view.get("page", 1)
        return call(
            "view.setPage", {"page": current + 1}, f"Page {current + 1}."
        )

    if ("sort" in text or "order" in text) and "view.setSort" in offered:
        direction = "asc" if ("ascend" in text or "lowest" in text) else "desc"
        column = "total" if "total" in text else "salary"
        return call(
            "view.setSort",
            {"key": column, "dir": direction},
            f"Sorted by {column}, {'lowest' if direction == 'asc' else 'highest'} first.",
        )

    if "search" in text and "view.setSearch" in offered:
        query = text.split("search", 1)[1].strip().strip('"') or ""
        return call("view.setSearch", {"query": query}, f"Searching for {query!r}.")

    if ("clear" in text or "reset" in text) and "view.setSearch" in offered:
        return call("view.setSearch", {"query": ""}, "Cleared the search.")

    # Nothing matched. Saying so is the honest answer; a guess would move the
    # table somewhere nobody asked for.
    return {
        "text": (
            "I can change the page, the sort and the search on this table. "
            f"It currently offers: {', '.join(offered) or 'nothing'}."
        )
    }


def answer(request: dict[str, Any]) -> dict[str, Any]:
    """One request in, one response out."""
    if request.get("schemaVersion") != SCHEMA:
        return {
            "schemaVersion": SCHEMA,
            "text": f"this backend speaks {SCHEMA}",
        }

    kind = request.get("kind")
    table_id = request.get("tableId", "")
    version = request.get("contractVersion")

    if kind in {"hello", "schema"}:
        # Pin what we were sent, and say exactly which version we hold. A
        # client whose contract has moved sees a version it does not
        # recognise and sends the whole thing again.
        session_id = f"py-{table_id}"
        if request.get("context"):
            PINS[session_id] = {
                "context": request["context"],
                "version": version,
            }
        return {
            "schemaVersion": SCHEMA,
            "ok": True,
            "sessionId": session_id,
            "pin": {
                "status": "acknowledged",
                **({"contractVersion": version} if version else {}),
                "ttlMs": PIN_TTL_MS,
            },
            "text": (
                "Connected."
                if kind == "hello"
                else "Schema updated."
            ),
        }

    # A turn. The contract is either in this request or in the pin it names.
    pinned = PINS.get(request.get("sessionId", ""))
    context = request.get("context") or (pinned or {}).get("context")
    if not context:
        # Nothing ran, so saying the pin is gone is safe: the client resends
        # the contract. This is never the answer to a call whose outcome is
        # unknown, which is why it is decided before any work happens.
        return {
            "schemaVersion": SCHEMA,
            "pin": {"status": "unknown"},
            "text": "send the table contract — no pin is held for it here",
        }

    reply = decide(
        str(request.get("message", "")),
        capabilities(context),
        request.get("view") or {},
    )
    return {
        "schemaVersion": SCHEMA,
        **reply,
        "pin": {
            "status": "acknowledged",
            **({"contractVersion": version} if version else {}),
            "ttlMs": PIN_TTL_MS,
        },
    }


class Handler(BaseHTTPRequestHandler):
    """One POST, one answer. CORS for a local showcase only."""

    protocol_version = "HTTP/1.1"

    def _send(self, status: int, body: dict[str, Any]) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("content-length", str(len(payload)))
        self.send_header("access-control-allow-origin", self.headers.get("origin", "*"))
        self.send_header("access-control-allow-headers", "content-type, authorization")
        self.send_header("access-control-allow-methods", "POST, OPTIONS")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self) -> None:  # noqa: N802 — the base class names it.
        self._send(204, {})

    def do_POST(self) -> None:  # noqa: N802 — the base class names it.
        length = int(self.headers.get("content-length") or 0)
        if length > MAX_BODY:
            self._send(413, {"error": "body too large"})
            return
        try:
            request = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError as error:
            self._send(400, {"error": f"bad request: {error.msg}"})
            return
        if not isinstance(request, dict):
            self._send(400, {"error": "bad request: expected an object"})
            return
        self._send(200, answer(request))

    def log_message(self, format: str, *args: Any) -> None:
        # One line per turn, and never the body: a request carries the table's
        # column names and the rows the reader asked about.
        print(f"{self.command} {self.path} -> 200")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"AdaptTable agent backend (python, no model) on http://{HOST}:{PORT}")
    print("Point the showcase's Connect backend at that address.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
