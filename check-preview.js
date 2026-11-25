import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

const directory = mkdtempSync(join(tmpdir(), "plaza-preview-"));
try {
  const file = join(directory, "plaza.html");
  execFileSync(process.execPath, ["scripts/plaza-preview.js", file]);
  const html = readFileSync(file, "utf8");
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const elements = new Map();
  const requested = [];
  const errors = [];
  const stopped = new Error("Stop before Phaser rendering in the browser-free check");
  const element = (selector) => {
    if (!elements.has(selector)) elements.set(selector, {
      hidden: true, dataset: { loading: "loading", error: "failed" }, listeners: {},
      addEventListener(type, listener) { this.listeners[type] = listener; },
      showModal() {}, focus() {},
    });
    return elements.get(selector);
  };
  runInNewContext(script, {
    document: { querySelector: element }, window: { Phaser: {} }, AbortSignal,
    console: { error: (error) => errors.push(error) },
    fetch: async (url) => { requested.push(url); throw stopped; },
  });
  assert.equal(requested.length, 0, "standalone preview waits for entry");
  await element("#enter").listeners.click();
  assert.equal(requested.length, 3, "inlined entry resolves the scene function without a shadowed binding");
  assert(requested.every((url) => url.startsWith("data:application/json;base64,")));
  assert.deepEqual(errors, [stopped], "only the deliberate rendering stop should fail");
  assert.equal(element("#enter").disabled, false, "failed standalone entry can be retried");
  console.log("ok: self-contained preview syntax, deferred entry, scene binding and inline map URLs");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
