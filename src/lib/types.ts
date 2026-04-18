export type Coord = { row: number; col: number };
export type NumberedCell = Coord & { value: number };
export type Wall = { a: Coord; b: Coord };

export type Puzzle = {
  width: number;
  height: number;
  numbers: NumberedCell[];
  walls: Wall[];
};

export type GameState = {
  path: Coord[];
  startedAt: number | null;
  completedAt: number | null;
};
