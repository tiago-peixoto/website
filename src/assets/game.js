export const START = { bug: 100, focus: 60, exposed: false };
const BUG_MOVES = [12, 15, 18];
const TEXT = {
  en: {
    start: "A BUG blocks the deploy!",
    reproduce: "Tiago reproduces the bug. Its weak point shows!",
    miss: "Tiago fixes a symptom. The bug is still there.",
    fix: (damage) => `Tiago ships the simplest fix. ${damage} damage!`,
    teach: "Tiago writes it down. Focus restored.",
    won: "The BUG is fixed! The deploy goes out.",
    moves: ["Flaky Test", "Works On My Machine", "Scope Creep"],
    bug: (name, damage) => `BUG uses ${name}. ${damage} focus lost.`,
    lost: "Out of focus. The BUG ships to production.",
  },
  "pt-BR": {
    start: "Um BUG bloqueia o deploy!",
    reproduce: "Tiago reproduz o bug. O ponto fraco aparece!",
    miss: "Tiago corrige um sintoma. O bug continua lá.",
    fix: (damage) => `Tiago entrega a correção mais simples. ${damage} de dano!`,
    teach: "Tiago documenta tudo. Foco restaurado.",
    won: "O BUG foi corrigido! O deploy sai.",
    moves: ["Flaky Test", "Na Minha Máquina Funciona", "Scope Creep"],
    bug: (name, damage) => `BUG usa ${name}. ${damage} de foco perdido.`,
    lost: "Sem foco. O BUG vai para produção.",
  },
};

// Plays one turn. `roll` returns a number from 0 to 1, so a test can fix the luck.
export function play(state, move, roll = Math.random, text = TEXT.en) {
  let { bug, focus, exposed } = state;
  const lines = [];

  if (move === "reproduce") {
    bug -= 10;
    exposed = true;
    lines.push(text.reproduce);
  } else if (move === "simplest") {
    if (!exposed && roll() < 0.5) {
      lines.push(text.miss);
    } else {
      const damage = exposed ? 50 : 25;
      bug -= damage;
      exposed = false;
      lines.push(text.fix(damage));
    }
  } else if (move === "teach") {
    focus = Math.min(START.focus, focus + 25);
    lines.push(text.teach);
  }

  bug = Math.max(0, bug);
  if (bug === 0) {
    lines.push(text.won);
  } else {
    const index = Math.floor(roll() * BUG_MOVES.length);
    focus = Math.max(0, focus - BUG_MOVES[index]);
    lines.push(text.bug(text.moves[index], BUG_MOVES[index]));
    if (focus === 0) lines.push(text.lost);
  }
  return { state: { bug, focus, exposed }, lines };
}

function start() {
  const $ = (selector) => document.querySelector(selector);
  const moves = [...document.querySelectorAll("[data-move]")];
  const text = TEXT[document.documentElement.lang];
  let state = START;

  function show(lines, hit) {
    $("#log").textContent = lines.join(" ");
    $("#bug-hp").style.width = `${state.bug}%`;
    $("#hero-hp").style.width = `${(state.focus / START.focus) * 100}%`;
    const over = state.bug === 0 || state.focus === 0;
    moves.forEach((button) => (button.disabled = over));
    $("#again").hidden = !over;
    $(".scene .bug").classList.toggle("down", state.bug === 0);
    if (over) $("#again").focus();
    if (hit) {
      // Removing the class and reading the layout restarts the shake animation.
      hit.classList.remove("hit");
      hit.getBoundingClientRect();
      hit.classList.add("hit");
    }
  }

  moves.forEach((button) =>
    button.addEventListener("click", () => {
      const before = state;
      const turn = play(state, button.dataset.move, Math.random, text);
      state = turn.state;
      show(turn.lines, state.bug < before.bug ? $(".scene .bug") : $(".scene .back"));
    }),
  );
  $("#again").addEventListener("click", () => {
    state = START;
    show([text.start]);
    moves[0].focus();
  });
  $(".hud").hidden = false;
}

if (typeof document !== "undefined") start();
