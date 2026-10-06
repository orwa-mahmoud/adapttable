class TestResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("ResizeObserver", TestResizeObserver);
vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
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
