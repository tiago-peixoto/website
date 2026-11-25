import { navigation } from "./plaza-map.js";

export async function startPlaza({ asset, dialog, openPanel }) {
  const [art, map, layout] = await Promise.all([
    "plaza-art/courtyard.tmj", "plaza-navigation.tmj", "plaza-art/walker-layout.json",
  ].map(async (name) => {
    const response = await fetch(asset(name), { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Unable to load ${name}: ${response.status}`);
    return response.json();
  }));
  const rules = navigation(map);
  const objects = art.layers.flatMap((layer) => layer.objects || []);
  const spawn = objects.find((object) => object.name === "walker");
  const feet = (object) => object.properties.find((property) => property.name === "feetY").value;
  const collection = art.tilesets.find((tileset) => tileset.tiles);
  const tileFor = (object) => collection.tiles.find((tile) => tile.id === object.gid - collection.firstgid);
  let position = { x: spawn.x + spawn.width / 2, y: feet(spawn), facing: "down" };
  const pressed = new Map();
  let touchDirection;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const on = (target, type, listener) => target.addEventListener(type, listener, { signal: events.signal });
  const interact = document.querySelector("#interact");
  const nearby = document.querySelector("#nearby");
  const host = document.querySelector("#plaza");
  let game, walker, shadow, water;
  const clearInput = () => { pressed.clear(); touchDirection = undefined; };

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
      const near = rules.atDoor(position);
      interact.disabled = !near;
      const message = near ? nearby.dataset.near : nearby.dataset.far;
      if (nearby.textContent !== message) nearby.textContent = message;
    }

    function step(direction, distance) {
      const next = rules.move(position, direction, distance);
      const moved = next.x !== position.x || next.y !== position.y;
      position = next;
      refresh();
      return moved;
    }

    function readUniversity(opener) {
      if (rules.atDoor(position)) {
        clearInput();
        openPanel(opener);
      }
    }

    function preload() {
      this.load.once("loaderror", (file) => {
        clearTimeout(timer);
        fail(new Error(`Unable to load ${file.key}`));
      });
      // Phaser documents no image-collection tileset support; keep those objects as individual textures.
      this.load.tilemapTiledJSON("courtyard", {
        ...art,
        tilesets: art.tilesets.filter((tileset) => tileset.image),
        layers: art.layers.filter((layer) => layer.type === "tilelayer"),
      });
      this.load.image("terrain", asset("plaza-art/terrain.png"));
      for (const tile of collection.tiles) this.load.image(tile.image, asset(`plaza-art/${tile.image}`));
      this.load.spritesheet("walker", asset("plaza-art/walker-sheet.png"), {
        frameWidth: layout.cell[0], frameHeight: layout.cell[1],
      });
    }

    function create() {
      try {
        const tilemap = this.make.tilemap({ key: "courtyard" });
        const terrain = tilemap.addTilesetImage("courtyard-terrain", "terrain");
        tilemap.createLayer("ground", terrain).setDepth(-1000);
        for (const layer of art.layers.filter((layer) => layer.objects)) {
          for (const object of layer.objects) {
            if (object.name === "walker") continue;
            const image = this.add.sprite(object.x, object.y, tileFor(object).image).setOrigin(0);
            image.setName(object.name);
            image.setDepth(layer.name === "sorted" ? feet(object) : { shadow: -900, back: -500, water: -400, front: 1000 }[layer.name]);
            if (object.name === "walker-shadow") shadow = image;
            if (layer.name === "water") {
              water = image;
              const frames = tileFor(object).animation;
              this.anims.create({
                key: "water", repeat: -1, frameRate: 1000 / frames[0].duration,
                frames: frames.map((frame) => ({ key: collection.tiles.find((tile) => tile.id === frame.tileid).image })),
              });
              water.play("water");
            }
          }
        }
        layout.directions.forEach((direction, row) => {
          this.anims.create({
            key: direction, repeat: -1, frameRate: 1000 / layout.frameMs[0],
            frames: this.anims.generateFrameNumbers("walker", { start: row * 7 + 1, end: row * 7 + 6 }),
          });
        });
        walker = this.add.sprite(position.x, position.y, "walker", 0).setOrigin(0.5, 44 / 48).setName("walker");
        const camera = this.cameras.main;
        camera.setBounds(0, 0, tilemap.widthInPixels, tilemap.heightInPixels);
        camera.startFollow(walker, true, 1, 1, 0, 20);
        const resize = () => {
          const zoom = Math.max(1, Math.min(3, Math.floor(this.scale.height / 256)));
          const width = Math.min(this.scale.width, tilemap.widthInPixels * zoom);
          const height = Math.min(this.scale.height, tilemap.heightInPixels * zoom);
          camera.setViewport(Math.floor((this.scale.width - width) / 2), Math.floor((this.scale.height - height) / 2), width, height);
          camera.setZoom(zoom);
        };
        this.scale.on("resize", resize);
        resize();
        const setMotion = () => motion.matches ? water.anims.pause() : water.anims.resume();
        setMotion();
        on(motion, "change", setMotion);
        const canvas = game.canvas;
        canvas.tabIndex = 0;
        canvas.setAttribute("aria-label", host.getAttribute("aria-label"));
        canvas.setAttribute("aria-describedby", "instructions");
        const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
        on(canvas, "keydown", (event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing || dialog.open) return;
          const direction = keys[event.key] || keys[event.key.toLowerCase()];
          if (direction) {
            event.preventDefault();
            pressed.set(event.code, direction);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!event.repeat) readUniversity(canvas);
          } else if (event.key === "Escape") {
            clearInput();
            document.querySelector(".menu summary").focus();
          }
        });
        on(window, "keyup", (event) => pressed.delete(event.code));
        on(canvas, "blur", () => pressed.clear());
        on(window, "blur", clearInput);
        on(document, "visibilitychange", clearInput);
        on(dialog, "close", clearInput);
        for (const button of document.querySelectorAll("[data-direction]")) {
          on(button, "pointerdown", (event) => {
            if (dialog.open || (event.pointerType === "mouse" && event.button !== 0)) return;
            button.setPointerCapture(event.pointerId);
            touchDirection = button.dataset.direction;
          });
          const release = () => { if (touchDirection === button.dataset.direction) touchDirection = undefined; };
          on(button, "pointerup", release);
          on(button, "pointercancel", release);
          on(button, "lostpointercapture", release);
          on(button, "click", (event) => {
            if (!dialog.open && event.detail === 0) step(button.dataset.direction, 4);
          });
        }
        on(interact, "click", () => readUniversity(interact));
        this.events.on("shutdown", () => events.abort());
        this.moveDirection = () => touchDirection || [...pressed.values()].at(-1);
        refresh();
        clearTimeout(timer);
        resolve();
      } catch (error) {
        clearTimeout(timer);
        fail(error);
      }
    }

    function update(_time, delta) {
      if (!walker) return;
      const direction = !dialog.open && !document.hidden && this.moveDirection();
      if (direction && step(direction, Math.min(delta, 50) * 0.06)) walker.play(position.facing, true);
      else {
        walker.anims.stop();
        walker.setFrame(layout.directions.indexOf(position.facing) * 7);
      }
    }

    game = new Phaser.Game({
      type: Phaser.CANVAS, parent: host, backgroundColor: "#153a37", pixelArt: true,
      scale: { mode: Phaser.Scale.RESIZE, width: host.clientWidth, height: host.clientHeight },
      input: { keyboard: false, mouse: false, touch: false }, audio: { noAudio: true },
      scene: { preload, create, update },
    });
  });
}
