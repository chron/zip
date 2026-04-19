import { findSolutions } from "./solver";

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

// Randomized Hamiltonian path on a w x h grid, using Warnsdorff's rule:
// at each step prefer neighbors with the fewest unvisited neighbors. This
// almost always finds a path on the first attempt even up to 8x8+.
const hamiltonianPath = (w: number, h: number, rng: Rng): Coord[] => {
  const total = w * h;
  const visited = new Set<string>();
  const path: Coord[] = [];

  const start: Coord = {
    row: Math.floor(rng() * h),
    col: Math.floor(rng() * w),
  };

  const unvisitedDegree = (c: Coord) =>
    neighbors(c, w, h).filter((n) => !visited.has(key(n))).length;

  const dfs = (c: Coord): boolean => {
    path.push(c);
    visited.add(key(c));
    if (path.length === total) return true;

    // Shuffle first so ties break randomly, then sort by Warnsdorff degree.
    const opts = shuffle(
      neighbors(c, w, h).filter((n) => !visited.has(key(n))),
      rng,
    );
    opts.sort((a, b) => unvisitedDegree(a) - unvisitedDegree(b));

    for (const n of opts) {
      if (dfs(n)) return true;
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
  // Starting fraction (0..1) of non-path adjacencies to convert into walls.
  // If `ensureUnique` is true, more walls may be added beyond this floor until
  // the solution is unique.
  wallDensity?: number;
  // Greedily add walls until the puzzle has exactly one solution. Defaults on.
  // Throws if uniqueness can't be reached (non-path edges exhausted).
  ensureUnique?: boolean;
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
  const ensureUnique = opts.ensureUnique ?? true;
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

  const candidates = shuffle(nonPathAdjacencies(path, width, height), rng);
  const initialTake = Math.round(candidates.length * wallDensity);
  const walls: Wall[] = candidates.slice(0, initialTake);

  // Every edge on the intended path — walling any of these would kill the
  // intended solution, so we must never pick one as a distinguishing wall.
  const pathEdges = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) {
    pathEdges.add(edgeKey(path[i]!, path[i + 1]!));
  }

  if (ensureUnique) {
    // Each iteration: find at most 2 solutions. If there are <=1, we're done.
    // Otherwise identify an edge used by one of the alternates but NOT by the
    // intended path, and wall it. That guarantees we eliminate at least one
    // alternate per iteration — far fewer calls than blindly walling until
    // uniqueness falls out.
    while (true) {
      const { solutions } = findSolutions(
        { width, height, numbers, walls },
        2,
      );
      if (solutions.length <= 1) break;

      let picked: Wall | null = null;
      outer: for (const sol of solutions) {
        for (let i = 0; i < sol.length - 1; i++) {
          const e = edgeKey(sol[i]!, sol[i + 1]!);
          if (!pathEdges.has(e)) {
            picked = { a: sol[i]!, b: sol[i + 1]! };
            break outer;
          }
        }
      }
      if (!picked) throw new Error("No distinguishing edge available");
      walls.push(picked);
    }
  }

  return { width, height, numbers, walls, seed };
};
