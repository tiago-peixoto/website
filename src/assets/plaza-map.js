export const DIRECTIONS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function cameraZoom(width, height, mapWidth, mapHeight) {
  return Math.max(1, Math.ceil(Math.max(width / mapWidth, height / mapHeight)));
}

export function navigation(map) {
  const blocked = map.layers.find((layer) => layer.name === "blocked").data;
  const obstacles = map.layers.find((layer) => layer.name === "obstacles").objects;
  const interactions = map.layers.find((layer) => layer.name === "interactions").objects;
  const exits = map.layers.find((layer) => layer.name === "exits")?.objects || [];
  const width = map.width * map.tilewidth;
  const height = map.height * map.tileheight;

  function walkable(x, y) {
    // Only the feet collide, so the walker can pass behind the tree and lamp.
    const left = x - 5, right = x + 5, top = y - 4, bottom = y;
    if (left < 0 || top < 0 || right >= width || bottom >= height) return false;
    for (const px of [left, right]) {
      for (const py of [top, bottom]) {
        if (blocked[Math.floor(py / map.tileheight) * map.width + Math.floor(px / map.tilewidth)]) return false;
      }
    }
    return !obstacles.some((o) => right > o.x && left < o.x + o.width && bottom > o.y && top < o.y + o.height);
  }

  function move(position, direction, distance) {
    const [dx, dy] = DIRECTIONS[direction];
    let { x, y } = position;
    // Substeps prevent long frames or a tap from jumping over a narrow obstacle.
    for (let remaining = distance; remaining > 0; remaining -= 1) {
      const step = Math.min(remaining, 1);
      if (!walkable(x + dx * step, y + dy * step)) break;
      x += dx * step;
      y += dy * step;
    }
    return { x, y, facing: direction };
  }

  function nearby({ x, y, facing }) {
    if (!walkable(x, y) || !DIRECTIONS[facing]) return;
    const [dx, dy] = DIRECTIONS[facing];
    const contains = (o, px, py) => px >= o.x && px < o.x + o.width && py >= o.y && py < o.y + o.height;
    for (let distance = 0; distance <= 24; distance++) {
      const px = x + dx * distance, py = y - 2 + dy * distance;
      if (px < 0 || py < 0 || px >= width || py >= height) return;
      const target = interactions.find((o) => contains(o, px, py));
      if (target) return target;
      // Stop at the first surface, so a nearby object cannot be used through a wall or table.
      if (blocked[Math.floor(py / map.tileheight) * map.width + Math.floor(px / map.tilewidth)]
        || obstacles.some((o) => contains(o, px, py))) return;
    }
  }
  function exit({ x, y, facing }) {
    return exits.find((object) => facing === object.properties.find((p) => p.name === "facing").value
      && x >= object.x && x <= object.x + object.width && y >= object.y && y <= object.y + object.height);
  }
  return { walkable, move, nearby, exit };
}
