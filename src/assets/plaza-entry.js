import { createState, changeState } from "./plaza-state.js";
import { createExperiments } from "./plaza-experiments.js";
import { createDialogue } from "./plaza-dialogue.js";

const dialog = document.querySelector("dialog");
const enter = document.querySelector("#enter");
const loading = document.querySelector("#loading");
let game;
const experiments = createExperiments((id) => game?.experiment(id));
const conversation = createDialogue(dialog, (id) => {
  if (id === "study") game?.visit("study");
  if (id === "board" || id === "robot") experiments.open(id);
  if ((id === "notebook" || id === "sensor") && !state.inventory.has(id)) {
    changeState(state, id);
    const item = document.createElement("li");
    item.textContent = actions[id].dataset.itemName;
    document.querySelector("#inventory").append(item);
    document.querySelector("#inventory-count").textContent = state.inventory.size;
    document.querySelector("#empty-inventory").hidden = true;
    document.querySelector("#pickup-status").textContent = `${messages.picked} ${item.textContent}`;
  }
});
const state = createState();
const messages = document.querySelector("#messages").dataset;
const actions = Object.fromEntries([...document.querySelectorAll("[data-action]")].map((button) => [button.dataset.action, button]));
function interact(id, opener) {
  if (dialog.open || experiments.current) return;
  let result = "";
  if (id === "light" || id === "lamp" || id === "studyLamp") {
    changeState(state, id);
    const on = id === "light" ? state.lightsOn : id === "studyLamp" ? state.studyLampOn : state.lampOn;
    actions[id].setAttribute("aria-pressed", String(on));
    result = id === "light" ? (on ? messages.lightsOn : messages.lightsOff) : id === "studyLamp" ? (on ? messages.studyLampOn : messages.studyLampOff) : (on ? messages.lampOn : messages.lampOff);
  } else if (id === "pond") {
    changeState(state, id);
    result = messages.pondJump;
  } else if (id === "notebook" || id === "sensor") {
    const name = actions[id].dataset.itemName;
    const picked = state.inventory.has(id);
    result = picked ? `${messages.alreadyPicked} ${name}` : "";
  }
  conversation.open(id, opener, result);
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

if (typeof dialog.show === "function") {
  enter.hidden = false;
  document.querySelector("#directory-actions").hidden = false;
  for (const [id, button] of Object.entries(actions)) button.addEventListener("click", () => interact(id, button));
  enter.addEventListener("click", async () => {
    enter.disabled = true;
    loading.textContent = loading.dataset.loading;
    try {
      const [{ startPlaza }] = await Promise.all([import("./plaza.js"), loadPhaser()]);
      document.querySelector("#fallback").hidden = true;
      document.body.classList.add("playing");
      game = await startPlaza({
        asset: (name) => new URL(`./${name}`, import.meta.url).href,
        dialog,
        interact,
        positionDialogue: conversation.position,
        state,
        experiments,
      });
      loading.textContent = "";
      enter.hidden = true;
      document.querySelector("#how").hidden = false;
      document.querySelector("#directory-places").hidden = false;
      for (const button of document.querySelectorAll("[data-travel]")) button.addEventListener("click", () => {
        experiments.close();
        if (dialog.open) dialog.close();
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
