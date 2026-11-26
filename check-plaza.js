import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { DIRECTIONS, navigation, cameraZoom } from "./src/assets/plaza-map.js";

const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const courtyard = json("src/assets/plaza-art/courtyard.tmj");
const plazaMap = json("src/assets/plaza-navigation.tmj");
const outside = json("src/assets/plaza-art/outside.tmj");
const study = json("src/assets/plaza-art/interior.tmj");
const layout = json("src/assets/plaza-art/walker-layout.json");
const areas = { plaza: [courtyard, plazaMap], outside: [outside, outside], study: [study, study] };
const expectedActions = {
  plaza: ["outside"], outside: ["study", "plaza", "university"],
  study: ["paper", "notebook", "sensor", "robot", "computer", "board", "light", "outside"],
};
const allActions = new Set();
let totalReachable = 0;
for (const [name, [art, map]] of Object.entries(areas)) {
  const rules = navigation(map);
  const objects = art.layers.flatMap((layer) => layer.objects || []);
  const legacySpawn = objects.find((object) => object.name === "walker");
  const spawns = [...(legacySpawn ? [{
    x: legacySpawn.x + legacySpawn.width / 2,
    y: legacySpawn.properties.find((p) => p.name === "feetY").value,
  }] : []), ...map.layers.find((layer) => layer.name === "spawns").objects];
  const start = { x: spawns[0].x, y: spawns[0].y, facing: "down" };
  const width = map.width * map.tilewidth, height = map.height * map.tileheight;
  assert.deepEqual([map.width, map.height, map.tilewidth, map.tileheight], [art.width, art.height, 16, 16]);
  assert(rules.walkable(start.x, start.y), `${name} spawn`);
  for (const layer of [...art.layers, ...map.layers].filter((layer) => layer.type === "tilelayer")) {
    assert.equal(layer.data.length, layer.width * layer.height);
    assert(layer.data.every(Number.isInteger));
  }
  for (const tileset of art.tilesets) {
    const images = tileset.image ? [tileset.image] : tileset.tiles.map((tile) => tile.image);
    for (const image of images) assert(existsSync(`src/assets/plaza-art/${image}`), image);
  }
  const terrain = art.tilesets.find((set) => set.image);
  assert(art.layers.find((layer) => layer.name === "ground").data.every((gid) => gid >= terrain.firstgid && gid < terrain.firstgid + terrain.tilecount));
  const collection = art.tilesets.find((set) => set.tiles);
  for (const object of objects.filter((o) => o.gid)) assert(collection.tiles.some((tile) => tile.id + collection.firstgid === object.gid), object.name);
  const blocked = map.layers.find((layer) => layer.name === "blocked");
  blocked.data.forEach((tile, index) => {
    if (tile) assert(!rules.walkable((index % map.width) * 16 + 8, Math.floor(index / map.width) * 16 + 8), `${name} blocked tile ${index}`);
  });
  for (const object of map.layers.find((layer) => layer.name === "obstacles").objects) {
    assert(!rules.walkable(object.x + object.width / 2, object.y + object.height / 2), object.name);
  }
  for (const [x, y] of [[-1, 200], [width, 200], [200, -1], [200, height]]) assert(!rules.walkable(x, y));
  const seen = new Set([`${start.x},${start.y}`]), queue = [start], reachableActions = new Set();
  for (const current of queue) {
    for (const direction of Object.keys(DIRECTIONS)) {
      const interaction = rules.nearby({ ...current, facing: direction });
      if (interaction) reachableActions.add(interaction.name);
      const next = rules.move(current, direction, 1);
      const key = `${next.x},${next.y}`;
      assert(rules.walkable(next.x, next.y));
      if (!seen.has(key)) { seen.add(key); queue.push(next); }
    }
  }
  let walkablePixels = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (rules.walkable(x, y)) walkablePixels++;
  assert.equal(seen.size, walkablePixels, `${name}: every walkable foot position is reachable`);
  for (const spawn of spawns) assert(seen.has(`${spawn.x},${spawn.y}`), `${name}: return spawn reachable`);
  assert.deepEqual([...reachableActions].sort(), expectedActions[name].sort(), `${name}: all interactions reachable with correct facing`);
  for (const action of reachableActions) allActions.add(action);
  totalReachable += seen.size;
  for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080], [2560, 1440], [500, 1000], [390, 844], [320, 568]]) {
    const zoom = cameraZoom(w, h, width, height);
    assert(Number.isInteger(zoom) && zoom >= 1);
    assert(width * zoom >= w && height * zoom >= h, `${name}: ${w}x${h} has no uncovered band`);
    assert(zoom === 1 || width * (zoom - 1) < w || height * (zoom - 1) < h, "smallest covering integer zoom");
  }
}
const rules = navigation(plazaMap);
assert.equal(rules.move({ x: 250, y: 210 }, "right", 200).x, 256, "cannot tunnel through the lamp base");
assert.equal(rules.move({ x: 160, y: 140 }, "up", 200).y, 132, "cannot cross a blocked tile");
assert.equal(rules.nearby({ x: 160, y: 140, facing: "up" }).name, "outside");
assert.equal(rules.nearby({ x: 160, y: 140, facing: "down" }), undefined);
const plazaReturn = plazaMap.layers.find((layer) => layer.name === "spawns").objects.find((object) => object.name === "return");
assert.equal(rules.nearby({ ...plazaReturn, facing: "up" }).name, "outside", "leaving the university arrives at its plaza door");
const waterSet = courtyard.tilesets.find((set) => set.tiles);
const water = waterSet.tiles.find((tile) => tile.animation).animation;
assert.equal(water.length, 4);
assert(water.every((frame) => frame.duration === 180 && waterSet.tiles.some((tile) => tile.id === frame.tileid)));
assert.deepEqual(layout.cell, [32, 48]);
assert.equal(layout.frames.length, 28);
assert(layout.frameMs.every((ms) => ms === 100));
const studyItems = study.layers.find((layer) => layer.name === "items").objects;
assert.deepEqual(studyItems.map((o) => o.name).sort(), ["notebook", "sensor"]);

const degree = {
  en: "Bachelor of Engineering in Control and Automation Engineering.",
  "pt-BR": "Bacharelado em Engenharia de Controle e Automação.",
};
assert.deepEqual(json("src/_data/university.json").degree, degree);
const { langs } = json("src/_data/i18n.json");
assert.deepEqual(langs.map((t) => t.lang).sort(), Object.keys(degree).sort());
for (const t of langs) {
  assert(!("q_ufsc" in t), "the degree has one shared source");
  const html = readFileSync(`_site${t.url}play/index.html`, "utf8");
  const regular = readFileSync(`_site/${t.path}`, "utf8");
  for (const text of ["2006 - 2012", "UFSC", t.q_ufsc_t, degree[t.lang]]) {
    assert(html.includes(text), `${t.lang} game university wording: ${text}`);
    assert(regular.includes(text), `${t.lang} portfolio university wording: ${text}`);
  }
  assert(html.includes(`<html lang="${t.lang}">`));
  assert(html.includes('<dialog aria-labelledby="panel-title"'));
  assert(html.includes('<form method="dialog">'));
  assert(html.indexOf('id="portfolio" href="../"') < html.indexOf('id="plaza"'));
  assert(html.includes('<div id="playable" hidden>'));
  assert(html.includes('id="fallback"') && html.includes('id="enter" hidden'));
  assert(!html.includes("phaser.min.js") && !html.includes("courtyard.tmj"), "game resources are absent from initial markup");
  for (const action of allActions) assert(html.includes(`data-${areas[action] ? "travel" : "action"}="${action}"`), `${action} reachable without walking`);
  assert(html.includes('data-action="inventory"'));
  assert(!html.includes("Mechatronics") && !html.includes("Mecatrônica"));
}
assert(!readFileSync("_site/sitemap.xml", "utf8").includes("/play/"));
console.log(`ok: three maps, ${totalReachable} reachable positions, all interactions, integer viewport coverage and both languages`);
