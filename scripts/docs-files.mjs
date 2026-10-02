/** Discover canonical docs sources and resolve their relative markdown links. */
import { readdirSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";

/** Canonical markdown paths relative to docs/, including framework folders. */
export const docsFiles = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) =>
      relative(directory, join(entry.parentPath, entry.name))
        .split(sep)
        .join("/")
    )
    .sort();

/** Resolve a relative markdown URL against its canonical source, not its route. */
export function docLinkTarget(source, href) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) return undefined;
  const match = /^([^?#]+\.md)([?#].*)?$/.exec(href);
  if (!match) return undefined;
  const file = posix.normalize(posix.join(posix.dirname(source), match[1]));
  if (file.startsWith("../")) return undefined;
  return { file, suffix: match[2] ?? "" };
}
