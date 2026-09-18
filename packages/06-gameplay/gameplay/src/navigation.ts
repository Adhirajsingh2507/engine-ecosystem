/**
 * Grid-based A* pathfinding and basic steering. Navmeshes are a later upgrade;
 * a uniform walkable grid covers most tile/RTS/topdown cases and is easy to test.
 */
export interface GridPoint {
  x: number;
  y: number;
}

export interface PathOptions {
  /** Allow 8-way movement (with corner-cutting disallowed). Default false (4-way). */
  diagonal?: boolean;
}

/**
 * A* from `start` to `goal` over a `width × height` grid. `walkable(x, y)` returns
 * whether a cell can be entered. Returns the path inclusive of start and goal, or
 * `null` if unreachable.
 */
export function findPath(
  width: number,
  height: number,
  walkable: (x: number, y: number) => boolean,
  start: GridPoint,
  goal: GridPoint,
  opts: PathOptions = {},
): GridPoint[] | null {
  const id = (x: number, y: number) => y * width + x;
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  if (!inBounds(start.x, start.y) || !inBounds(goal.x, goal.y)) return null;
  if (!walkable(goal.x, goal.y) || !walkable(start.x, start.y)) return null;

  const diag = opts.diagonal ?? false;
  const neighbours = diag
    ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // octile heuristic for 8-way, manhattan for 4-way
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - goal.x);
    const dy = Math.abs(y - goal.y);
    return diag ? Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy) : dx + dy;
  };

  const gScore = new Map<number, number>();
  const cameFrom = new Map<number, number>();
  const open: { x: number; y: number; f: number }[] = [];
  const startId = id(start.x, start.y);
  gScore.set(startId, 0);
  open.push({ x: start.x, y: start.y, f: h(start.x, start.y) });

  while (open.length > 0) {
    // pop lowest f (linear min — fine for modest grids; use a heap for large maps)
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const current = open.splice(best, 1)[0];
    const curId = id(current.x, current.y);

    if (current.x === goal.x && current.y === goal.y) {
      const path: GridPoint[] = [];
      let n: number | undefined = curId;
      while (n !== undefined) {
        path.push({ x: n % width, y: Math.floor(n / width) });
        n = cameFrom.get(n);
      }
      return path.reverse();
    }

    const curG = gScore.get(curId)!;
    for (const [dx, dy] of neighbours) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!inBounds(nx, ny) || !walkable(nx, ny)) continue;
      // no corner cutting: for a diagonal, both orthogonal cells must be open
      if (dx !== 0 && dy !== 0 && (!walkable(current.x + dx, current.y) || !walkable(current.x, current.y + dy))) {
        continue;
      }
      const step = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
      const nId = id(nx, ny);
      const tentative = curG + step;
      if (tentative < (gScore.get(nId) ?? Infinity)) {
        cameFrom.set(nId, curId);
        gScore.set(nId, tentative);
        const f = tentative + h(nx, ny);
        const existing = open.find((o) => o.x === nx && o.y === ny);
        if (existing) existing.f = f;
        else open.push({ x: nx, y: ny, f });
      }
    }
  }
  return null;
}
