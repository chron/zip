import type { Coord, GameState, Puzzle } from "./types";

export type Direction = "up" | "down" | "left" | "right";

const directionDeltas: Record<Direction, Coord> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

export const coordKey = (c: Coord) => `${c.row},${c.col}`;
export const eqCoord = (a: Coord, b: Coord) => a.row === b.row && a.col === b.col;

export const isAdjacent = (a: Coord, b: Coord) =>
  (a.row === b.row && Math.abs(a.col - b.col) === 1) ||
  (a.col === b.col && Math.abs(a.row - b.row) === 1);

const wallKey = (a: Coord, b: Coord) => {
  const [lo, hi] = [a, b].sort((p, q) =>
    p.row === q.row ? p.col - q.col : p.row - q.row,
  );
  return `${coordKey(lo!)}|${coordKey(hi!)}`;
};

const buildWallSet = (puzzle: Puzzle): Set<string> =>
  new Set(puzzle.walls.map((w) => wallKey(w.a, w.b)));

// Index over numbered cells keyed by coordinate for quick lookup.
const buildNumberMap = (puzzle: Puzzle): Map<string, number> =>
  new Map(puzzle.numbers.map((n) => [coordKey(n), n.value]));

export const getNumberAt = (puzzle: Puzzle, c: Coord): number | undefined =>
  buildNumberMap(puzzle).get(coordKey(c));

export const totalCells = (puzzle: Puzzle) => puzzle.width * puzzle.height;

// Return the highest numbered value *that the path must have visited in order*
// based on the path so far. 0 means no numbers visited yet.
const lastVisitedNumber = (
  path: Coord[],
  numberMap: Map<string, number>,
): number => {
  let last = 0;
  for (const c of path) {
    const v = numberMap.get(coordKey(c));
    if (v !== undefined) last = v;
  }
  return last;
};

export const canExtendTo = (
  state: GameState,
  puzzle: Puzzle,
  target: Coord,
): boolean => {
  if (
    target.row < 0 ||
    target.row >= puzzle.height ||
    target.col < 0 ||
    target.col >= puzzle.width
  ) {
    return false;
  }

  const tail = state.path[state.path.length - 1];
  if (!tail) return false;
  if (!isAdjacent(tail, target)) return false;

  const walls = buildWallSet(puzzle);
  if (walls.has(wallKey(tail, target))) return false;

  // Can't revisit a cell (retraction is handled separately).
  if (state.path.some((c) => eqCoord(c, target))) return false;

  const numberMap = buildNumberMap(puzzle);
  const targetNum = numberMap.get(coordKey(target));
  if (targetNum !== undefined) {
    const last = lastVisitedNumber(state.path, numberMap);
    // Next number must be exactly last + 1.
    if (targetNum !== last + 1) return false;
  }
  return true;
};

export const extend = (state: GameState, target: Coord): GameState => ({
  ...state,
  path: [...state.path, target],
});

// Retract if target is the second-to-last cell in path. Removes only the tail.
export const tryRetract = (state: GameState, target: Coord): GameState | null => {
  if (state.path.length < 2) return null;
  const prev = state.path[state.path.length - 2]!;
  if (!eqCoord(prev, target)) return null;
  return { ...state, path: state.path.slice(0, -1) };
};

export const moveInDirection = (
  state: GameState,
  puzzle: Puzzle,
  direction: Direction,
  now = Date.now(),
): GameState => {
  if (state.completedAt !== null || isComplete(state, puzzle)) return state;

  let next = state;
  let tail = next.path[next.path.length - 1];

  // Keyboard play starts from 1 automatically, so it never needs a mouse click.
  if (!tail) {
    const start = puzzle.numbers.find((cell) => cell.value === 1);
    if (!start) return state;
    tail = { row: start.row, col: start.col };
    next = {
      path: [tail],
      startedAt: state.startedAt ?? now,
      completedAt: null,
    };
  }

  const delta = directionDeltas[direction];
  const target = {
    row: tail.row + delta.row,
    col: tail.col + delta.col,
  };

  const retracted = tryRetract(next, target);
  if (retracted) return retracted;
  if (canExtendTo(next, puzzle, target)) return extend(next, target);
  return next;
};

export const isComplete = (state: GameState, puzzle: Puzzle): boolean => {
  if (state.path.length !== totalCells(puzzle)) return false;
  const tail = state.path[state.path.length - 1]!;
  const tailNum = getNumberAt(puzzle, tail);
  const maxNum = Math.max(...puzzle.numbers.map((n) => n.value));
  return tailNum === maxNum;
};

export const initialState = (): GameState => ({
  path: [],
  startedAt: null,
  completedAt: null,
});
