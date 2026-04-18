export type Coord = { row: number; col: number };
export type NumberedCell = Coord & { value: number };
export type Wall = { a: Coord; b: Coord };

export type GeneratedPuzzle = {
  width: number;
  height: number;
  numbers: NumberedCell[];
  walls: Wall[];
  seed: number;
};

type Rng = () => number;

// mulberry32 — small, fast, seeded PRNG. Deterministic for a given seed so
// generator bugs can be reproduced with the seed in the log.
const mulberry32 = (seed: number): Rng => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randomSeed = (): number => Math.floor(Math.random() * 0xffffffff) >>> 0;

const neighbors = (c: Coord, w: number, h: number): Coord[] => {
  const out: Coord[] = [];
  if (c.row > 0) out.push({ row: c.row - 1, col: c.col });
  if (c.row < h - 1) out.push({ row: c.row + 1, col: c.col });
  if (c.col > 0) out.push({ row: c.row, col: c.col - 1 });
  if (c.col < w - 1) out.push({ row: c.row, col: c.col + 1 });
  return out;
};

const key = (c: Coord) => `${c.row},${c.col}`;
const edgeKey = (a: Coord, b: Coord) => {
  const [p, q] = key(a) < key(b) ? [a, b] : [b, a];
  return `${key(p)}|${key(q)}`;
};

const shuffle = <T>(arr: T[], rng: Rng): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i]!, a[j]!] = [a[j]!, a[i]!];
  }
  return a;
};

// Randomized backtracking Hamiltonian path on a w x h grid.
// Fast enough for small grids (up to ~7x7). Larger boards will want a smarter algorithm.
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
  if (k < 2) throw new Error("numberCount must be >= 2");
  if (k > pathLen) throw new Error("numberCount exceeds path length");
  if (k === 2) return [0, pathLen - 1];
  const step = (pathLen - 1) / (k - 1);
  const idx = new Set<number>();
  for (let i = 0; i < k; i++) {
    idx.add(Math.round(i * step));
  }
  idx.add(0);
  idx.add(pathLen - 1);
  return Array.from(idx).sort((a, b) => a - b);
};

// Build the set of grid adjacencies that the solution path does NOT use.
// These are the edges where multiple candidate solutions could branch — walling
// a subset of them tightens the puzzle without blocking the intended path.
const nonPathAdjacencies = (
  path: Coord[],
  w: number,
  h: number,
): Wall[] => {
  const used = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) {
    used.add(edgeKey(path[i]!, path[i + 1]!));
  }
  const walls: Wall[] = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const a = { row: r, col: c };
      if (c + 1 < w) {
        const b = { row: r, col: c + 1 };
        if (!used.has(edgeKey(a, b))) walls.push({ a, b });
      }
      if (r + 1 < h) {
        const b = { row: r + 1, col: c };
        if (!used.has(edgeKey(a, b))) walls.push({ a, b });
      }
    }
  }
  return walls;
};

export type GenerateOptions = {
  width?: number;
  height?: number;
  numberCount?: number;
  // Fraction (0..1) of non-path adjacencies to convert into walls. 0 = none.
  wallDensity?: number;
  // Optional deterministic seed. If omitted, a random one is chosen and
  // returned on the result so the output can be reproduced from logs.
  seed?: number;
};

const validate = (
  width: number,
  height: number,
  numberCount: number,
  wallDensity: number,
) => {
  if (!Number.isInteger(width) || width < 2) throw new Error("width must be >= 2");
  if (!Number.isInteger(height) || height < 2)
    throw new Error("height must be >= 2");
  if (!Number.isInteger(numberCount) || numberCount < 2)
    throw new Error("numberCount must be >= 2");
  if (numberCount > width * height)
    throw new Error("numberCount exceeds cell count");
  if (wallDensity < 0 || wallDensity > 1)
    throw new Error("wallDensity must be between 0 and 1");
};

export const generatePuzzle = (opts: GenerateOptions = {}): GeneratedPuzzle => {
  const width = opts.width ?? 5;
  const height = opts.height ?? 5;
  const numberCount = opts.numberCount ?? 4;
  const wallDensity = opts.wallDensity ?? 0;
  const seed = opts.seed ?? randomSeed();
  validate(width, height, numberCount, wallDensity);

  const rng = mulberry32(seed);

  // Retry a handful of times in case the random start hits a dead branch.
  // For small grids this almost always succeeds on the first try.
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

  let walls: Wall[] = [];
  if (wallDensity > 0) {
    const candidates = shuffle(nonPathAdjacencies(path, width, height), rng);
    const take = Math.round(candidates.length * wallDensity);
    walls = candidates.slice(0, take);
  }

  return { width, height, numbers, walls, seed };
};
