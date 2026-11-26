export function createDialogue(dialog, finish) {
  const title = dialog.querySelector("#panel-title");
  const typed = dialog.querySelector("#speech-typed");
  const readable = dialog.querySelector("#speech-readable");
  const action = document.querySelector("#interact");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let id, lines, line = 0, timer, revealed = false, opener, anchor, placement;

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

  function reveal() {
    clearInterval(timer);
    typed.textContent = lines[line];
    revealed = true;
  }

  function showLine() {
    clearInterval(timer);
    const text = lines[line];
    dialog.querySelector("#speech-space").textContent = text;
    readable.textContent = text;
    typed.textContent = "";
    revealed = false;
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

  function advance() {
    if (!dialog.open) return;
    if (!revealed) reveal();
    else if (line + 1 < lines.length) { line++; showLine(); }
    else { clearInterval(timer); dialog.close(); finish(id); }
  }

  function open(actionId, source, result = "") {
    if (dialog.open) return;
    id = actionId;
    opener = source || document.activeElement;
    lines = [...document.querySelectorAll(`[data-transcript="${id}"] p`)].map((p) => p.textContent);
    line = 0;
    placement = undefined;
    anchor = undefined;
    dialog.removeAttribute("style");
    dialog.classList.toggle("balloon", document.body.classList.contains("playing"));
    dialog.querySelector("#panel-context").textContent = document.querySelector(`[data-action="${id}"]`).textContent;
    dialog.querySelector("#interaction-result").textContent = result;
    dialog.querySelector('[data-panel="inventory"]').hidden = id !== "inventory";
    document.body.classList.add("speaking");
    document.querySelector("#controls").hidden = false;
    action.disabled = false;
    action.textContent = action.dataset.speech;
    action.removeAttribute("aria-pressed");
    showLine();
    dialog.show();
    position();
    title.focus();
  }

  action.addEventListener("click", (event) => {
    if (!dialog.open) return;
    event.stopImmediatePropagation();
    advance();
  });
  dialog.querySelector("#speech").addEventListener("click", advance);
  document.addEventListener("keydown", (event) => {
    if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    if (event.key === "Escape") { event.preventDefault(); dialog.close(); }
    else if ((event.key === "Enter" || event.key === " ") && !event.target.closest("a, summary, button:not(#interact)")) {
      event.preventDefault();
      if (!event.repeat) advance();
    }
  });
  dialog.addEventListener("close", () => {
    clearInterval(timer);
    document.body.classList.remove("speaking");
    document.querySelector("#controls").hidden = !document.body.classList.contains("playing");
    if (!document.body.classList.contains("experimenting")) opener?.focus();
  });
  motion.addEventListener("change", () => { if (motion.matches && dialog.open) reveal(); });
  new ResizeObserver(() => position()).observe(dialog);
  window.addEventListener("resize", () => position());
  return { open, position };
}
