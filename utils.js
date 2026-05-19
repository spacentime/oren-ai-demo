import {
  COLS,
  ROWS,
  CELL_WALL,
  CELL_CAGE_WALL,
  CELL_DOOR,
  CELL_CAGE_INTERIOR,
} from './constants.js';

export function bfsPath(sx, sy, tx, ty, maze) {
  const q = [[Math.round(sx), Math.round(sy)]];
  const visited = {};
  const prev = {};
  const key = (x, y) => `${x},${y}`;

  visited[key(q[0][0], q[0][1])] = true;

  while (q.length) {
    const [cx, cy] = q.shift();
    if (cx === tx && cy === ty) {
      const path = [];
      let cur = key(tx, ty);
      while (prev[cur]) {
        path.unshift(prev[cur]);
        cur = key(...prev[cur]);
      }
      path.push([tx, ty]);
      return path;
    }

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (nx < 0) nx = COLS - 1;
      if (nx >= COLS) nx = 0;
      if (ny < 0 || ny >= ROWS) continue;
      const c = maze[ny][nx];
      if (c === CELL_WALL || c === CELL_CAGE_WALL) continue;
      const k = key(nx, ny);
      if (!visited[k]) {
        visited[k] = true;
        prev[k] = [cx, cy];
        q.push([nx, ny]);
      }
    }
  }

  return [[tx, ty]];
}

export function canMoveGhost(x, y, dx, dy, maze) {
  const nx = x + dx;
  const ny = y + dy;
  let cx = Math.round(nx);
  let cy = Math.round(ny);
  if (cy < 0 || cy >= ROWS) return false;
  if (cx < 0) cx = COLS - 1;
  if (cx >= COLS) cx = 0;
  const c = maze[cy][cx];
  return c !== CELL_WALL && c !== CELL_CAGE_WALL && c !== CELL_DOOR && c !== CELL_CAGE_INTERIOR;
}

export function cellAt(x, y, maze) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  if (cy < 0 || cy >= ROWS || cx < 0 || cx >= COLS) return CELL_WALL;
  return maze[cy][cx];
}
