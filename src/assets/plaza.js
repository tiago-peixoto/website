import { navigation, cameraZoom } from "./plaza-map.js";

export async function startPlaza({ asset, dialog, interact, state, positionDialogue }) {
  const [courtyard, plazaNavigation, outside, study, layout] = await Promise.all([
    "plaza-art/courtyard.tmj", "plaza-navigation.tmj", "plaza-art/outside.tmj", "plaza-art/interior.tmj", "plaza-art/walker-motion.json",
  ].map(async (name) => {
    const response = await fetch(asset(name), { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Unable to load ${name}: ${response.status}`);
    return response.json();
  }));
  const plazaSpawn = courtyard.layers.flatMap((layer) => layer.objects || []).find((object) => object.name === "walker");
  const spawns = (map) => Object.fromEntries(map.layers.find((layer) => layer.name === "spawns").objects.map((object) => [object.name, {
    ...object, facing: object.properties?.find((p) => p.name === "facing")?.value,
  }]));
  const areas = {
    plaza: { art: courtyard, rules: navigation(plazaNavigation), spawns: { ...spawns(plazaNavigation), entry: {
      x: plazaSpawn.x + plazaSpawn.width / 2,
      y: plazaSpawn.properties.find((property) => property.name === "feetY").value,
      facing: "down",
    } } },
    outside: { art: outside, rules: navigation(outside), spawns: spawns(outside) },
    study: { art: study, rules: navigation(study), spawns: spawns(study) },
  };
  const pressed = new Map();
  const held = new Map();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const on = (target, type, listener) => target.addEventListener(type, listener, { signal: events.signal });
  const interactButton = document.querySelector("#interact");
  const runButton = document.querySelector("#run");
  const nearby = document.querySelector("#nearby");
  const host = document.querySelector("#plaza");
  const names = Object.fromEntries([...document.querySelectorAll("[data-action], [data-travel]")].map((button) => [button.dataset.action || button.dataset.travel, button.textContent]));
  let game, scene, walker, shadow, water, shade, lampGlow, lampPool, fish, splash, daylight, areaId = "plaza", position;
  let seenJump = state.pondJump, jumpTime = Infinity;
  let shiftHeld = false;
  const running = () => shiftHeld || runButton.getAttribute("aria-pressed") === "true";
  const clearInput = () => {
    pressed.clear(); held.clear(); shiftHeld = false;
    runButton.setAttribute("aria-pressed", "false");
  };
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
      if (near?.name === "lamp" || near?.name === "light") {
        const value = String(near.name === "lamp" ? state.lampOn : state.lightsOn);
        if (interactButton.getAttribute("aria-pressed") !== value) interactButton.setAttribute("aria-pressed", value);
      } else if (interactButton.hasAttribute("aria-pressed")) interactButton.removeAttribute("aria-pressed");
      const message = near ? `${names[near.name]}. ${nearby.dataset.near}` : nearby.dataset.far;
      if (nearby.textContent !== message) nearby.textContent = message;
      for (const id of ["notebook", "sensor"]) areas.study.objects.get(id).setVisible(areaId === "study" && !state.inventory.has(id));
      shade.setVisible(areaId === "study" && !state.lightsOn);
      lampGlow.setVisible(areaId === "plaza" && state.lampOn);
      lampPool.setVisible(areaId === "plaza" && state.lampOn);
      daylight.setVisible(areaId === "study");
      if (seenJump !== state.pondJump) {
        seenJump = state.pondJump;
        jumpTime = areaId === "plaza" ? 0 : Infinity;
      }
    }

    function resize() {
      const art = areas[areaId].art;
      const camera = scene.cameras.main;
      camera.setViewport(0, 0, scene.scale.width, scene.scale.height);
      camera.setZoom(cameraZoom(scene.scale.width, scene.scale.height, art.width * 16, art.height * 16));
    }

    function fitHost() {
      if (scene.scale.getParentBounds()) scene.scale.refresh();
    }

    function visit(id, spawnName = "entry", keepMoving = false) {
      if (!areas[id]) return;
      if (!keepMoving) clearInput();
      areaId = id;
      for (const [key, area] of Object.entries(areas)) for (const image of area.display) image.setVisible(key === id);
      const area = areas[id];
      const spawn = area.spawns[spawnName];
      position = { x: spawn.x, y: spawn.y, facing: spawn.facing };
      walker.anims.stop();
      walker.setFrame(layout.directions.indexOf(position.facing) * layout.columns);
      scene.cameras.main.setBounds(0, 0, area.art.width * 16, area.art.height * 16);
      document.querySelector("#location").textContent = names[id];
      host.setAttribute("aria-label", names[id]);
      game.canvas.setAttribute("aria-label", names[id]);
      jumpTime = Infinity;
      fish.setVisible(false);
      splash.setVisible(false);
      resize();
      refresh();
      fitHost();
    }

    function step(direction, distance) {
      const next = areas[areaId].rules.move(position, direction, distance);
      const moved = next.x !== position.x || next.y !== position.y;
      position = next;
      const exit = areas[areaId].rules.exit(position);
      if (exit) {
        visit(exit.name, exit.name === "outside" && areaId === "plaza" ? "entry" : "return", true);
        return false;
      }
      refresh();
      return moved;
    }

    function activate(opener) {
      const near = areas[areaId].rules.nearby(position);
      if (!near) return;
      clearInput();
      interact(near.name, opener);
      refresh();
    }

    function preload() {
      this.load.once("loaderror", (file) => {
        clearTimeout(timer);
        fail(new Error(`Unable to load ${file.key}`));
      });
      const images = new Set(["walker-shadow.png", "lamp-glow.png", "lamp-pool.png", "fish.png", "splash.png", "door-light.png"]);
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
      this.load.spritesheet("walker", asset("plaza-art/walker-grounded.png"), { frameWidth: layout.cell[0], frameHeight: layout.cell[1] });
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
        for (const [gait, cycle] of Object.entries(layout.cycles)) {
          layout.directions.forEach((direction, row) => this.anims.create({
            key: `${gait}-${direction}`, repeat: -1, frameRate: cycle.frameRate,
            frames: this.anims.generateFrameNumbers("walker", {
              start: row * layout.columns + cycle.start, end: row * layout.columns + cycle.end,
            }),
          }));
        }
        shadow = this.add.image(0, 0, "walker-shadow.png").setOrigin(0).setDepth(-200);
        walker = this.add.sprite(0, 0, "walker", 0).setOrigin(0.5, 44 / 48).setName("walker");
        lampGlow = this.add.image(264, 163, "lamp-glow.png").setDepth(500).setAlpha(0.8).setName("lamp-glow");
        lampPool = this.add.image(264, 211, "lamp-pool.png").setDepth(-250).setAlpha(0.45);
        fish = this.add.image(318, 145, "fish.png").setDepth(500).setName("fish");
        splash = this.add.image(330, 145, "splash.png").setDepth(500).setName("splash");
        shade = this.add.rectangle(0, 0, 384, 256, 0x10192f, 0.62).setOrigin(0).setDepth(1500);
        daylight = this.add.image(192, 232, "door-light.png").setDepth(1600).setAlpha(0.5).setName("daylight");
        this.cameras.main.startFollow(walker, true, 1, 1, 0, 20);
        this.scale.on("resize", resize);
        const sizeObserver = new ResizeObserver(fitHost);
        sizeObserver.observe(host);
        const setMotion = () => {
          if (motion.matches) { water.anims.pause(); jumpTime = Infinity; }
          else water.anims.resume();
        };
        setMotion();
        on(motion, "change", setMotion);
        const canvas = game.canvas;
        canvas.tabIndex = 0;
        canvas.setAttribute("aria-describedby", "instructions");
        const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
        on(canvas, "keydown", (event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing || dialog.open) return;
          shiftHeld = event.shiftKey;
          const direction = keys[event.key] || keys[event.key.toLowerCase()];
          if (direction) { event.preventDefault(); pressed.set(event.code, direction); }
          else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!event.repeat) activate(canvas);
          } else if (event.key === "Escape") { clearInput(); document.querySelector(".menu summary").focus(); }
        });
        on(window, "keyup", (event) => {
          pressed.delete(event.code);
          shiftHeld = document.activeElement === canvas && event.shiftKey;
        });
        on(canvas, "blur", () => { pressed.clear(); shiftHeld = false; });
        on(window, "blur", clearInput);
        on(document, "visibilitychange", clearInput);
        on(dialog, "close", clearInput);
        on(document.querySelector(".menu"), "toggle", clearInput);
        on(runButton, "click", () => {
          if (!dialog.open) runButton.setAttribute("aria-pressed", String(runButton.getAttribute("aria-pressed") !== "true"));
        });
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
        const placeDialogue = () => {
          const camera = scene.cameras.main;
          const head = camera.matrixCombined.transformPoint(position.x, position.y - 32);
          const feet = camera.matrixCombined.transformPoint(position.x, position.y);
          const bounds = canvas.getBoundingClientRect();
          positionDialogue({ x: bounds.left + head.x, top: bounds.top + head.y, bottom: bounds.top + feet.y, minY: bounds.top + 12 });
        };
        game.events.on("postrender", placeDialogue);
        this.events.on("shutdown", () => { events.abort(); sizeObserver.disconnect(); game.events.off("postrender", placeDialogue); });
        this.moveDirection = () => [...held.values()].at(-1) || [...pressed.values()].at(-1);
        interactButton.dataset.idle = interactButton.textContent;
        visit("plaza");
        clearTimeout(timer);
        resolve({ visit });
      } catch (error) { clearTimeout(timer); fail(error); }
    }

    function update(_time, delta) {
      if (!walker) return;
      jumpTime += delta;
      const jumping = areaId === "plaza" && jumpTime < 900 && !motion.matches;
      fish.setVisible(jumping);
      if (jumping) {
        const progress = jumpTime / 900;
        fish.setPosition(Math.round(304 + 26 * progress), Math.round(145 - 28 * Math.sin(Math.PI * progress)));
        fish.setFlipY(progress > 0.5);
      }
      const splashing = areaId === "plaza" && (motion.matches ? jumpTime < 1000 : jumpTime >= 900 && jumpTime < 1250);
      splash.setVisible(splashing);
      if (splashing) splash.setAlpha(motion.matches ? 1 : 1 - (jumpTime - 900) / 350);
      const direction = !dialog.open && !document.hidden && this.moveDirection();
      const gait = running() ? "run" : "walk";
      if (direction && step(direction, Math.min(delta, 50) * layout.cycles[gait].speed / 1000) && !motion.matches) walker.play(`${gait}-${position.facing}`, true);
      else {
        walker.anims.stop();
        walker.setFrame(layout.directions.indexOf(position.facing) * layout.columns);
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
