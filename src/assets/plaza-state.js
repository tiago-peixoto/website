export function createState() {
  return { lightsOn: true, lampOn: false, pondJump: 0, inventory: new Set() };
}

export function changeState(state, action) {
  if (action === "light") state.lightsOn = !state.lightsOn;
  else if (action === "lamp") state.lampOn = !state.lampOn;
  else if (action === "pond") state.pondJump++;
  else if (action === "notebook" || action === "sensor") state.inventory.add(action);
}
