import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { DIRECTIONS, navigation } from "./src/assets/plaza-map.js";

const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const art = json("src/assets/plaza-art/courtyard.tmj");
const map = json("src/assets/plaza-navigation.tmj");
const layout = json("src/assets/plaza-art/walker-layout.json");
const rules = navigation(map);
const objects = art.layers.flatMap((layer) => layer.objects || []);
const spawn = objects.find((object) => object.name === "walker");
const start = { x: spawn.x + spawn.width / 2, y: spawn.properties.find((p) => p.name === "feetY").value, facing: "down" };
assert.deepEqual([map.width, map.height, map.tilewidth, map.tileheight], [art.width, art.height, art.tilewidth, art.tileheight]);
assert.equal(art.width * art.height, 384);
assert(rules.walkable(start.x, start.y));
assert(!rules.atDoor(start));
for (const layer of [...art.layers, ...map.layers].filter((layer) => layer.type === "tilelayer")) {
  assert.equal(layer.data.length, layer.width * layer.height);
  assert(layer.data.every(Number.isInteger));
}
for (const tileset of art.tilesets) {
  const images = tileset.image ? [tileset.image] : tileset.tiles.map((tile) => tile.image);
  for (const image of images) assert(existsSync(`src/assets/plaza-art/${image}`), image);
}
const tileset = art.tilesets.find((set) => set.tiles);
for (const object of objects) assert(tileset.tiles.some((tile) => tile.id + tileset.firstgid === object.gid), object.name);
const water = tileset.tiles.find((tile) => tile.animation).animation;
assert.equal(water.length, 4);
assert(water.every((frame) => frame.duration === 180 && tileset.tiles.some((tile) => tile.id === frame.tileid)));
assert.deepEqual(layout.cell, [32, 48]);
assert.equal(layout.frames.length, 28);
assert(layout.frameMs.every((ms) => ms === 100));

const blocked = map.layers.find((layer) => layer.name === "blocked");
blocked.data.forEach((tile, index) => {
  if (tile) assert(!rules.walkable((index % map.width) * 16 + 8, Math.floor(index / map.width) * 16 + 8), `blocked tile ${index}`);
});
for (const object of map.layers.find((layer) => layer.name === "obstacles").objects) {
  assert(!rules.walkable(object.x + object.width / 2, object.y + object.height / 2), object.name);
}
for (const [x, y] of [[-1, 200], [384, 200], [200, -1], [200, 256]]) assert(!rules.walkable(x, y));
assert.equal(rules.move({ x: 250, y: 210 }, "right", 200).x, 256, "cannot tunnel through the seven-pixel lamp base");
assert.equal(rules.move({ x: 160, y: 140 }, "up", 200).y, 132, "cannot cross a blocked tile");
let position = rules.move(start, "left", 32);
position = rules.move(position, "up", 60);
assert(rules.atDoor(position), "the university door is reachable from the start");
assert(!rules.atDoor({ ...position, facing: "down" }), "face the door to interact");

const seen = new Set([`${start.x},${start.y}`]);
const queue = [start];
for (const current of queue) {
  for (const direction of Object.keys(DIRECTIONS)) {
    const next = rules.move(current, direction, 1);
    const key = `${next.x},${next.y}`;
    assert(rules.walkable(next.x, next.y));
    if (!seen.has(key)) { seen.add(key); queue.push(next); }
  }
}
let walkablePixels = 0;
for (let y = 0; y < 256; y++) for (let x = 0; x < 384; x++) if (rules.walkable(x, y)) walkablePixels++;
assert.equal(seen.size, walkablePixels, "every walkable foot position is reachable");

// Published university wording, independent of the page's data source.
const C09 = {
  en: ["2006 - 2012", "UFSC", "Tutorial level", "Bachelor of Engineering in Mechatronics, Robotics and Automation."],
  "pt-BR": ["2006 - 2012", "UFSC", "Fase tutorial", "Bacharelado em Engenharia Mecatrônica, Robótica e Automação."],
};
const { langs } = json("src/_data/i18n.json");
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
  assert(html.indexOf('id="portfolio" href="../"') < html.indexOf('id="plaza"'));
  assert(html.includes('<div id="playable" hidden>'));
  assert(html.includes('id="fallback"') && html.includes('id="enter" hidden'));
  assert(!html.includes("phaser.min.js") && !html.includes("courtyard.tmj"), "game resources are absent from initial markup");
}
assert(!readFileSync("_site/sitemap.xml", "utf8").includes("/play/"));
console.log(`ok: approved map assets, blocked tiles, objects, ${seen.size} reachable positions, door and both languages`);
