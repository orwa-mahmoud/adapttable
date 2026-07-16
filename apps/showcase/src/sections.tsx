import { type ReactNode, useState } from "react";

import { Check, External, Moon, Sun } from "./sectionIcons";

function Wordmark({ href }: Readonly<{ href: string }>) {
  return (
    <a className="wm" href={href}>
      <svg
        className="wm__mark"
        viewBox="0 0 32 32"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <rect
          x="8.5"
          y="1.5"
          width="22"
          height="22"
          rx="5.5"
          fill="var(--brand)"
          opacity="0.25"
        />
        <rect
          x="5"
          y="5"
          width="22"
          height="22"
          rx="5.5"
          fill="var(--brand)"
          opacity="0.5"
        />
        <rect
          x="1.5"
          y="8.5"
          width="22"
          height="22"
          rx="5.5"
          fill="var(--brand)"
        />
        <rect x="4.5" y="12.5" width="16" height="2.8" rx="1.2" fill="#fff" />
        <rect
          x="11.1"
          y="12.5"
          width="2.8"
          height="14.5"
          rx="1.2"
          fill="#fff"
        />
        <rect
          x="4.5"
          y="18.8"
          width="4.6"
          height="2.2"
          rx="1"
          fill="#fff"
          opacity="0.4"
        />
        <rect
          x="4.5"
          y="23"
          width="4.6"
          height="2.2"
          rx="1"
          fill="#fff"
          opacity="0.4"
        />
        <rect
          x="15.9"
          y="18.8"
          width="4.6"
          height="2.2"
          rx="1"
          fill="#fff"
          opacity="0.4"
        />
        <rect
          x="15.9"
          y="23"
          width="4.6"
          height="2.2"
          rx="1"
          fill="#fff"
          opacity="0.4"
        />
      </svg>
      <span className="wm__txt">
        Adapt<strong>Table</strong>
      </span>
    </a>
  );
}

export type DemoPage = "demo" | "columns" | "scale" | "rtl";

/** The demo pages — each a static HTML entry, linked with plain anchors. */
const PAGES: { key: DemoPage; label: string; path: string }[] = [
  { key: "demo", label: "Live demo", path: "" },
  { key: "columns", label: "Columns", path: "columns" },
  { key: "rtl", label: "RTL", path: "rtl" },
  { key: "scale", label: "Scale", path: "scale" },
];

/**
 * App-style toolbar: the landing owns the marketing, so the demo's nav is
 * page tabs + Docs/GitHub. `root` is the relative prefix back to the demo
 * home ("." on the home page, ".." on subpages) — plain static links, no
 * router.
 */
export function AppNav({
  active,
  root,
  dark,
  onToggleDark,
}: Readonly<{
  active: DemoPage;
  root: string;
  dark: boolean;
  onToggleDark: () => void;
}>) {
  const href = (path: string) =>
    path === "" ? `${root}/` : `${root}/${path}/`;
  return (
    <header className="nav">
      <div className="nav__inner shell">
        <Wordmark href={href("")} />
        <nav className="nav__links">
          {PAGES.map((p) => (
            <a
              key={p.key}
              href={href(p.path)}
              className={active === p.key ? "is-on" : undefined}
              aria-current={active === p.key ? "page" : undefined}
            >
              {p.label}
            </a>
          ))}
        </nav>
        <div className="nav__right">
          <button
            type="button"
            className="nav__icon"
            onClick={onToggleDark}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <a
            className="nav__docs"
            href={`${DOCS_URL}getting-started/`}
            target="_blank"
            rel="noreferrer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Docs
          </a>
          <a
            className="nav__cta"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
          >
            <External size={14} /> GitHub
          </a>
        </div>
      </div>
    </header>
  );
}

const DOCS_URL = "https://orwa-mahmoud.github.io/adapttable/";
const REPO_URL = "https://github.com/orwa-mahmoud/adapttable";

export function Install({ large = false }: Readonly<{ large?: boolean }>) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={large ? "install install--lg" : "install"}>
      <span className="install__prompt">$</span>
      <code>npx @adapttable/cli init</code>
      {!large && (
        <button
          type="button"
          className={copied ? "install__copy ok" : "install__copy"}
          aria-label="Copy install command"
          onClick={() => {
            void navigator.clipboard?.writeText("npx @adapttable/cli init");
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
        >
          <Check size={14} />
        </button>
      )}
    </div>
  );
}

const STACKBLITZ_URL =
  "https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine";

/** Install + try-in-browser CTAs parked at the moment of kit-switch delight. */
export function TrialCta() {
  return (
    <div className="trial-cta">
      <Install />
      <a
        className="trial-cta__blitz"
        href={STACKBLITZ_URL}
        target="_blank"
        rel="noreferrer"
      >
        <External size={14} /> Open in StackBlitz
      </a>
      <a className="trial-cta__docs" href={`${DOCS_URL}getting-started/`}>
        Docs
      </a>
    </div>
  );
}

/** One small title + one helper line — the active nav tab already says
 * which page this is, so no kicker. */
export function SectionHead({
  title,
  children,
}: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <div className="sec__head">
      <h2 className="sec__title">{title}</h2>
      {children ? <p className="sec__lead">{children}</p> : null}
    </div>
  );
}

/** Same link set as the landing's footer, with Landing in Demo's place.
 * Landing is the same product site, so it navigates in place; the truly
 * external destinations open in a new tab. */
const FOOT_LINKS = [
  {
    label: "Landing",
    href: DOCS_URL,
    icon: ["M3 10.5 12 3l9 7.5", "M5 9.5V21h14V9.5", "M9 21v-7h6v7"],
    newTab: false,
  },
  {
    label: "Docs",
    href: `${DOCS_URL}getting-started/`,
    icon: [
      "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
      "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
    ],
  },
  {
    label: "npm",
    href: "https://www.npmjs.com/org/adapttable",
    icon: [
      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
      "M3.27 6.96L12 12.01l8.73-5.05",
      "M12 22.08V12",
    ],
  },
  {
    label: "GitHub",
    href: REPO_URL,
    icon: [
      "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.55 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22",
    ],
  },
];

export function Footer({ root }: Readonly<{ root: string }>) {
  return (
    <footer className="foot">
      <div className="foot__inner shell">
        <div className="foot__lead">
          <Wordmark href={`${root}/`} />
          <p>Headless freedom, batteries included.</p>
        </div>
        <Install large />
        <div className="foot__links">
          {FOOT_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.newTab === false ? undefined : "_blank"}
              rel={l.newTab === false ? undefined : "noreferrer"}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {l.icon.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
