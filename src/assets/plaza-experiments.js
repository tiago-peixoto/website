import { BOARD_INPUTS, startChallenge, moveChallenge, chooseChallenge } from "./plaza-challenges.js";

export function createExperiments(view) {
  const panel = document.querySelector("#experiment");
  const surface = document.querySelector("#board-surface");
  const labels = document.querySelector("#challenge-labels").dataset;
  const result = panel.querySelector("#challenge-result");
  let challenge, opener;

  function render() {
    const { id, step, complete, selection, holding } = challenge;
    const input = BOARD_INPUTS[Math.min(step, 2)];
    const feedback = challenge.result ? labels[`${id}${challenge.result[0].toUpperCase()}${challenge.result.slice(1)}`] : "";
    const instruction = complete ? labels.finished : id === "board" ? `${input} + 1 = ?` : `${labels.robotPosition} ${selection + 1}/3. ${holding ? labels.robotHolding : labels.robotEmpty}`;
    result.textContent = `${feedback} ${instruction}`;
    panel.querySelector("#challenge-title").textContent = labels[`${id}Prompt`];
    panel.querySelector("#challenge-help").textContent = labels[`${id}Controls`];
    panel.querySelector("#challenge-again").hidden = !complete;
    panel.querySelector("#challenge-action").textContent = holding ? labels.robotRelease : labels.robotGrip;
    panel.querySelector("#challenge-action").hidden = id === "board" || complete;
    surface.hidden = id !== "board";
    surface.querySelector("#board-equation").textContent = `${input} + 1 = ${complete ? input + 1 : "?"}`;
    for (const [i, button] of [...surface.querySelectorAll("button")].entries()) {
      button.textContent = input + i;
      button.dataset.choice = input + i;
      button.setAttribute("aria-pressed", String(i === selection));
      button.disabled = complete;
    }
    panel.querySelector("#challenge-progress").textContent = `${labels.progress} ${Math.min(step + 1, id === "board" ? 3 : 2)} ${labels.of} ${id === "board" ? 3 : 2}`;
  }

  function close() {
    if (!challenge) return;
    challenge = undefined;
    panel.hidden = true;
    surface.hidden = true;
    document.body.classList.remove("experimenting");
    view(undefined);
    opener?.focus();
  }

  function open(id, source) {
    opener = source || document.querySelector("#plaza canvas") || document.querySelector(`[data-action="${id}"]`);
    challenge = startChallenge(id);
    document.body.classList.add("experimenting");
    panel.hidden = false;
    render();
    view(id);
    panel.querySelector("#challenge-title").focus();
  }

  function move(direction) {
    if (!challenge) return;
    challenge = moveChallenge(challenge, direction);
    render();
  }

  function choose(value) {
    if (!challenge) return;
    if (challenge.complete) { close(); return; }
    challenge = chooseChallenge(challenge, value ?? (challenge.id === "board" ? BOARD_INPUTS[challenge.step] + challenge.selection : challenge.selection));
    render();
  }

  surface.addEventListener("click", (event) => {
    if (event.target.matches("button")) choose(Number(event.target.dataset.choice));
  });
  panel.querySelector("#challenge-action").addEventListener("click", () => choose());
  panel.querySelector("#challenge-leave").addEventListener("click", close);
  panel.querySelector("#challenge-again").addEventListener("click", () => { challenge = startChallenge(challenge.id); render(); panel.querySelector("#challenge-title").focus(); });
  for (const button of panel.querySelectorAll("[data-adjust]")) button.addEventListener("click", () => move(button.dataset.adjust));
  document.addEventListener("keydown", (event) => {
    if (!challenge || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const direction = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down" }[event.key] || { A: "left", D: "right", W: "up", S: "down" }[event.key];
    if (direction) { event.preventDefault(); if (!event.repeat) move(direction); }
    else if (event.key === "Escape") { event.preventDefault(); close(); }
    else if ((event.key === " " || event.key === "Enter") && !event.target.closest("a, summary, #challenge-leave, #challenge-again, [data-adjust], #board-choices button")) {
      event.preventDefault(); if (!event.repeat) choose();
    }
  });
  return { open, close, move, choose, get current() { return challenge; } };
}
