import { createState, changeState } from "./plaza-state.js";

const dialog = document.querySelector("dialog");
const enter = document.querySelector("#enter");
const loading = document.querySelector("#loading");
let returnFocus;
const state = createState();
const messages = document.querySelector("#messages").dataset;
const actions = Object.fromEntries([...document.querySelectorAll("[data-action]")].map((button) => [button.dataset.action, button]));
const feedback = document.querySelector("#feedback");
let feedbackTimer;

function announce(message) {
  clearTimeout(feedbackTimer);
  feedback.textContent = message;
  feedbackTimer = setTimeout(() => { feedback.textContent = ""; }, 4000);
}

function openPanel(id, opener = document.activeElement) {
  if (dialog.open) return;
  returnFocus = opener;
  for (const panel of dialog.querySelectorAll("[data-panel]")) panel.hidden = panel.dataset.panel !== id;
  document.querySelector("#panel-title").textContent = actions[id].textContent;
  dialog.showModal();
  document.querySelector("#panel-title").focus();
}

function interact(id, opener) {
  if (id === "light" || id === "lamp") {
    changeState(state, id);
    const on = id === "light" ? state.lightsOn : state.lampOn;
    actions[id].setAttribute("aria-pressed", String(on));
    announce(id === "light" ? (on ? messages.lightsOn : messages.lightsOff) : (on ? messages.lampOn : messages.lampOff));
  } else if (id === "pond") {
    changeState(state, id);
    announce(messages.pondJump);
  } else if (id === "notebook" || id === "sensor") {
    const name = actions[id].dataset.itemName;
    const picked = state.inventory.has(id);
    if (!picked) {
      changeState(state, id);
      const item = document.createElement("li");
      item.textContent = name;
      document.querySelector("#inventory").append(item);
      document.querySelector("#inventory-count").textContent = state.inventory.size;
      document.querySelector("#empty-inventory").hidden = true;
    }
    announce(`${picked ? messages.alreadyPicked : messages.picked} ${name}`);
  } else openPanel(id, opener);
}

function loadPhaser() {
  if (window.Phaser) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => failed(), 20000);
    function failed() {
      clearTimeout(timer);
      script.remove();
      reject(new Error("Phaser failed to load"));
    }
    script.src = new URL("./phaser.min.js", import.meta.url).href;
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = failed;
    document.head.append(script);
  });
}

if (typeof dialog.showModal === "function") {
  enter.hidden = false;
  document.querySelector("#directory-actions").hidden = false;
  for (const [id, button] of Object.entries(actions)) button.addEventListener("click", () => interact(id, button));
  dialog.addEventListener("close", () => returnFocus?.focus());
  document.querySelector("#robot-toggle").addEventListener("click", (event) => {
    const closed = event.currentTarget.getAttribute("aria-pressed") !== "true";
    event.currentTarget.setAttribute("aria-pressed", String(closed));
    const status = document.querySelector("#robot-status");
    status.textContent = closed ? status.dataset.closed : status.dataset.open;
  });
  document.querySelector("#computer-toggle").addEventListener("click", (event) => {
    const terminal = document.querySelector("#terminal");
    terminal.hidden = !terminal.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!terminal.hidden));
  });
  document.querySelector("#board-next").addEventListener("click", () => {
    const input = document.querySelector("#board-input");
    const value = (Number(input.textContent) + 1) % 10;
    input.textContent = value;
    document.querySelector("#board-output").textContent = value + 1;
  });
  enter.addEventListener("click", async () => {
    enter.disabled = true;
    loading.textContent = loading.dataset.loading;
    try {
      const [{ startPlaza }] = await Promise.all([import("./plaza.js"), loadPhaser()]);
      document.querySelector("#fallback").hidden = true;
      document.body.classList.add("playing");
      const game = await startPlaza({
        asset: (name) => new URL(`./${name}`, import.meta.url).href,
        dialog,
        interact,
        state,
      });
      loading.textContent = "";
      enter.hidden = true;
      document.querySelector("#how").hidden = false;
      document.querySelector("#directory-places").hidden = false;
      for (const button of document.querySelectorAll("[data-travel]")) button.addEventListener("click", () => {
        game.visit(button.dataset.travel);
        document.querySelector(".menu").open = false;
        document.querySelector("#plaza canvas").focus();
      });
      if (!dialog.open) {
        document.querySelector(".menu").open = false;
        document.querySelector("#plaza canvas").focus();
      }
    } catch (error) {
      console.error(error);
      loading.textContent = loading.dataset.error;
      document.querySelector("#playable").hidden = true;
      document.querySelector("#controls").hidden = true;
      document.querySelector("#fallback").hidden = false;
      document.body.classList.remove("playing");
      enter.disabled = false;
    }
  });
}
