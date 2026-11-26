import { BOARD_INPUTS, ROBOT_STEPS, startChallenge, chooseChallenge } from "./plaza-challenges.js";

export function createDialogue(dialog, visit) {
  const title = dialog.querySelector("#panel-title");
  const speech = dialog.querySelector("#speech");
  const typed = dialog.querySelector("#speech-typed");
  const readable = dialog.querySelector("#speech-readable");
  const next = dialog.querySelector("#speech-next");
  const challengePanel = dialog.querySelector("#challenge");
  const labels = dialog.querySelector("#challenge-labels").dataset;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let id, lines, line = 0, timer, revealed = false, opener, challenge, anchor, placement;

  function position(point = anchor) {
    anchor = point;
    if (!point || !dialog.open || !dialog.classList.contains("balloon")) return;
    const { width, height } = dialog.getBoundingClientRect();
    const left = Math.max(12, Math.min(innerWidth - width - 12, point.x - width / 2));
    const above = point.top - height - 16 >= point.minY;
    const top = Math.max(12, Math.min(innerHeight - height - 12, above ? point.top - height - 16 : point.bottom + 16));
    const tail = Math.max(20, Math.min(width - 24, point.x - left));
    const key = [left, top, tail, above].join();
    if (key === placement) return;
    placement = key;
    dialog.style.left = `${Math.round(left)}px`;
    dialog.style.top = `${Math.round(top)}px`;
    dialog.style.setProperty("--tail-left", `${Math.round(tail)}px`);
    dialog.dataset.tail = above ? "bottom" : "top";
  }

  function updateNext() {
    next.textContent = !revealed ? next.dataset.reveal
      : line < lines.length - 1 ? next.dataset.next
        : id === "board" || id === "robot" ? next.dataset.challenge
          : id === "study" && document.body.classList.contains("playing") ? next.dataset.enterRoom : next.dataset.finish;
  }

  function reveal() {
    clearInterval(timer);
    typed.textContent = lines[line];
    revealed = true;
    updateNext();
  }

  function showLine() {
    clearInterval(timer);
    const text = lines[line];
    dialog.querySelector("#speech-space").textContent = text;
    readable.textContent = text;
    typed.textContent = "";
    revealed = false;
    updateNext();
    if (motion.matches) reveal();
    else {
      const letters = Array.from(text);
      let count = 0;
      timer = setInterval(() => {
        typed.textContent = letters.slice(0, ++count).join("");
        if (count >= letters.length) reveal();
      }, 22);
    }
    position();
  }

  function renderChallenge() {
    const { step, complete, result } = challenge;
    const size = id === "board" ? BOARD_INPUTS.length : ROBOT_STEPS.length;
    dialog.querySelector("#challenge-progress").textContent = `${labels.progress} ${Math.min(step + 1, size)} ${labels.of} ${size}`;
    const feedback = result ? labels[`${id}${result[0].toUpperCase()}${result.slice(1)}`] : "";
    const instruction = complete ? "" : id === "board"
      ? `${labels.input}: ${BOARD_INPUTS[step]} + 1 = ?`
      : labels[`robot${ROBOT_STEPS[step][0].toUpperCase()}${ROBOT_STEPS[step].slice(1)}`];
    dialog.querySelector("#challenge-result").textContent = [feedback, instruction].filter(Boolean).join(" ");
    dialog.querySelector("#challenge-again").hidden = !complete;
    if (id === "board") {
      dialog.querySelector("#board-input").textContent = BOARD_INPUTS[Math.min(step, size - 1)];
      dialog.querySelector("#board-answer").textContent = complete ? BOARD_INPUTS.at(-1) + 1 : "?";
      const choices = dialog.querySelector("#board-choices");
      choices.hidden = complete;
      if (!complete) {
        const input = BOARD_INPUTS[step];
        for (const [i, button] of [...choices.children].entries()) {
          button.textContent = input + i;
          button.dataset.choice = input + i;
        }
      }
    } else {
      for (const [i, item] of [...dialog.querySelectorAll("#robot-steps li")].entries()) {
        item.toggleAttribute("data-done", i < step);
        if (i === step) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      }
      const station = complete ? "tray" : step >= 2 ? "gripper" : "bench";
      for (const marker of dialog.querySelectorAll("[data-station]")) marker.hidden = marker.dataset.station !== station;
      dialog.querySelector("#robot-choices").hidden = complete;
    }
    if (complete) dialog.querySelector("#challenge-again").focus();
    position();
  }

  function beginChallenge() {
    clearInterval(timer);
    challenge = startChallenge(id);
    dialog.classList.remove("balloon");
    dialog.removeAttribute("style");
    dialog.removeAttribute("data-tail");
    speech.hidden = true;
    readable.textContent = labels[`${id}Prompt`];
    next.hidden = true;
    dialog.querySelector("#speech-hint").hidden = true;
    challengePanel.hidden = false;
    for (const panel of dialog.querySelectorAll("[data-game]")) panel.hidden = panel.dataset.game !== id;
    renderChallenge();
    dialog.querySelector(`[data-game="${id}"] button`).focus();
  }

  function advance() {
    if (challenge) return;
    if (!revealed) reveal();
    else if (line + 1 < lines.length) { line++; showLine(); }
    else if (id === "board" || id === "robot") beginChallenge();
    else {
      dialog.close();
      if (id === "study" && document.body.classList.contains("playing")) visit("study");
    }
  }

  function open(action, source, result = "") {
    if (dialog.open) return;
    id = action;
    opener = source || document.activeElement;
    lines = [...document.querySelectorAll(`[data-transcript="${id}"] p`)].map((p) => p.textContent);
    line = 0;
    challenge = undefined;
    placement = undefined;
    dialog.removeAttribute("style");
    dialog.classList.toggle("balloon", opener?.matches("canvas, #interact") || false);
    dialog.querySelector("#panel-context").textContent = document.querySelector(`[data-action="${id}"]`).textContent;
    dialog.querySelector("#interaction-result").textContent = result;
    dialog.querySelector('[data-panel="inventory"]').hidden = id !== "inventory";
    challengePanel.hidden = true;
    next.hidden = false;
    speech.hidden = false;
    dialog.querySelector("#speech-hint").hidden = false;
    showLine();
    dialog.showModal();
    position();
    title.focus();
  }

  for (let i = 0; i < 3; i++) {
    const button = document.createElement("button");
    button.type = "button";
    dialog.querySelector("#board-choices").append(button);
  }
  challengePanel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-choice]");
    if (!button || !challenge) return;
    challenge = chooseChallenge(challenge, id === "board" ? Number(button.dataset.choice) : button.dataset.choice);
    renderChallenge();
  });
  dialog.querySelector("#challenge-again").addEventListener("click", beginChallenge);
  next.addEventListener("click", advance);
  speech.addEventListener("click", advance);
  dialog.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !challenge
      && (!event.target.closest("button, a, summary") || event.target === next)) {
      event.preventDefault();
      if (!event.repeat) advance();
    }
  });
  dialog.addEventListener("close", () => { clearInterval(timer); opener?.focus(); });
  motion.addEventListener("change", () => { if (motion.matches && dialog.open && !challenge) reveal(); });
  new ResizeObserver(() => position()).observe(dialog);
  window.addEventListener("resize", () => position());
  return { open, position };
}
