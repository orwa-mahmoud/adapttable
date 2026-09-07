/**
 * One page component for the whole adapter × feature matrix.
 *
 * "AdaptTable for Mantine" and "Saved views in Mantine" are the same page with
 * different arguments, and so are the hundred and fifty that follow them.
 * The words come from `matrix.mjs`, the demo from `featureBodies.tsx`, and the kit's
 * accent from the adapter's own token — so a new adapter is a data entry, not a
 * new component.
 *
 * The design is documented in `tokens.css`: the chrome is the engine, the demo
 * surface is the kit, and the seam between them is drawn rather than implied.
 */
import {
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cssVars } from "../cssVars";
import { DemoFallback } from "../kitDemos";
import {
  Bolt,
  Check,
  CheckSquare,
  Columns,
  Database,
  Download,
  External,
  Filter,
  Formula,
  Globe,
  Grip,
  Keyboard,
  Nested,
  Pencil,
  Phone,
  Pin,
  Pivot,
  Rows,
  Sigma,
  Spark,
  Star,
  Tree,
} from "../sectionIcons";
import {
  adapterHref,
  DOCS_URL,
  fillTemplate,
  introFor,
  kitAccent,
  LANDING,
  MATRIX_FEATURES,
  type MatrixFeature,
  type MatrixRoute,
  SHOWCASE_ADAPTERS,
  type ShowcaseAdapter,
} from "./content";
import { FEATURE_BODIES, LandingTable } from "./featureBodies";

/**
 * A mark per feature. Each draws the shape of the thing — a pivot is a grid
 * with a marked row and column, grouping is rows folded under a header — so the
 * grid is scannable before any of it is read.
 */
const FEATURE_ICONS: Record<string, (props: { size?: number }) => ReactNode> = {
  accessibility: Keyboard,
  columns: Columns,
  "column-groups": Columns,
  editing: Pencil,
  export: Download,
  filtering: Filter,
  formulas: Formula,
  grouping: Rows,
  aggregation: Sigma,
  "mobile-cards": Phone,
  "nested-tables": Nested,
  pivot: Pivot,
  realtime: Bolt,
  rows: Pin,
  "row-reordering": Grip,
  rtl: Globe,
  "saved-views": Star,
  scale: Database,
  selection: CheckSquare,
  tree: Tree,
  ai: Spark,
};

/**
 * A heading with the kit's name picked out in the kit's colour.
 *
 * Split rather than templated into two fields: the headings read as sentences
 * ("Saved views in Mantine", "AdaptTable for Mantine"), and a sentence written
 * as two halves is a sentence that will eventually be assembled wrongly.
 */
function KitHeading({
  text,
  kit,
}: Readonly<{ text: string; kit: string }>): ReactNode {
  const parts = text.split(kit);
  return (
    <h1 className="mx-title">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 && <em>{kit}</em>}
          {part}
        </span>
      ))}
    </h1>
  );
}

/**
 * One paragraph of matrix copy, with `backticked` spans set as code.
 *
 * The same convention the served HTML uses, so a prop name reads as a prop
 * name whether the bundle has arrived or not.
 */
function Lead({ text }: Readonly<{ text: string }>) {
  return (
    <p className="mx-lead">
      {text
        .split("`")
        .map((part, index) =>
          index % 2 === 1 ? (
            <code key={`${part}-${index}`}>{part}</code>
          ) : (
            <span key={`${part}-${index}`}>{part}</span>
          )
        )}
    </p>
  );
}

/** The monospace key line above a heading. */
function Kicker({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="mx-kicker">{children}</p>;
}

/**
 * The seam: where the page's own chrome stops and the adapter's begins, with
 * the package that renders everything below it named on the line.
 */
function Seam({ pkg }: Readonly<{ pkg: string }>) {
  return (
    <p className="mx-seam">
      rendered by <span className="mx-seam__pkg">{pkg}</span>
    </p>
  );
}

/** Copy-to-clipboard, with the button reporting what it did. */
function useCopy(text: string) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    []
  );
  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(text);
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1400);
  }, [text]);
  return { done, copy };
}

/** A titled code window. The bar names what the code is, which a bare block never does. */
function CodeBlock({ title, code }: Readonly<{ title: string; code: string }>) {
  const { done, copy } = useCopy(code);
  return (
    <div className="mx-code">
      <div className="mx-code__bar">
        <span>{title}</span>
        <button
          type="button"
          className={done ? "mx-code__copy is-done" : "mx-code__copy"}
          onClick={copy}
        >
          {done ? <Check size={12} /> : null}
          {done ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** The three facts a developer needs before they read anything else. */
function SpecPlate({ adapter }: Readonly<{ adapter: ShowcaseAdapter }>) {
  const { done, copy } = useCopy(adapter.install);
  return (
    <aside className="mx-plate">
      <div className="mx-plate__head">
        <span>{adapter.pkg}</span>
        <button
          type="button"
          className={done ? "mx-code__copy is-done" : "mx-code__copy"}
          onClick={copy}
        >
          {done ? <Check size={12} /> : null}
          {done ? "Copied" : "Copy install"}
        </button>
      </div>
      <div className="mx-plate__row">
        <span className="mx-plate__key">Install</span>
        <code className="mx-plate__val">{adapter.install}</code>
      </div>
      <div className="mx-plate__row">
        <span className="mx-plate__key">Import</span>
        <code className="mx-plate__val">
          {`import { DataTable } from "${adapter.pkg}";`}
        </code>
      </div>
      {adapter.provider ? (
        <div className="mx-plate__row">
          <span className="mx-plate__key">Wrap in</span>
          <code className="mx-plate__val">{`<${adapter.provider}>`}</code>
        </div>
      ) : null}
      <div className="mx-plate__row">
        <span className="mx-plate__key">Peer</span>
        <code className="mx-plate__val">{adapter.peer}</code>
      </div>
    </aside>
  );
}

/** The matrix features of one kit, as a grid of links. */
function FeatureGrid({
  adapter,
  root,
}: Readonly<{ adapter: ShowcaseAdapter; root: string }>) {
  return (
    <div className="mx-grid">
      {MATRIX_FEATURES.map((feature) => {
        const Icon = FEATURE_ICONS[feature.slug];
        return (
          <a
            key={feature.slug}
            className="mx-card"
            href={`${root}/${adapter.key}/${feature.slug}/`}
          >
            <span className="mx-card__name">
              {Icon ? <Icon size={17} /> : null}
              {feature.label}
            </span>
            <p className="mx-card__desc">
              {fillTemplate(feature.card, adapter)}
            </p>
            <span className="mx-card__path">
              /{adapter.key}/{feature.slug}/
            </span>
          </a>
        );
      })}
    </div>
  );
}

/** Every other kit, each a link to where that kit can be seen. */
function KitStrip({
  adapter,
  dark,
  root,
}: Readonly<{ adapter: ShowcaseAdapter; dark: boolean; root: string }>) {
  return (
    <div className="mx-kits">
      {SHOWCASE_ADAPTERS.filter((kit) => kit.key !== adapter.key).map((kit) => (
        <a
          key={kit.key}
          className="mx-kit"
          href={adapterHref(kit, root)}
          style={cssVars({ "--c": kitAccent(kit, dark) })}
        >
          <span className="mx-kit__name">{kit.label}</span>
          <span className="mx-kit__blurb">{kit.blurb}</span>
        </a>
      ))}
    </div>
  );
}

/** The other features of this kit, at the size of a footnote. */
function FeatureRail({
  adapter,
  current,
  root,
}: Readonly<{
  adapter: ShowcaseAdapter;
  current: MatrixFeature;
  root: string;
}>) {
  return (
    <nav className="mx-rail" aria-label={`${adapter.label} features`}>
      {MATRIX_FEATURES.map((feature) => (
        <a
          key={feature.slug}
          href={`${root}/${adapter.key}/${feature.slug}/`}
          aria-current={feature.slug === current.slug ? "page" : undefined}
        >
          {feature.label}
        </a>
      ))}
    </nav>
  );
}

/** "AdaptTable for Mantine": what the package is, what it costs, what it does. */
function AdapterLanding({
  adapter,
  dark,
  root,
}: Readonly<{ adapter: ShowcaseAdapter; dark: boolean; root: string }>) {
  const fill = (text: string) => fillTemplate(text, adapter);
  return (
    <>
      <header className="mx-hero">
        <div className="mx-hero__body">
          <Kicker>
            <span className="mx-kicker__pkg">{adapter.pkg}</span>
          </Kicker>
          <KitHeading text={fill(LANDING.h1)} kit={adapter.label} />
          {LANDING.intro.map((line) => (
            <Lead key={line} text={fill(line)} />
          ))}
          <div className="mx-actions">
            <a
              className="mx-btn mx-btn--primary"
              href={`${DOCS_URL}getting-started/`}
              target="_blank"
              rel="noreferrer"
            >
              <External size={14} /> Get started
            </a>
            <a className="mx-btn" href={`${root}/?kit=${adapter.key}`}>
              Compare all eight kits
            </a>
          </div>
        </div>
        <SpecPlate adapter={adapter} />
      </header>

      <Seam pkg={adapter.pkg} />
      <Suspense fallback={<DemoFallback />}>
        <LandingTable dark={dark} adapter={adapter.key} />
      </Suspense>

      <section className="mx-section">
        <div className="mx-section__head">
          <h2 className="mx-h2">{fill(LANDING.gridTitle)}</h2>
          <p className="mx-section__lead">{fill(LANDING.gridLead)}</p>
        </div>
        <FeatureGrid adapter={adapter} root={root} />
      </section>

      <section className="mx-section">
        <div className="mx-section__head">
          <h2 className="mx-h2">{fill(LANDING.kitsTitle)}</h2>
          <p className="mx-section__lead">{fill(LANDING.kitsLead)}</p>
        </div>
        <KitStrip adapter={adapter} dark={dark} root={root} />
      </section>
    </>
  );
}

/** "Saved views in Mantine": the words, the code, the kit's own note, the demo. */
function FeaturePage({
  adapter,
  feature,
  dark,
  root,
}: Readonly<{
  adapter: ShowcaseAdapter;
  feature: MatrixFeature;
  dark: boolean;
  root: string;
}>) {
  const fill = (text: string) => fillTemplate(text, adapter);
  const Body = FEATURE_BODIES[feature.slug];
  if (!Body) {
    throw new Error(`No demo body for feature "${feature.slug}"`);
  }
  const note = feature.notes[adapter.key];
  // On a page whose demo is the point, the implementation tutorial follows
  // the experience instead of standing in front of it. The content is the
  // same and stays in the rendered HTML — only its place on the page moves.
  const demoFirst = feature.slug === "ai";
  const brief = (
    <div className="mx-brief">
      <CodeBlock
        title={`${feature.label} · ${adapter.label}`}
        code={fill(feature.snippet)}
      />
      <div className="mx-brief__side">
        {note ? (
          <div className="mx-note">
            <span className="mx-note__key">In {adapter.label}</span>
            <p>{note}</p>
          </div>
        ) : null}
        <div className="mx-refs">
          <span className="mx-refs__key">Reference</span>
          <div className="mx-refs__list">
            {feature.docs.map((slug) => (
              <a
                key={slug}
                href={`${DOCS_URL}${slug}/`}
                target="_blank"
                rel="noreferrer"
              >
                {slug.replaceAll("-", " ")}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className="mx-hero mx-hero--solo">
        <div className="mx-hero__body">
          <Kicker>
            <a href={`${root}/${adapter.key}/`}>
              AdaptTable for {adapter.label}
            </a>
            <span className="mx-kicker__sep">/</span>
            {feature.label}
          </Kicker>
          <KitHeading text={fill(feature.h1)} kit={adapter.label} />
          {introFor(feature, adapter).map((line) => (
            <Lead key={line} text={fill(line)} />
          ))}
        </div>
      </header>

      {demoFirst ? null : brief}

      <Seam pkg={adapter.pkg} />
      {Body ? (
        <Suspense fallback={<DemoFallback />}>
          <Body dark={dark} adapter={adapter.key} />
        </Suspense>
      ) : null}

      {demoFirst ? (
        <details className="mx-brief-fold">
          <summary>Integration example</summary>
          {brief}
        </details>
      ) : null}

      <section className="mx-section">
        <div className="mx-section__head">
          <h2 className="mx-h2">The rest of {adapter.label}</h2>
          <p className="mx-section__lead">
            Same engine, same props, one page each.
          </p>
        </div>
        <FeatureRail adapter={adapter} current={feature} root={root} />
      </section>
    </>
  );
}

/**
 * The matrix page.
 *
 * @param props - The route this page is for, the theme, and the prefix back to
 *   the demo home.
 * @returns The landing page or the feature page, tinted with the kit's accent.
 */
export function MatrixPage({
  route,
  dark,
  root,
}: Readonly<{ route: MatrixRoute; dark: boolean; root: string }>) {
  const { adapter, feature } = route;
  return (
    <div
      className="mx shell"
      style={cssVars({
        "--kit": kitAccent(adapter, dark),
        "--c": kitAccent(adapter, dark),
      })}
    >
      {feature ? (
        <FeaturePage
          adapter={adapter}
          feature={feature}
          dark={dark}
          root={root}
        />
      ) : (
        <AdapterLanding adapter={adapter} dark={dark} root={root} />
      )}
    </div>
  );
}
