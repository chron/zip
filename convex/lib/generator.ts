export type Coord = { row: number; col: number };
export type NumberedCell = Coord & { value: number };
export type Wall = { a: Coord; b: Coord };

export type GeneratedPuzzle = {
  width: number;
  height: number;
  numbers: NumberedCell[];
  walls: Wall[];
};

type Rng = () => number;

const neighbors = (c: Coord, w: number, h: number): Coord[] => {
  const out: Coord[] = [];
  if (c.row > 0) out.push({ row: c.row - 1, col: c.col });
  if (c.row < h - 1) out.push({ row: c.row + 1, col: c.col });
  if (c.col > 0) out.push({ row: c.row, col: c.col - 1 });
  if (c.col < w - 1) out.push({ row: c.row, col: c.col + 1 });
  return out;
};

const key = (c: Coord) => `${c.row},${c.col}`;

const shuffle = <T>(arr: T[], rng: Rng): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i]!, a[j]!] = [a[j]!, a[i]!];
  }
  return a;
};

// Randomized backtracking Hamiltonian path on a w x h grid.
// Returns the visit order. For small grids (<= 6x6) this is fast enough.
const hamiltonianPath = (w: number, h: number, rng: Rng): Coord[] => {
  const total = w * h;
  const visited = new Set<string>();
  const path: Coord[] = [];

  const start: Coord = {
    row: Math.floor(rng() * h),
    col: Math.floor(rng() * w),
  };

  const dfs = (c: Coord): boolean => {
    path.push(c);
    visited.add(key(c));
    if (path.length === total) return true;

    const opts = shuffle(neighbors(c, w, h), rng);
    for (const n of opts) {
      if (!visited.has(key(n))) {
        if (dfs(n)) return true;
      }
    }

    path.pop();
    visited.delete(key(c));
    return false;
  };

  if (!dfs(start)) {
    throw new Error("Failed to find Hamiltonian path");
  }
  return path;
};

const pickNumberIndices = (pathLen: number, k: number): number[] => {
  // Always include first and last; evenly space the rest.
  if (k < 2) throw new Error("Need at least 2 numbers");
  if (k === 2) return [0, pathLen - 1];
  const step = (pathLen - 1) / (k - 1);
  const idx = new Set<number>();
  for (let i = 0; i < k; i++) {
    idx.add(Math.round(i * step));
  }
  // Ensure first and last are always in.
  idx.add(0);
  idx.add(pathLen - 1);
  return Array.from(idx).sort((a, b) => a - b);
};

export type GenerateOptions = {
  width?: number;
  height?: number;
  numberCount?: number;
  wallStrategy?: "none";
  rng?: Rng;
};

export const generatePuzzle = (opts: GenerateOptions = {}): GeneratedPuzzle => {
  const width = opts.width ?? 5;
  const height = opts.height ?? 5;
  const numberCount = opts.numberCount ?? 4;
  const rng = opts.rng ?? Math.random;

  // Retry a handful of times in case a random start hits a bad branch;
  // for 5x5 this almost always succeeds first try.
  let path: Coord[] | null = null;
  let attempt = 0;
  while (!path && attempt < 20) {
    try {
      path = hamiltonianPath(width, height, rng);
    } catch {
      attempt++;
    }
  }
  if (!path) throw new Error("Generator exhausted retries");

  const indices = pickNumberIndices(path.length, numberCount);
  const numbers: NumberedCell[] = indices.map((i, n) => ({
    row: path![i]!.row,
    col: path![i]!.col,
    value: n + 1,
  }));

  return {
    width,
    height,
    numbers,
    walls: [],
  };
};
