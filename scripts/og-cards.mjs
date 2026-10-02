/**
 * Shared social-card metadata and escaped markup for the docs renderers.
 * The SVG renderer keeps card generation deterministic and browser-free.
 */
import { sidebarPages } from "../apps/docs/sidebar.mjs";
import { SHARED_DOCS } from "./site.mjs";

/** Escape every interpolated string for either SVG or HTML markup. */
export const escapeCardText = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** One title and framework classification for both supported card renderers. */
export const ogCardMetadata = (pages = sidebarPages()) =>
  pages.map(({ slug, label, group }) => {
    let framework = "react";
    let footer = "Headless React data table · one API, every UI kit";
    if (slug.startsWith("angular/")) {
      framework = "angular";
      footer = "Headless Angular data table · native kit controls";
    } else if (SHARED_DOCS.includes(slug)) {
      framework = "shared";
      footer = "Framework-neutral engine · React and Angular bindings";
    }
    let title = label;
    if (slug === "comparison")
      title = "AdaptTable vs ag-Grid, MUI X & TanStack Table";
    else if (group === "Migrating")
      title = `Migrate ${label[0].toLowerCase()}${label.slice(1)}`;
    return {
      slug,
      title,
      kicker: framework === "angular" ? `Angular · ${group}` : group,
      framework,
      footer,
    };
  });

/** Deterministic line wrapping, including long unbroken labels. */
export function wrapCardTitle(title, width = 30) {
  if (!Number.isInteger(width) || width < 1)
    throw new Error("Card line width must be a positive integer");
  const words = title
    .trim()
    .split(/\s+/)
    .flatMap((word) => {
      const characters = Array.from(word);
      const chunks = [];
      while (characters.length > 0)
        chunks.push(characters.splice(0, width).join(""));
      return chunks;
    });
  const lines = [];
  for (const word of words) {
    const last = lines.at(-1);
    if (last && Array.from(`${last} ${word}`).length <= width)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/** A browser-free 1200×630 social card, rendered to PNG by the docs app's Sharp. */
export function ogCardSvg({ title, kicker, footer }) {
  const lines = wrapCardTitle(title);
  if (lines.length > 3)
    throw new Error(`Card title needs more than three lines: ${title}`);
  const text = escapeCardText;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="card-title">
  <title id="card-title">${text(title)}</title>
  <defs>
    <radialGradient id="glow" cx="12%" cy="8%" r="100%"><stop stop-color="#6c5ce7" stop-opacity=".35"/><stop offset="1" stop-color="#0d0e1f" stop-opacity="0"/></radialGradient>
    <linearGradient id="bar"><stop stop-color="#6c5ce7"/><stop offset=".6" stop-color="#a89bff"/><stop offset="1" stop-color="#a89bff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#0d0e1f"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(76 68) scale(1.25)">
    <rect x="8.5" y="1.5" width="22" height="22" rx="5.5" fill="#6c5ce7" opacity=".28"/>
    <rect x="5" y="5" width="22" height="22" rx="5.5" fill="#6c5ce7" opacity=".55"/>
    <rect x="1.5" y="8.5" width="22" height="22" rx="5.5" fill="#6c5ce7"/>
    <rect x="4.5" y="12.5" width="16" height="2.8" rx="1.2" fill="#fff"/>
    <rect x="11.1" y="12.5" width="2.8" height="14.5" rx="1.2" fill="#fff"/>
  </g>
  <g font-family="DejaVu Sans, sans-serif">
    <text x="132" y="100" font-size="30" fill="#fff">Adapt<tspan font-weight="800">Table</tspan></text>
    <text x="76" y="216" font-size="22" font-weight="700" letter-spacing="2" fill="#a89bff">${text(kicker.toUpperCase())}</text>
    <text font-size="64" font-weight="800" letter-spacing="-1.5" fill="#fff">${lines.map((line, index) => `<tspan x="76" y="${310 + index * 72}">${text(line)}</tspan>`).join("")}</text>
    <text x="76" y="554" font-size="24" fill="#b9bad0">${text(footer)}</text>
  </g>
  <rect y="622" width="1200" height="8" fill="url(#bar)"/>
</svg>\n`;
}
