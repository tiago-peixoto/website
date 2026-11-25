import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAP, START, DIRECTIONS, walkable, atDoor, update } from "./src/assets/plaza-map.js";

assert.equal(MAP.length, 14);
assert(MAP.every((row) => row.length === 20));
assert.equal(MAP[START.y][START.x], "S");
for (const [x, y] of [[-1, 6], [20, 6], [9, -1], [9, 14], [0, 6], [19, 6], [9, 0], [9, 13], [2, 2], [3, 4]]) {
  assert.equal(walkable(x, y), false, `blocked or outside map: ${x},${y}`);
}
assert.deepEqual(update({ ...START, x: 1 }, "left"), { ...START, x: 1, facing: "left" });
assert.deepEqual(update({ ...START, x: 2, y: 4 }, "up"), { ...START, x: 2, y: 4 });
assert.equal(update(START, "interact"), START, "cannot interact from the start");

let state = START;
for (const direction of ["left", "left", "left", "left", "left", "left", "up"]) state = update(state, direction);
assert(atDoor(state), "walking from the start reaches the university door");
const position = { ...state };
state = update(state, "interact");
assert(state.panel);
assert.equal(update(state, "down"), state, "movement pauses while reading");
assert.deepEqual(update(state, "close"), position, "closing returns to the same tile and facing");
assert(update(START, "open").panel, "the directory opens the panel without walking");
assert.deepEqual(update(update(START, "open"), "close"), START);

const seen = new Set([`${START.x},${START.y}`]);
const queue = [START];
for (const current of queue) {
  for (const direction of Object.keys(DIRECTIONS)) {
    const next = update(current, direction);
    const key = `${next.x},${next.y}`;
    assert(walkable(next.x, next.y));
    if (!seen.has(key)) { seen.add(key); queue.push(next); }
  }
}
assert.equal(seen.size, MAP.join("").replace(/[^.S]/g, "").length, "every walkable tile is reachable");

// C09, the published university entry, copied from the accepted brief and not from the site data.
const C09 = {
  en: ["2006 - 2012", "UFSC", "Tutorial level", "Bachelor of Engineering in Mechatronics, Robotics and Automation."],
  "pt-BR": ["2006 - 2012", "UFSC", "Fase tutorial", "Bacharelado em Engenharia Mecatrônica, Robótica e Automação."],
};
const { langs } = JSON.parse(readFileSync("src/_data/i18n.json", "utf8"));
assert.deepEqual(langs.map((t) => t.lang).sort(), Object.keys(C09).sort());
for (const t of langs) {
  const html = readFileSync(`_site${t.url}play/index.html`, "utf8");
  const regular = readFileSync(`_site/${t.path}`, "utf8");
  for (const text of C09[t.lang]) {
    assert(html.includes(text), `preview preserves ${t.lang} university wording: ${text}`);
    assert(regular.includes(text), `regular page preserves ${t.lang} university wording: ${text}`);
  }
  assert(html.includes(`<html lang="${t.lang}">`));
  assert(html.includes('<dialog aria-labelledby="university-title"'));
  assert(html.includes('<form method="dialog">'));
  assert(html.indexOf('id="portfolio" href="../"') < html.indexOf("<canvas"));
  assert(html.includes('<div id="playable" hidden>'));
}
assert(!readFileSync("_site/sitemap.xml", "utf8").includes("/play/"), "preview stays out of the public sitemap");
console.log("ok: plaza bounds, collisions, reachability, panel state and both languages");
