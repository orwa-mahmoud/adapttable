/**
 * Table URL state in the Angular Router: reading the route's query string,
 * writing through navigation, and following navigations the table did not
 * make.
 */
import { injectTableUrlState } from "@adapttable/angular";
import type { UrlStateAdapter } from "@adapttable/core";
import {
  Component,
  createEnvironmentInjector,
  EnvironmentInjector,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { angularRouterAdapter, provideAdaptTableRouterUrl } from "./index";

@Component({ template: "" })
class Page {}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: "**", component: Page }]),
      provideAdaptTableRouterUrl(),
    ],
  });
});

async function at(url: string): Promise<Router> {
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  return router;
}

function adapterIn(): { adapter: UrlStateAdapter; destroy: () => void } {
  const injector = createEnvironmentInjector(
    [],
    TestBed.inject(EnvironmentInjector)
  );
  return {
    adapter: angularRouterAdapter(injector),
    destroy: () => injector.destroy(),
  };
}

describe("angularRouterAdapter", () => {
  it("reads the query string the router is on, without the fragment", async () => {
    await at("/people?page=2&q=ada#top");
    const { adapter, destroy } = adapterIn();
    expect(adapter.getSearch()).toBe("page=2&q=ada");
    destroy();
  });

  it("writes by navigating, keeping the path and fragment, and reads its own write at once", async () => {
    const router = await at("/people?page=2#top");
    const navigate = vi.spyOn(router, "navigateByUrl");
    const { adapter, destroy } = adapterIn();
    adapter.setSearch("page=3");
    expect(adapter.getSearch()).toBe("page=3");
    expect(navigate).toHaveBeenCalledWith("/people?page=3#top", {
      replaceUrl: true,
    });
    adapter.setSearch("page=4", { push: true });
    expect(navigate).toHaveBeenLastCalledWith("/people?page=4#top", {
      replaceUrl: false,
    });
    adapter.setSearch("");
    expect(navigate).toHaveBeenLastCalledWith("/people#top", {
      replaceUrl: true,
    });
    destroy();
  });

  it("tells the table about a navigation it did not make, and not about its own", async () => {
    const router = await at("/people?page=2");
    const { adapter, destroy } = adapterIn();
    const heard = vi.fn();
    adapter.subscribe(heard);
    adapter.setSearch("page=3");
    await TestBed.inject(Router).navigateByUrl("/people?page=3");
    expect(heard).not.toHaveBeenCalled();
    await router.navigateByUrl("/people?page=9");
    expect(heard).toHaveBeenCalledTimes(1);
    expect(adapter.getSearch()).toBe("page=9");
    destroy();
    await router.navigateByUrl("/people?page=1");
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("keeps a table's state in the route when provided for the injector", async () => {
    const router = await at("/people?page=4");
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector)
    );
    const url = injectTableUrlState({ injector });
    expect(url.state().page).toBe(4);
    url.setPage(5);
    await vi.waitFor(() => {
      const [path, search] = router.url.split("?");
      expect(path).toBe("/people");
      expect(new URLSearchParams(search).get("page")).toBe("5");
    });
    injector.destroy();
  });

  it("does not navigate for a write that changes nothing", async () => {
    const router = await at("/people?page=2");
    const navigate = vi.spyOn(router, "navigateByUrl");
    const { adapter, destroy } = adapterIn();
    adapter.setSearch("page=2");
    expect(navigate).not.toHaveBeenCalled();
    destroy();
  });
});
