import { describe, it } from "vitest";
import { createQuery } from "query:index";
import { act, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ErrNoQueryInstanceFound, useQueryInstance } from "./useQueryInstance";

describe("useQueryInstance", function () {
  it("can get a query instance", async ({ expect }) => {
    function fetcher(key: string) {
      return Promise.resolve(key);
    }

    const query = createQuery({ fetcher });
    const options = { query };
    let queryFromHook: unknown = null;

    function Component() {
      queryFromHook = useQueryInstance(options);
      return null;
    }

    const container = document.createElement("div");

    // oxlint-disable-next-line
    await act(async function () {
      createRoot(container).render(
        <Suspense fallback="loading">
          <Component />
        </Suspense>,
      );
    });

    expect(queryFromHook).not.toBeNull();
  });

  it("throws if no query instance is found", async ({ expect }) => {
    let caughtError: Error | undefined = undefined;

    function Component() {
      try {
        useQueryInstance();
      } catch (e) {
        caughtError = e as Error;
      }
      return null;
    }

    const container = document.createElement("div");

    // oxlint-disable-next-line
    await act(async function () {
      createRoot(container).render(
        <Suspense fallback="loading">
          <Component />
        </Suspense>,
      );
    });

    expect(caughtError).toBe(ErrNoQueryInstanceFound);
  });
});
