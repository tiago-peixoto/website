export const DIRECTIONS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function navigation(map) {
  const blocked = map.layers.find((layer) => layer.name === "blocked").data;
  const obstacles = map.layers.find((layer) => layer.name === "obstacles").objects;
  const door = map.layers.find((layer) => layer.name === "doors").objects[0];
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

  function atDoor({ x, y, facing }) {
    return facing === "up" && x >= door.x && x <= door.x + door.width && y >= door.y && y <= door.y + door.height;
  }
  return { walkable, move, atDoor };
}
