import { describe, expect, it } from "vitest";
import {
  canExtendTo,
  extend,
  initialState,
  isAdjacent,
  isComplete,
  totalCells,
  tryRetract,
} from "./game";
import type { GameState, Puzzle } from "./types";

const puzzle: Puzzle = {
  width: 2,
  height: 2,
  numbers: [
    { row: 0, col: 0, value: 1 },
    { row: 0, col: 1, value: 2 },
  ],
  walls: [],
};

const wallPuzzle: Puzzle = {
  ...puzzle,
  walls: [
    {
      a: { row: 0, col: 0 },
      b: { row: 1, col: 0 },
    },
  ],
};

const state = (path: GameState["path"]): GameState => ({
  path,
  startedAt: 100,
  completedAt: null,
});

describe("game rules", () => {
  it("recognizes orthogonal adjacency only", () => {
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 0 })).toBe(true);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 0 })).toBe(false);
  });

  it("extends paths immutably", () => {
    const start = state([{ row: 0, col: 0 }]);
    const next = extend(start, { row: 1, col: 0 });

    expect(start.path).toEqual([{ row: 0, col: 0 }]);
    expect(next.path).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it("allows valid moves and blocks walls, revisits, and skipped numbers", () => {
    expect(canExtendTo(state([{ row: 0, col: 0 }]), puzzle, { row: 1, col: 0 }))
      .toBe(true);
    expect(
      canExtendTo(state([{ row: 0, col: 0 }]), wallPuzzle, { row: 1, col: 0 }),
    ).toBe(false);
    expect(
      canExtendTo(
        state([
          { row: 0, col: 0 },
          { row: 1, col: 0 },
        ]),
        puzzle,
        { row: 0, col: 0 },
      ),
    ).toBe(false);
    expect(
      canExtendTo(
        state([
          { row: 0, col: 0 },
          { row: 1, col: 0 },
          { row: 1, col: 1 },
        ]),
        {
          ...puzzle,
          numbers: [
            { row: 0, col: 0, value: 1 },
            { row: 0, col: 1, value: 3 },
          ],
        },
        { row: 0, col: 1 },
      ),
    ).toBe(false);
  });

  it("retracts only to the previous path cell", () => {
    const current = state([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);

    expect(tryRetract(current, { row: 1, col: 0 })?.path).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);
    expect(tryRetract(current, { row: 0, col: 0 })).toBeNull();
  });

  it("completes only when all cells are filled and the final number is last", () => {
    expect(totalCells(puzzle)).toBe(4);
    expect(
      isComplete(
        state([
          { row: 0, col: 0 },
          { row: 1, col: 0 },
          { row: 1, col: 1 },
          { row: 0, col: 1 },
        ]),
        puzzle,
      ),
    ).toBe(true);
    expect(
      isComplete(
        state([
          { row: 0, col: 0 },
          { row: 1, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 1 },
        ]),
        puzzle,
      ),
    ).toBe(false);
  });

  it("starts with no active attempt", () => {
    expect(initialState()).toEqual({
      path: [],
      startedAt: null,
      completedAt: null,
    });
  });
});
