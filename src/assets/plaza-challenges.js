export const BOARD_INPUTS = [2, 5, 8];
export const ROBOT_STEPS = ["approach", "grip", "carry", "release"];

export function startChallenge(id) {
  return { id, step: 0, complete: false, result: "" };
}

export function chooseChallenge(challenge, choice) {
  if (challenge.complete) return challenge;
  const { id, step } = challenge;
  const answer = id === "board" ? BOARD_INPUTS[step] + 1 : ROBOT_STEPS[step];
  if (choice !== answer) return { ...challenge, result: "wrong" };
  const complete = step + 1 === (id === "board" ? BOARD_INPUTS.length : ROBOT_STEPS.length);
  return { id, step: step + 1, complete, result: complete ? "done" : "correct" };
}
