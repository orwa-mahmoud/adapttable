import { fitBootstrapPopoverHorizontally } from "./bootstrapPopoverGeometry";

describe("native Bootstrap popover viewport fit", () => {
  it("does not measure a document without a browser window", () => {
    const document = window.document.implementation.createHTMLDocument();
    const pane = document.createElement("div");
    fitBootstrapPopoverHorizontally(pane);
    expect(pane.getAttribute("style")).toBeNull();
  });
  it("fits either overflowing edge and releases its shift after native repositioning", () => {
    const pane = document.createElement("div");
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
      390
    );
    let left = 135;
    vi.spyOn(pane, "getBoundingClientRect").mockImplementation(() =>
      DOMRect.fromRect({
        x: left + (Number.parseFloat(pane.style.translate) || 0),
        width: 372,
        height: 300,
      })
    );
    fitBootstrapPopoverHorizontally(pane);
    expect(pane.style.maxWidth).toBe("374px");
    expect(pane.style.translate).toBe("-125px");
    fitBootstrapPopoverHorizontally(pane);
    expect(pane.style.translate).toBe("-125px");
    left = -80;
    fitBootstrapPopoverHorizontally(pane);
    expect(pane.style.translate).toBe("88px");
    left = 8;
    fitBootstrapPopoverHorizontally(pane);
    expect(pane.style.translate).toBe("");
  });

  it("uses the browser width before the document has layout", () => {
    const pane = document.createElement("div");
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(0);
    pane.getBoundingClientRect = () => DOMRect.fromRect({ x: 20, width: 100 });
    fitBootstrapPopoverHorizontally(pane);
    expect(pane.style.maxWidth).toBe(`${window.innerWidth - 16}px`);
    expect(pane.style.translate).toBe("");
  });
});
