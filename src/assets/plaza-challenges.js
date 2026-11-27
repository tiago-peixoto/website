export const BOARD_INPUTS = [2, 5, 8];

export function startChallenge(id) {
  return { id, step: 0, complete: false, result: "", selection: 0, holding: false };
}

export function moveChallenge(challenge, direction) {
  if (challenge.complete) return challenge;
  const delta = direction === "left" || direction === "up" ? -1 : 1;
  return { ...challenge, selection: Math.max(0, Math.min(2, challenge.selection + delta)), result: "" };
}

export function chooseChallenge(challenge, choice = challenge.selection) {
  if (challenge.complete) return challenge;
  const { id, step, selection, holding } = challenge;
  if (id === "board") {
    if (choice !== BOARD_INPUTS[step] + 1) return { ...challenge, result: "wrong" };
    const complete = step === BOARD_INPUTS.length - 1;
    return { ...challenge, step: step + 1, complete, result: complete ? "done" : "correct" };
  }
  if ((!holding && selection !== 0) || (holding && selection !== 2)) return { ...challenge, result: "wrong" };
  return { ...challenge, holding: !holding, step: step + 1, complete: holding, result: holding ? "done" : "correct" };
}
