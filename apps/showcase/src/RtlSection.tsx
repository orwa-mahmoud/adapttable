import { ChakraDemo } from "./adapters/ChakraDemo";
import { SectionHead } from "./sections";

export function RtlSection({ dark }: Readonly<{ dark: boolean }>) {
  return (
    <section className="sec shell" id="rtl">
      <SectionHead title="Right-to-left, for real.">
        Switch to Arabic and the entire layout mirrors — toolbar, sort arrows,
        pinned columns, pagination. Not just translated strings: a genuinely
        flipped axis.
      </SectionHead>
      <div className="pad-surface">
        <div className="pad-surface__body">
          <ChakraDemo mode="frontend" locale="ar" dark={dark} urlKey="rtl" />
        </div>
      </div>
    </section>
  );
}
