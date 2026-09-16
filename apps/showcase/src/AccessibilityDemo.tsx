import { Suspense, useEffect, useRef, useState } from "react";

import { DemoScenarioProvider } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Keyboard } from "./sectionIcons";

/** How many past announcements the transcript keeps on screen. */
const TRANSCRIPT_LENGTH = 6;

/**
 * Mirror what the table announces, as visible text.
 *
 * Screen-reader output is the one part of a table a sighted reader cannot
 * check, so this page shows it: an observer watches the live regions the table
 * already renders and repeats each message here. It reads the SAME nodes a
 * screen reader would — it does not reimplement the wording — so if the
 * transcript is empty, nothing was announced.
 */
function useAnnouncements(root: HTMLElement | null): string[] {
  const [lines, setLines] = useState<string[]>([]);
  const last = useRef("");
  useEffect(() => {
    if (!root) return undefined;
    const read = () => {
      const regions = root.querySelectorAll<HTMLElement>(
        '[aria-live], [role="status"], [role="alert"]'
      );
      for (const region of regions) {
        const text = region.textContent?.trim() ?? "";
        if (text === "" || text === last.current) continue;
        last.current = text;
        setLines((prev) => [text, ...prev].slice(0, TRANSCRIPT_LENGTH));
      }
    };
    const observer = new MutationObserver(read);
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    read();
    return () => {
      observer.disconnect();
    };
  }, [root]);
  return lines;
}

export function AccessibilityDemo({
  dark,
  adapter,
}: Readonly<FeatureBodyProps>) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const announcements = useAnnouncements(root);
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <span className="hint">
          <Keyboard size={12} /> Tab into the grid, then arrow between cells
        </span>
        <span className="hint">
          <Keyboard size={12} /> Home / End jump to the row&apos;s edges
        </span>
        <span className="hint">
          <Check size={12} /> every announcement appears in the transcript
        </span>
        <span className="hint">
          <Check size={12} /> hover a header to select its whole column
        </span>
        <span className="hint">
          <Check size={12} /> focus, selection and disabled stay visible in
          forced-colors — nothing is color-only
        </span>
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter} ref={setRoot}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="accessibility">
              <Demo
                mode="frontend"
                locale="en"
                dark={dark}
                urlKey="a11y"
                cellNavigation
                columnSelectionCheckbox
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
      <div className="mx-demo__body" data-testid="announcements">
        <strong>Announced to a screen reader</strong>
        {announcements.length === 0 ? (
          <p>
            Nothing yet — move through the grid and each announcement appears
            here as it is made.
          </p>
        ) : (
          <ol>
            {announcements.map((line, index) => (
              <li key={`${line}-${String(index)}`}>{line}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
