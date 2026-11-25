import { MAP, START, DIRECTIONS, atDoor, update } from "./plaza-map.js";

const canvas = document.querySelector("#plaza");
const ctx = canvas.getContext("2d");
const dialog = document.querySelector("dialog");

if (ctx && typeof dialog.showModal === "function") {
  let state = { ...START };
  let returnFocus;
  const enter = document.querySelector("#enter");
  const nearby = document.querySelector("#nearby");
  const interact = document.querySelector("#interact");
  const keys = { ArrowUp: "up", ArrowLeft: "left", ArrowDown: "down", ArrowRight: "right", w: "up", a: "left", s: "down", d: "right" };

  function rect(color, x, y, width, height) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }

  function draw() {
    MAP.forEach((row, y) => [...row].forEach((tile, x) => {
      const px = x * 16;
      const py = y * 16;
      const path = (y >= 5 && y <= 7) || (x >= 8 && x <= 10) || (x === 3 && y === 4);
      rect(path ? "#CB8B56" : "#AFC39A", px, py, 16, 16);
      if (path) {
        rect("#b77a4b", px, py + 15, 16, 1);
        rect("#ddb176", px + 1, py + 1, 1, 14);
      } else {
        rect("#6C8762", px + 4, py + 10, 2, 2);
      }
      if (tile === "#") {
        rect("#20283A", px, py, 16, 16);
        rect("#6C8762", px + 2, py + 2, 12, 10);
      }
      if (tile === "U") {
        rect("#20283A", px, py, 16, 16);
        rect(y === 2 ? "#8D3F55" : "#F3E9CD", px + 1, py + 1, 14, 14);
        if (y === 3) rect("#5E929B", px + 5, py + 4, 6, 7);
      }
      if (tile === "u") {
        rect("#20283A", px + 2, py, 12, 16);
        rect("#DDBB6D", px + 4, py + 2, 8, 12);
        rect("#20283A", px + 9, py + 8, 2, 2);
      }
      if (tile === "S") {
        ctx.strokeStyle = "#20283A";
        ctx.strokeRect(px + 2.5, py + 2.5, 11, 11);
      }
    }));
    const x = state.x * 16;
    const y = state.y * 16;
    rect("#20283A", x + 3, y + 2, 10, 14);
    rect("#DDBB6D", x + 5, y + 3, 6, 4);
    rect("#8D3F55", x + 4, y + 7, 8, 6);
    const [dx, dy] = DIRECTIONS[state.facing];
    rect("#F3E9CD", x + 7 + dx * 5, y + 8 + dy * 6, 2, 2);
    const near = atDoor(state);
    interact.disabled = !near;
    const message = near ? nearby.dataset.near : nearby.dataset.far;
    if (nearby.textContent !== message) nearby.textContent = message;
  }

  function act(action, opener = document.activeElement) {
    state = update(state, action);
    if (state.panel && !dialog.open) {
      returnFocus = opener;
      dialog.showModal();
      document.querySelector("#university-title").focus();
    }
    draw();
  }

  enter.addEventListener("click", () => canvas.focus());
  canvas.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const direction = keys[event.key] || keys[event.key.toLowerCase()];
    if (direction) {
      event.preventDefault();
      act(direction);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!event.repeat) act("interact");
    } else if (event.key === "Escape") {
      event.preventDefault();
      enter.focus();
    }
  });
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("click", () => act(button.dataset.direction));
  });
  interact.addEventListener("click", (event) => act("interact", event.currentTarget));
  document.querySelector("#university-link").addEventListener("click", (event) => act("open", event.currentTarget));
  dialog.addEventListener("close", () => {
    state = update(state, "close");
    draw();
    returnFocus.focus();
  });

  draw();
  document.querySelector("#fallback").hidden = true;
  document.querySelector("#playable").hidden = false;
  document.querySelector("#controls").hidden = false;
  document.querySelector("#university-link").hidden = false;
  document.querySelector("#how").hidden = false;
}
