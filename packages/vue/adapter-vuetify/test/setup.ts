class TestResizeObserver implements ResizeObserver {
  private readonly targets = new Set<Element>();
  observe(target: Element): void {
    this.targets.add(target);
  }
  unobserve(target: Element): void {
    this.targets.delete(target);
  }
  disconnect(): void {
    this.targets.clear();
  }
}

class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds = [0];
  private readonly targets = new Set<Element>();
  observe(target: Element): void {
    this.targets.add(target);
  }
  unobserve(target: Element): void {
    this.targets.delete(target);
  }
  disconnect(): void {
    this.targets.clear();
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

class TestVisualViewport extends EventTarget implements VisualViewport {
  readonly width = 1024;
  readonly height = 768;
  readonly offsetLeft = 0;
  readonly offsetTop = 0;
  readonly pageLeft = 0;
  readonly pageTop = 0;
  readonly scale = 1;
  onresize: VisualViewport["onresize"] = null;
  onscroll: VisualViewport["onscroll"] = null;
}

vi.stubGlobal("ResizeObserver", TestResizeObserver);
vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
vi.stubGlobal("visualViewport", new TestVisualViewport());
vi.stubGlobal("matchMedia", (query: string) => ({
  media: query,
  matches: false,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => true,
}));
