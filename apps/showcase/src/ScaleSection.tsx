import { ScaleDemo } from "./ScaleDemo";
import { SectionHead } from "./sections";

export function ScaleSection({ dark }: Readonly<{ dark: boolean }>) {
  return (
    <section className="sec shell" id="scale">
      <SectionHead title="Scrolls 50,000 rows without flinching.">
        This page really holds fifty thousand people, but the DOM only ever
        contains the handful of rows in view — the header stays pinned while the
        rest streams past with zero lag. Type to filter: the whole set is
        searched and the window re-computes instantly.
      </SectionHead>
      {/* No pad-surface here: its overflow clipping would break the
          page-level sticky header, and this table owns the page. */}
      <ScaleDemo dark={dark} />
    </section>
  );
}
