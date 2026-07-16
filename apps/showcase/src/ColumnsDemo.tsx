import { AntdDemo } from "./adapters/AntdDemo";
import { Columns, Pin, Resize } from "./sectionIcons";
import { SectionHead } from "./sections";

export function ColumnsDemo({ dark }: Readonly<{ dark: boolean }>) {
  return (
    <section className="sec shell" id="columns">
      <SectionHead title="Wide tables, fully handled.">
        Show/hide, drag-reorder, pin to the start, and resize by drag or
        keyboard — open the Columns menu, grab a header edge, or tap the pin to
        stick a column to the start, then tap again to unpin. Persist the layout
        to localStorage, the URL, or your server.
      </SectionHead>
      <div className="pad-surface">
        <div className="hint-row">
          <span className="hint">
            <Pin size={12} /> Pin a column to the start
          </span>
          <span className="hint">
            <Resize size={12} /> drag a column edge to resize
          </span>
          <span className="hint">
            <Columns size={12} /> Columns menu reorders &amp; hides
          </span>
        </div>
        <div className="pad-surface__body">
          <AntdDemo
            mode="frontend"
            locale="en"
            dark={dark}
            urlKey="cols"
            wide
          />
        </div>
      </div>
    </section>
  );
}
