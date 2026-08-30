/**
 * Keep local sessions out of the analytics.
 *
 * Three trackers run on the published sites — the Cloudflare beacon, GA4 and
 * Clarity — and each of them counted developer traffic. The beacon is a plain
 * `<script src>` in the generated HTML, so it fired on `pnpm dev` too. GA4 and
 * Clarity were gated on "is this a production build", which is not the same
 * question: a local `pnpm build && pnpm preview`, a Playwright run against the
 * built site, and a teammate checking a branch are all production builds, and
 * every one of them filed itself as a real visitor and a real session
 * recording.
 *
 * The question that actually matters is where the page is being served from,
 * and only the browser can answer it. So nothing is emitted as a static tag:
 * the page carries a guard that looks at the hostname and injects the trackers
 * only when it is the real site. A local run makes no request at all — not a
 * blocked one, not a dropped one, none — and that holds for a build made
 * anywhere, by anyone, today or later.
 *
 * Loopback, the private LAN ranges, `.local` / `.localhost`, `file:` and an
 * empty host are all local. Anything else is the site.
 */

/** The predicate, as source, for inlining into a page. */
const IS_LOCAL = `function(){
  var h = location.hostname || "";
  if (location.protocol === "file:") return true;
  if (h === "" || h === "localhost" || h === "0.0.0.0" || h === "[::1]" || h === "::1") return true;
  if (h.endsWith(".local") || h.endsWith(".localhost")) return true;
  if (/^127\\./.test(h)) return true;
  if (/^10\\./.test(h)) return true;
  if (/^192\\.168\\./.test(h)) return true;
  if (/^172\\.(1[6-9]|2[0-9]|3[01])\\./.test(h)) return true;
  return false;
}`;

/**
 * Wrap tracker setup so it runs only on the real site.
 *
 * @param {string} body - JavaScript that installs the trackers.
 * @returns {string} the same code, behind the host check.
 */
export function guarded(body) {
  return [
    "(function () {",
    `  var isLocal = ${IS_LOCAL};`,
    "  if (isLocal()) return;",
    body,
    "})();",
  ].join("\n");
}

/**
 * Source that appends one external script, for use inside {@link guarded}.
 *
 * @param {string} src - The script URL.
 * @param {Record<string, string | boolean>} [attrs] - Extra attributes.
 * @returns {string} JavaScript that appends the tag.
 */
export function appendScript(src, attrs = {}) {
  const lines = [
    "  (function () {",
    "    var s = document.createElement('script');",
    `    s.src = ${JSON.stringify(src)};`,
  ];
  for (const [name, value] of Object.entries(attrs)) {
    lines.push(
      value === true
        ? `    s.${name} = true;`
        : `    s.setAttribute(${JSON.stringify(name)}, ${JSON.stringify(String(value))});`
    );
  }
  lines.push("    document.head.appendChild(s);", "  })();");
  return lines.join("\n");
}
