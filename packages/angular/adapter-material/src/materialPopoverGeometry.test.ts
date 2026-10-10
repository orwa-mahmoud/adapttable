import { fitFilterOverlayHorizontally } from "./components/materialPopoverGeometry";

function rect(left: number, width: number): DOMRect {
  return DOMRect.fromRect({ x: left, y: 444, width, height: 388 });
}

for (const gutter of [0, 15]) {
  for (const dir of ["ltr", "rtl"]) {
    it(`keeps a ${dir} 390px filter in its actual container with a ${gutter}px scrollbar gutter`, () => {
      const pane = document.createElement("div");
      const container = document.createElement("div");
      pane.dir = dir;
      pane.style.transform = "translateY(4px)";
      let viewport = 390;
      let containerWidth = viewport - gutter;
      let width = containerWidth - 16;
      let left = dir === "rtl" ? -7 : 15;
      vi.spyOn(
        document.documentElement,
        "clientWidth",
        "get"
      ).mockImplementation(() => viewport);
      vi.spyOn(container, "getBoundingClientRect").mockImplementation(() =>
        rect(0, containerWidth)
      );
      vi.spyOn(pane, "getBoundingClientRect").mockImplementation(() =>
        rect(left + (Number.parseFloat(pane.style.translate) || 0), width)
      );
      const assertFit = () => {
        fitFilterOverlayHorizontally(pane, container);
        const card = pane.getBoundingClientRect();
        expect(card.left).toBeGreaterThanOrEqual(8);
        expect(card.right).toBeLessThanOrEqual(containerWidth - 8);
        expect(pane.style.transform).toBe("translateY(4px)");
      };
      assertFit();
      const firstShift = pane.style.translate;
      assertFit();
      expect(pane.style.translate).toBe(firstShift);

      viewport = 320;
      containerWidth = viewport - gutter;
      width = containerWidth - 16;
      left = dir === "rtl" ? -22 : 27;
      assertFit();

      viewport = 1180;
      containerWidth = viewport - gutter;
      width = 374;
      left = 200;
      assertFit();
      expect(pane.style.translate).toBe("");
    });
  }
}

it.each([
  { containerWidth: 0, viewportWidth: 390 },
  { containerWidth: 390, viewportWidth: 0 },
])(
  "waits for mounted bounds and clears an old correction: %j",
  ({ containerWidth, viewportWidth }) => {
    const pane = document.createElement("div");
    const container = document.createElement("div");
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue(
      rect(0, containerWidth)
    );
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
      viewportWidth
    );
    pane.style.translate = "15px";
    fitFilterOverlayHorizontally(pane, container);
    expect(pane.style.translate).toBe("");
  }
);
