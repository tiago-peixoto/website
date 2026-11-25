// Checks the built site: no em dash, and every internal link points at a file that exists.
import assert from "node:assert";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import "./check-plaza.js";
import "./check-preview.js";
import { START, play } from "./src/assets/game.js";

const out = "_site";
const pages = readdirSync(out, { recursive: true }).filter((f) => f.endsWith(".html"));
assert(pages.length >= 3, "expected both home pages and the journal");

for (const page of pages) {
  const html = readFileSync(join(out, page), "utf8");
  assert(!html.includes("—"), `${page} contains an em dash`);
  for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (!href.startsWith("/") && !href.startsWith(".")) continue;
    const url = href.split(/[?#]/)[0];
    const base = url.startsWith("/") ? out : join(out, dirname(page));
    const file = join(base, url.endsWith("/") ? url + "index.html" : url);
    assert(existsSync(file), `${page} links to ${url}, which does not exist`);
  }
}

// The battle: reproducing first doubles the fix, and both endings are reachable.
const exposed = play(START, "reproduce", () => 0).state;
assert(exposed.exposed && exposed.bug === 90);
assert.equal(play({ ...exposed, focus: 60 }, "simplest", () => 0).state.bug, 40);
assert.equal(play(START, "simplest", () => 0).state.bug, 100, "an unlucky blind fix misses");
assert.equal(play(START, "simplest", () => 0.9).state.bug, 75);
assert.equal(play({ ...START, focus: 20 }, "teach", () => 0).state.focus, 33);
assert.equal(play({ ...START, bug: 10 }, "reproduce", () => 0).state.focus, 60, "a fixed bug does not strike back");
assert.equal(play({ ...START, focus: 5 }, "teach", () => 0.9).state.focus, 12);
assert.equal(play({ ...START, focus: 5 }, "simplest", () => 0).state.focus, 0);

console.log(`ok: ${pages.length} pages checked`);
