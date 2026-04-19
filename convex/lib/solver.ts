import type { Coord, NumberedCell, Wall } from "./generator";

export type SolvablePuzzle = {
  width: number;
  height: number;
  numbers: NumberedCell[];
  walls: Wall[];
};

const edgeKey = (a: Coord, b: Coord) => {
  const ak = `${a.row},${a.col}`;
  const bk = `${b.row},${b.col}`;
  const [p, q] = ak < bk ? [ak, bk] : [bk, ak];
  return `${p}|${q}`;
};

export type SolveResult = {
  // Up to `max` full solution paths, each as an ordered list of cells.
  solutions: Coord[][];
  // Number of DFS recursion entries — a rough branching/difficulty signal.
  nodesExplored: number;
};

// Finds up to `max` valid solutions. A valid solution is a Hamiltonian path
// that visits the numbered waypoints in ascending order and doesn't cross any
// wall. Early-exits once `max` solutions are found.
export const findSolutions = (
  puzzle: SolvablePuzzle,
  max = 2,
): SolveResult => {
  const { width, height } = puzzle;
  const total = width * height;

  const sorted = [...puzzle.numbers].sort((a, b) => a.value - b.value);
  if (sorted.length === 0 || sorted[0]!.value !== 1) {
    return { solutions: [], nodesExplored: 0 };
  }
  const maxValue = sorted[sorted.length - 1]!.value;

  const valueAt = new Map<number, number>();
  for (const n of sorted) valueAt.set(n.row * width + n.col, n.value);

  const wallSet = new Set<string>();
  for (const w of puzzle.walls) wallSet.add(edgeKey(w.a, w.b));

  const visited = new Uint8Array(total);
  const trail: Coord[] = [];
  let visitedCount = 0;
  let nextExpected = 1;
  let nodesExplored = 0;
  const solutions: Coord[][] = [];

  const unvisitedDegree = (r: number, c: number): number => {
    let d = 0;
    if (
      r > 0 &&
      !visited[(r - 1) * width + c] &&
      !wallSet.has(edgeKey({ row: r, col: c }, { row: r - 1, col: c }))
    )
      d++;
    if (
      r < height - 1 &&
      !visited[(r + 1) * width + c] &&
      !wallSet.has(edgeKey({ row: r, col: c }, { row: r + 1, col: c }))
    )
      d++;
    if (
      c > 0 &&
      !visited[r * width + (c - 1)] &&
      !wallSet.has(edgeKey({ row: r, col: c }, { row: r, col: c - 1 }))
    )
      d++;
    if (
      c < width - 1 &&
      !visited[r * width + (c + 1)] &&
      !wallSet.has(edgeKey({ row: r, col: c }, { row: r, col: c + 1 }))
    )
      d++;
    return d;
  };

  const dfs = (r: number, c: number) => {
    if (solutions.length >= max) return;
    nodesExplored++;
    const idx = r * width + c;

    const waypointValue = valueAt.get(idx);
    const prevExpected = nextExpected;
    if (waypointValue !== undefined) {
      if (waypointValue !== nextExpected) return;
      nextExpected = waypointValue + 1;
    }

    visited[idx] = 1;
    visitedCount++;
    trail.push({ row: r, col: c });

    if (visitedCount === total) {
      if (waypointValue === maxValue) solutions.push(trail.slice());
    } else {
      const opts: Array<[number, number, number]> = [];
      const pushIf = (nr: number, nc: number) => {
        const nidx = nr * width + nc;
        if (visited[nidx]) return;
        if (wallSet.has(edgeKey({ row: r, col: c }, { row: nr, col: nc })))
          return;
        opts.push([nr, nc, 0]);
      };
      if (r > 0) pushIf(r - 1, c);
      if (r < height - 1) pushIf(r + 1, c);
      if (c > 0) pushIf(r, c - 1);
      if (c < width - 1) pushIf(r, c + 1);
      for (const o of opts) o[2] = unvisitedDegree(o[0], o[1]);
      opts.sort((a, b) => a[2] - b[2]);

      for (const [nr, nc] of opts) {
        dfs(nr, nc);
        if (solutions.length >= max) break;
      }
    }

    visited[idx] = 0;
    visitedCount--;
    trail.pop();
    nextExpected = prevExpected;
  };

  const start = sorted[0]!;
  dfs(start.row, start.col);
  return { solutions, nodesExplored };
};

// Convenience wrapper for callers that just want a count.
export const countSolutions = (puzzle: SolvablePuzzle, max = 2): number =>
  findSolutions(puzzle, max).solutions.length;
