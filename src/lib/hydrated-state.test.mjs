import assert from "node:assert/strict";
import { test } from "node:test";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { loadTs } from "./test-helpers.mjs";

// Exercise server/hydration snapshots and state transitions without browser I/O.
function fixture() {
  const slots = [];
  let cursor = 0;
  let changed = false;
  let hydrated = false;
  const react = {
    useCallback: (callback) => callback,
    useSyncExternalStore: (_subscribe, client, server) => hydrated ? client() : server(),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (update) => {
        const next = typeof update === "function" ? update(slots[index]) : update;
        if (!Object.is(next, slots[index])) { slots[index] = next; changed = true; }
      }];
    },
  };
  const hooks = loadTs("../hooks/use-hydrated-state.ts", { react });
  const stored = loadTs("../hooks/use-stored-open.ts", { react, "@/hooks/use-hydrated-state": hooks });
  return {
    ...hooks, ...stored,
    hydrate() { hydrated = true; },
    render(callback) {
      let result;
      for (let pass = 0; pass < 20; pass++) {
        cursor = 0; changed = false;
        result = callback();
        if (!changed) return result;
      }
      throw new Error("State did not settle");
    },
  };
}

test("server rendering keeps its fallback without reading browser state", () => {
  const { useHydratedState } = loadTs("../hooks/use-hydrated-state.ts", { react: React });
  function Example() {
    const [value] = useHydratedState(() => { throw new Error("Browser state read during SSR"); }, "server");
    return React.createElement("span", null, value);
  }
  assert.equal(renderToString(React.createElement(Example)), "<span>server</span>");
});

test("hydration reads once and preserves subsequent local and functional updates", () => {
  const f = fixture();
  let reads = 0;
  let saved = "dark";
  const render = () => f.render(() => f.useHydratedState(() => { reads++; return saved; }, null));
  assert.equal(render()[0], null);
  assert.equal(reads, 0);
  f.hydrate();
  assert.equal(render()[0], "dark");
  assert.equal(reads, 1);
  saved = "light";
  assert.equal(render()[0], "dark");
  render()[1]((value) => value === "dark" ? "light" : "dark");
  assert.equal(render()[0], "light");
  render()[1](null);
  assert.equal(render()[0], null);
  assert.equal(reads, 1);
});

test("stored collapse preferences preserve keys, defaults and toggles when storage fails", (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map([["first", "0"], ["second", "1"]]);
  let blocked = false;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem(key) { if (blocked) throw new Error("blocked"); return values.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error("blocked"); values.set(key, value); },
  } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, "localStorage", previous); else delete globalThis.localStorage; });
  const f = fixture();
  let key = "first";
  const render = () => f.render(() => f.useStoredOpen(key, true));
  assert.equal(render().open, true);
  f.hydrate();
  assert.equal(render().open, false);
  render().toggle();
  assert.equal(render().open, true);
  assert.equal(values.get("first"), "1");
  key = "second";
  assert.equal(render().open, true);
  render().toggle();
  key = "missing";
  assert.equal(render().open, false); // Missing new keys retain the current choice.
  blocked = true;
  render().toggle();
  assert.equal(render().open, true);
  render().toggle();
  assert.equal(render().open, false);
  const fresh = fixture();
  fresh.hydrate();
  assert.equal(fresh.render(() => fresh.useStoredOpen("blocked", true)).open, true);
});
