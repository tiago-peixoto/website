import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { DIRECTIONS, navigation, cameraZoom } from "./src/assets/plaza-map.js";
import { createState, changeState } from "./src/assets/plaza-state.js";
import { BOARD_INPUTS, ROBOT_STEPS, startChallenge, chooseChallenge } from "./src/assets/plaza-challenges.js";

const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const courtyard = json("src/assets/plaza-art/courtyard.tmj");
const plazaMap = json("src/assets/plaza-navigation.tmj");
const outside = json("src/assets/plaza-art/outside.tmj");
const study = json("src/assets/plaza-art/interior.tmj");
const layout = json("src/assets/plaza-art/walker-layout.json");
const motion = json("src/assets/plaza-art/walker-motion.json");
const areas = { plaza: [courtyard, plazaMap], outside: [outside, outside], study: [study, study] };
const expectedActions = {
  plaza: ["university", "lamp", "pond"], outside: ["study", "university"],
  study: ["paper", "notebook", "sensor", "robot", "computer", "board", "light"],
};
const expectedExits = { plaza: ["outside"], outside: ["plaza"], study: ["outside"] };
const expectedFacings = {
  plaza: { university: ["up"], lamp: ["up", "down", "left", "right"], pond: ["up", "right"] },
  outside: { study: ["up"], university: ["up"] },
  study: { paper: ["up", "down"], notebook: ["up", "down", "left"], sensor: ["up", "down", "right"],
    robot: ["up", "right"], computer: ["up", "down", "right"], board: ["up"], light: ["left"] },
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
  const seen = new Set([`${start.x},${start.y}`]), queue = [start], reachableActions = new Set(), reachableExits = new Set();
  const sides = {};
  for (const current of queue) {
    for (const direction of Object.keys(DIRECTIONS)) {
      const interaction = rules.nearby({ ...current, facing: direction });
      if (interaction) {
        reachableActions.add(interaction.name);
        (sides[interaction.name] ??= new Set()).add(direction);
        const [dx, dy] = DIRECTIONS[direction];
        const away = Object.keys(DIRECTIONS).find((key) => DIRECTIONS[key][0] === -dx && DIRECTIONS[key][1] === -dy);
        assert.notEqual(rules.nearby({ ...current, facing: away })?.name, interaction.name, `${name}/${interaction.name}: facing away cannot activate`);
      }
      const exit = rules.exit({ ...current, facing: direction });
      if (exit) reachableExits.add(exit.name);
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
  for (const spawn of map.layers.find((layer) => layer.name === "spawns").objects) {
    const facing = spawn.properties.find((p) => p.name === "facing").value;
    assert.equal(rules.exit({ x: spawn.x, y: spawn.y, facing }), undefined, `${name}: arriving at ${spawn.name} does not send the walker back`);
  }
  for (const [action, facings] of Object.entries(expectedFacings[name])) {
    assert.deepEqual([...sides[action]].sort(), [...facings].sort(), `${name}/${action}: every reachable side, and no blocked side`);
    for (const direction of Object.keys(DIRECTIONS)) {
      console.log(`${name}/${action}: facing ${direction} ${sides[action].has(direction) ? "reachable" : "blocked by scene geometry"}`);
    }
  }
  assert.deepEqual([...reachableActions].sort(), expectedActions[name].sort(), `${name}: all interactions reachable with correct facing`);
  assert.deepEqual([...reachableExits].sort(), expectedExits[name], `${name}: all walking exits reachable`);
  for (const action of reachableActions) allActions.add(action);
  for (const target of reachableExits) allActions.add(target);
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
assert.equal(rules.nearby({ x: 160, y: 140, facing: "up" }).name, "university");
assert.equal(rules.nearby({ x: 160, y: 140, facing: "down" }), undefined);
for (const [map, x, facing, target] of [[plazaMap, 378, "right", "outside"], [outside, 5, "left", "plaza"]]) {
  const route = navigation(map);
  for (let y = 0; y < 256; y += 0.5) {
    if (route.walkable(x, y)) assert.equal(route.exit({ x, y, facing })?.name, target, `pressing into the ${facing} edge at y ${y} changes area`);
  }
}
for (const [map, start, direction, target] of [
  [plazaMap, { x: 370, y: 204 }, "right", "outside"],
  [outside, { x: 18, y: 150 }, "left", "plaza"],
  [study, { x: 192, y: 242 }, "down", "outside"],
]) {
  const route = navigation(map);
  const atEdge = route.move(start, direction, 30);
  assert.equal(route.exit(atEdge)?.name, target, "walking to the edge selects the destination without an interaction");
  assert.equal(route.nearby(atEdge), undefined, "edges do not require the interact action");
  const opposite = { right: "left", left: "right", down: "up" }[direction];
  assert.equal(route.exit({ ...atEdge, facing: opposite }), undefined, "moving inward does not trigger an exit");
  assert.equal(route.exit({ ...start, facing: direction }), undefined, "exits trigger only at the edge");
}
assert.equal(navigation(outside).exit(navigation(outside).move({ x: 70, y: 180 }, "left", 100)), undefined, "a garden is not an exit");
assert.equal(rules.nearby({ x: 264, y: 224, facing: "up" }).name, "lamp");
assert.equal(rules.nearby({ x: 320, y: 184, facing: "up" }).name, "pond");
const state = createState();
assert.equal(state.lampOn, false);
changeState(state, "lamp");
assert.equal(state.lampOn, true);
assert.equal(state.lightsOn, true, "the plaza lamp does not switch the room lights");
changeState(state, "lamp");
assert.equal(state.lampOn, false);
changeState(state, "light");
assert.equal(state.lightsOn, false);
changeState(state, "pond");
changeState(state, "pond");
assert.equal(state.pondJump, 2, "each pond interaction requests a new jump");
changeState(state, "notebook");
changeState(state, "notebook");
changeState(state, "sensor");
assert.deepEqual([...state.inventory], ["notebook", "sensor"], "pickups stay unique across interactions");
const waterSet = courtyard.tilesets.find((set) => set.tiles);
const water = waterSet.tiles.find((tile) => tile.animation).animation;
assert.equal(water.length, 4);
assert(water.every((frame) => frame.duration === 180 && waterSet.tiles.some((tile) => tile.id === frame.tileid)));
assert.deepEqual(layout.cell, [32, 48]);
assert.equal(layout.frames.length, 28);
assert(layout.frameMs.every((ms) => ms === 100));
assert.deepEqual(motion.cell, layout.cell);
assert.deepEqual(motion.directions, layout.directions);
assert.equal(motion.columns, 17);
const walkerSheet = readFileSync("src/assets/plaza-art/walker-grounded.png");
assert.equal(walkerSheet.readUInt32BE(16), motion.cell[0] * motion.columns);
assert.equal(walkerSheet.readUInt32BE(20), motion.cell[1] * motion.directions.length);
assert.equal(motion.cycles.walk.speed, 60, "walking keeps its original speed");
assert.equal(motion.cycles.run.speed, 102);
for (const cycle of Object.values(motion.cycles)) {
  assert.equal(cycle.end - cycle.start + 1, 8, "eight frames per gait and direction");
  assert(cycle.frameRate > 10);
  for (const [map, start, direction, target] of [
    [plazaMap, { x: 370, y: 204 }, "right", "outside"],
    [outside, { x: 18, y: 150 }, "left", "plaza"],
    [study, { x: 192, y: 242 }, "down", "outside"],
  ]) {
    const route = navigation(map);
    let position = start;
    for (let frame = 0; frame < 20 && !route.exit(position); frame++) {
      position = route.move(position, direction, cycle.speed * 0.05);
      assert(route.walkable(position.x, position.y), "running cannot leave walkable ground");
    }
    assert.equal(route.exit(position)?.name, target, "both speeds reach every edge exit");
  }
  let position = { x: 250, y: 210 };
  for (let frame = 0; frame < 20; frame++) position = rules.move(position, "right", cycle.speed * 0.05);
  assert(position.x <= 256 && position.x > 255, "both speeds stop at the lamp base");
}
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
  assert(html.includes('id="run" aria-pressed="false"'));
  assert(html.includes(t.lang === "en" ? "Hold Shift to run." : "Segure Shift para correr."));
  assert(html.includes('id="fallback"') && html.includes('id="enter" hidden'));
  assert(!html.includes("phaser.min.js") && !html.includes("courtyard.tmj"), "game resources are absent from initial markup");
  for (const action of allActions) assert(html.includes(`data-${areas[action] ? "travel" : "action"}="${action}"`), `${action} reachable without walking`);
  assert(html.includes('data-action="inventory"'));
  assert(!html.includes("Mechatronics") && !html.includes("Mecatrônica"));
}
assert(!readFileSync("_site/sitemap.xml", "utf8").includes("/play/"));
console.log(`ok: three maps, ${totalReachable} reachable positions, all interactions, integer viewport coverage and both languages`);

for (const [id, answers] of [["board", BOARD_INPUTS.map((n) => n + 1)], ["robot", ROBOT_STEPS]]) {
  let challenge = startChallenge(id);
  const wrong = chooseChallenge(challenge, "not an answer");
  assert.equal(wrong.step, 0, `${id}: incorrect choice does not advance`);
  assert.equal(wrong.result, "wrong");
  assert.equal(challenge.result, "", "choices do not mutate the original state");
  for (const [index, choice] of answers.entries()) {
    challenge = chooseChallenge(challenge, choice);
    assert.equal(challenge.step, index + 1);
    assert.equal(challenge.complete, index === answers.length - 1);
  }
  assert.equal(challenge.result, "done");
  assert.equal(chooseChallenge(challenge, answers[0]), challenge, "finished challenges stay finished");
  assert.equal(startChallenge(id).step, 0, "replaying starts fresh");
}
const conversations = json("src/_data/dialogue.json");
for (const lang of ["en", "pt-BR"]) {
  const d = conversations[lang];
  const html = readFileSync(`_site/${lang === "en" ? "" : "pt/"}play/index.html`, "utf8");
  for (const id of [...allActions].filter((id) => id !== "outside" && id !== "plaza").concat("inventory")) {
    assert(d.lines[id]?.length >= 2, `${lang}/${id}: conversation exists`);
    assert(html.includes(`data-action="${id}"`), `${lang}/${id}: directory action exists`);
    assert(html.includes(`data-transcript="${id}"`), `${lang}/${id}: readable without engine or JavaScript`);
    for (const line of d.lines[id]) assert(html.includes(line.replaceAll("&", "&amp;").replaceAll("'", "&#39;")), `${lang}/${id}: transcript contains the complete line`);
  }
  for (const id of ["board", "robot"]) for (const key of ["prompt", "wrong", "correct", "done"]) {
    assert(d[id][key], `${lang}/${id}: translated ${key}`);
  }
}
const barrierMap = {
  width: 10, height: 10, tilewidth: 16, tileheight: 16,
  layers: [
    { name: "blocked", data: Array(100).fill(0) },
    { name: "obstacles", objects: [{ x: 55, y: 50, width: 5, height: 30 }] },
    { name: "interactions", objects: [{ name: "target", x: 65, y: 60, width: 10, height: 10 }] },
  ],
};
assert.equal(navigation(barrierMap).nearby({ x: 45, y: 65, facing: "right" }), undefined, "cannot interact through another obstacle");
barrierMap.layers[1].objects = [];
assert.equal(navigation(barrierMap).nearby({ x: 45, y: 65, facing: "right" })?.name, "target", "unobstructed object in reach activates");
assert.equal(navigation(barrierMap).nearby({ x: 40, y: 65, facing: "right" }), undefined, "out-of-reach object does not activate");
console.log("ok: two finishable challenges, replay, mistakes, bilingual transcripts and occlusion");
