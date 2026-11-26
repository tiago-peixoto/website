import { navigation, cameraZoom } from "./plaza-map.js";

export async function startPlaza({ asset, dialog, interact, state }) {
  const [courtyard, plazaNavigation, outside, study, layout] = await Promise.all([
    "plaza-art/courtyard.tmj", "plaza-navigation.tmj", "plaza-art/outside.tmj", "plaza-art/interior.tmj", "plaza-art/walker-layout.json",
  ].map(async (name) => {
    const response = await fetch(asset(name), { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Unable to load ${name}: ${response.status}`);
    return response.json();
  }));
  const plazaSpawn = courtyard.layers.flatMap((layer) => layer.objects || []).find((object) => object.name === "walker");
  const spawns = (map) => Object.fromEntries(map.layers.find((layer) => layer.name === "spawns").objects.map((object) => [object.name, object]));
  const areas = {
    plaza: { art: courtyard, rules: navigation(plazaNavigation), spawns: { ...spawns(plazaNavigation), entry: {
      x: plazaSpawn.x + plazaSpawn.width / 2,
      y: plazaSpawn.properties.find((property) => property.name === "feetY").value,
      facing: "down",
    } } },
    outside: { art: outside, rules: navigation(outside), spawns: spawns(outside) },
    study: { art: study, rules: navigation(study), spawns: spawns(study) },
  };
  const order = Object.keys(areas);
  const pressed = new Map();
  const held = new Map();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const on = (target, type, listener) => target.addEventListener(type, listener, { signal: events.signal });
  const interactButton = document.querySelector("#interact");
  const nearby = document.querySelector("#nearby");
  const host = document.querySelector("#plaza");
  const names = Object.fromEntries([...document.querySelectorAll("[data-action], [data-travel]")].map((button) => [button.dataset.action || button.dataset.travel, button.textContent]));
  let game, scene, walker, shadow, water, shade, areaId = "plaza", position;
  const clearInput = () => { pressed.clear(); held.clear(); };
  const feet = (object) => object.properties?.find((property) => property.name === "feetY")?.value ?? object.y + object.height;
  document.querySelector("#playable").hidden = false;
  document.querySelector("#controls").hidden = false;

  return new Promise((resolve, reject) => {
    function fail(error) {
      events.abort();
      game?.destroy(true);
      reject(error);
    }
    const timer = setTimeout(() => fail(new Error("Plaza loading timed out")), 25000);

    function refresh() {
      walker.setPosition(position.x, position.y).setDepth(position.y);
      shadow.setPosition(position.x - 8, position.y - 3);
      const tree = areas[areaId].objects.get("tree");
      if (tree) tree.setAlpha(position.y < tree.depth && position.x + 10 > tree.x && position.x - 10 < tree.x + tree.width && position.y > tree.y ? 0.45 : 1);
      const near = areas[areaId].rules.nearby(position);
      const disabled = !near;
      const label = near ? names[near.name] : interactButton.dataset.idle;
      if (interactButton.disabled !== disabled) interactButton.disabled = disabled;
      if (interactButton.textContent !== label) interactButton.textContent = label;
      const message = near ? `${names[near.name]}. ${nearby.dataset.near}` : nearby.dataset.far;
      if (nearby.textContent !== message) nearby.textContent = message;
      for (const id of ["notebook", "sensor"]) areas.study.objects.get(id).setVisible(areaId === "study" && !state.inventory.has(id));
      shade.setVisible(areaId === "study" && !state.lightsOn);
    }

    function resize() {
      const art = areas[areaId].art;
      const camera = scene.cameras.main;
      camera.setViewport(0, 0, scene.scale.width, scene.scale.height);
      camera.setZoom(cameraZoom(scene.scale.width, scene.scale.height, art.width * 16, art.height * 16));
    }

    function visit(id, returning = false) {
      if (!areas[id]) return;
      clearInput();
      areaId = id;
      for (const [key, area] of Object.entries(areas)) for (const image of area.display) image.setVisible(key === id);
      const area = areas[id];
      const spawn = area.spawns[returning ? "return" : "entry"];
      position = { x: spawn.x, y: spawn.y, facing: spawn.facing || (returning ? "down" : "up") };
      walker.anims.stop();
      walker.setFrame(layout.directions.indexOf(position.facing) * 7);
      scene.cameras.main.setBounds(0, 0, area.art.width * 16, area.art.height * 16);
      document.querySelector("#location").textContent = names[id];
      host.setAttribute("aria-label", names[id]);
      game.canvas.setAttribute("aria-label", names[id]);
      document.querySelector("#feedback").textContent = "";
      resize();
      refresh();
    }

    function step(direction, distance) {
      const next = areas[areaId].rules.move(position, direction, distance);
      const moved = next.x !== position.x || next.y !== position.y;
      position = next;
      refresh();
      return moved;
    }

    function activate(opener) {
      const near = areas[areaId].rules.nearby(position);
      if (!near) return;
      clearInput();
      if (areas[near.name]) visit(near.name, order.indexOf(near.name) < order.indexOf(areaId));
      else interact(near.name, opener);
      refresh();
    }

    function preload() {
      this.load.once("loaderror", (file) => {
        clearTimeout(timer);
        fail(new Error(`Unable to load ${file.key}`));
      });
      const images = new Set(["walker-shadow.png"]);
      for (const [id, { art }] of Object.entries(areas)) {
        // Phaser does not load image-collection tilesets, so their objects use individual textures.
        this.load.tilemapTiledJSON(id, {
          ...art,
          tilesets: art.tilesets.filter((tileset) => tileset.image),
          layers: art.layers.filter((layer) => layer.name === "ground"),
        });
        for (const tileset of art.tilesets) {
          if (tileset.image) images.add(tileset.image);
          for (const tile of tileset.tiles || []) images.add(tile.image);
        }
      }
      for (const image of images) this.load.image(image, asset(`plaza-art/${image}`));
      this.load.spritesheet("walker", asset("plaza-art/walker-sheet.png"), { frameWidth: layout.cell[0], frameHeight: layout.cell[1] });
    }

    function create() {
      try {
        scene = this;
        for (const [id, area] of Object.entries(areas)) {
          const tilemap = this.make.tilemap({ key: id });
          const terrain = area.art.tilesets.find((tileset) => tileset.image);
          area.display = [tilemap.createLayer("ground", tilemap.addTilesetImage(terrain.name, terrain.image)).setDepth(-1000)];
          area.objects = new Map();
          const collection = area.art.tilesets.find((tileset) => tileset.tiles);
          for (const layer of area.art.layers.filter((layer) => layer.objects && layer.visible)) {
            for (const object of layer.objects) {
              if (!object.gid || object.name === "walker" || object.name === "walker-shadow") continue;
              const tile = collection.tiles.find((tile) => tile.id === object.gid - collection.firstgid);
              const image = this.add.sprite(object.x, object.y, tile.image).setOrigin(0).setName(object.name);
              image.setDepth(layer.name === "sorted" ? feet(object) : { shadow: -900, back: -500, water: -400, items: -300, front: 1000 }[layer.name]);
              area.display.push(image);
              area.objects.set(object.name, image);
              if (layer.name === "water") {
                water = image;
                this.anims.create({ key: "water", repeat: -1, frameRate: 1000 / tile.animation[0].duration,
                  frames: tile.animation.map((frame) => ({ key: collection.tiles.find((tile) => tile.id === frame.tileid).image })) });
                water.play("water");
              }
            }
          }
        }
        layout.directions.forEach((direction, row) => this.anims.create({
          key: direction, repeat: -1, frameRate: 1000 / layout.frameMs[0],
          frames: this.anims.generateFrameNumbers("walker", { start: row * 7 + 1, end: row * 7 + 6 }),
        }));
        shadow = this.add.image(0, 0, "walker-shadow.png").setOrigin(0).setDepth(-200);
        walker = this.add.sprite(0, 0, "walker", 0).setOrigin(0.5, 44 / 48).setName("walker");
        shade = this.add.rectangle(0, 0, 384, 256, 0x10192f, 0.62).setOrigin(0).setDepth(1500);
        this.cameras.main.startFollow(walker, true, 1, 1, 0, 20);
        this.scale.on("resize", resize);
        const setMotion = () => motion.matches ? water.anims.pause() : water.anims.resume();
        setMotion();
        on(motion, "change", setMotion);
        const canvas = game.canvas;
        canvas.tabIndex = 0;
        canvas.setAttribute("aria-describedby", "instructions");
        const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
        on(canvas, "keydown", (event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing || dialog.open) return;
          const direction = keys[event.key] || keys[event.key.toLowerCase()];
          if (direction) { event.preventDefault(); pressed.set(event.code, direction); }
          else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!event.repeat) activate(canvas);
          } else if (event.key === "Escape") { clearInput(); document.querySelector(".menu summary").focus(); }
        });
        on(window, "keyup", (event) => pressed.delete(event.code));
        on(canvas, "blur", () => pressed.clear());
        on(window, "blur", clearInput);
        on(document, "visibilitychange", clearInput);
        on(dialog, "close", clearInput);
        on(document.querySelector(".menu"), "toggle", clearInput);
        for (const button of document.querySelectorAll("[data-direction]")) {
          on(button, "pointerdown", (event) => {
            if (dialog.open || (event.pointerType === "mouse" && event.button !== 0)) return;
            button.setPointerCapture(event.pointerId);
            step(button.dataset.direction, 2);
            held.set(event.pointerId, button.dataset.direction);
          });
          const release = (event) => held.delete(event.pointerId);
          on(button, "pointerup", release);
          on(button, "pointercancel", release);
          on(button, "lostpointercapture", release);
          on(button, "click", (event) => { if (!dialog.open && event.detail === 0) step(button.dataset.direction, 4); });
        }
        on(interactButton, "click", () => activate(interactButton));
        this.events.on("shutdown", () => events.abort());
        this.moveDirection = () => [...held.values()].at(-1) || [...pressed.values()].at(-1);
        interactButton.dataset.idle = interactButton.textContent;
        visit("plaza");
        clearTimeout(timer);
        resolve({ visit });
      } catch (error) { clearTimeout(timer); fail(error); }
    }

    function update(_time, delta) {
      if (!walker) return;
      const direction = !dialog.open && !document.hidden && this.moveDirection();
      if (direction && step(direction, Math.min(delta, 50) * 0.06) && !motion.matches) walker.play(position.facing, true);
      else {
        walker.anims.stop();
        walker.setFrame(layout.directions.indexOf(position.facing) * 7);
      }
      refresh();
    }

    game = new Phaser.Game({
      type: Phaser.CANVAS, parent: host, backgroundColor: "#153a37", pixelArt: true,
      scale: { mode: Phaser.Scale.RESIZE, width: host.clientWidth, height: host.clientHeight },
      input: { keyboard: false, mouse: false, touch: false }, audio: { noAudio: true },
      scene: { preload, create, update },
    });
  });
}
