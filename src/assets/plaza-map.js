export const MAP = [
  "####################",
  "#..................#",
  "#.UUU..............#",
  "#.UUU..............#",
  "#..u...............#",
  "#..................#",
  "#........S.........#",
  "#..................#",
  "#..................#",
  "#..................#",
  "#..................#",
  "#..................#",
  "#..................#",
  "####################",
];

export const DIRECTIONS = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
export const START = { x: 9, y: 6, facing: "up", panel: false };

export function walkable(x, y) {
  return [".", "S"].includes(MAP[y]?.[x]);
}

export function atDoor(state) {
  const [dx, dy] = DIRECTIONS[state.facing];
  return MAP[state.y + dy]?.[state.x + dx] === "u";
}

export function update(state, action) {
  if (action === "close") return { ...state, panel: false };
  if (state.panel) return state;
  if (action === "open") return { ...state, panel: true };
  if (action === "interact") return atDoor(state) ? { ...state, panel: true } : state;
  if (!Object.hasOwn(DIRECTIONS, action)) return state;
  const [dx, dy] = DIRECTIONS[action];
  const x = state.x + dx;
  const y = state.y + dy;
  return { ...state, facing: action, ...(walkable(x, y) ? { x, y } : {}) };
}
