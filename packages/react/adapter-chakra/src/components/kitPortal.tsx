import { Portal } from "@chakra-ui/react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

/**
 * Chakra v3 `_dark` tokens only resolve under a `.dark` ancestor. Toolbar
 * menus, drawers, and dialogs portal to `document.body`, so they would stay
 * light unless the host class is copied onto the floating surface.
 */
export function KitPortal({ children }: { readonly children: ReactNode }) {
  const probeRef = useRef<HTMLSpanElement>(null);
  const [mode, setMode] = useState<"dark" | "light">("light");

  useLayoutEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;
    const read = () => {
      setMode(probe.closest(".dark") ? "dark" : "light");
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <span ref={probeRef} hidden aria-hidden="true" />
      <Portal>
        <div
          className={mode}
          data-adapttable-color-mode={mode}
          style={{ display: "contents" }}
        >
          {children}
        </div>
      </Portal>
    </>
  );
}
