import { useCallback, useEffect, useRef, useState } from "react";
import type { Coord, GameState, Puzzle } from "@/lib/types";
import {
  canExtendTo,
  eqCoord,
  extend,
  getNumberAt,
  initialState,
  isComplete,
  tryRetract,
} from "@/lib/game";

export type UseGameResult = {
  state: GameState;
  isDragging: boolean;
  beginAt: (cell: Coord) => void;
  moveTo: (cell: Coord) => void;
  endDrag: () => void;
  reset: () => void;
};

export const useGame = (
  puzzle: Puzzle | null,
  onComplete?: (elapsedMs: number) => void,
): UseGameResult => {
  const [state, setState] = useState<GameState>(initialState);
  const [isDragging, setDragging] = useState(false);
  const completeFiredRef = useRef(false);

  // Reset whenever the puzzle changes.
  useEffect(() => {
    setState(initialState());
    setDragging(false);
    completeFiredRef.current = false;
  }, [puzzle]);

  const reset = useCallback(() => {
    setState(initialState());
    setDragging(false);
    completeFiredRef.current = false;
  }, []);

  const beginAt = useCallback(
    (cell: Coord) => {
      if (!puzzle) return;

      setState((prev) => {
        // Case 1: empty path — only the "1" cell starts it.
        if (prev.path.length === 0) {
          if (getNumberAt(puzzle, cell) !== 1) return prev;
          completeFiredRef.current = false;
          return { path: [cell], startedAt: Date.now(), completedAt: null };
        }

        // Case 2: touched a cell already on the path — truncate to (and
        // including) that cell so the user can pick up the drag from there.
        const idx = prev.path.findIndex((c) => eqCoord(c, cell));
        if (idx >= 0) {
          if (idx === prev.path.length - 1) return prev; // already head, no-op
          return { ...prev, path: prev.path.slice(0, idx + 1) };
        }

        // Case 3: touched a cell adjacent to the head — extend.
        if (canExtendTo(prev, puzzle, cell)) {
          return extend(prev, cell);
        }

        return prev;
      });
      setDragging(true);
    },
    [puzzle],
  );

  const moveTo = useCallback(
    (cell: Coord) => {
      if (!puzzle || !isDragging) return;
      setState((prev) => {
        // Same as tail? no-op.
        const tail = prev.path[prev.path.length - 1];
        if (tail && tail.row === cell.row && tail.col === cell.col) return prev;

        // Try to retract first.
        const retracted = tryRetract(prev, cell);
        if (retracted) return retracted;

        // Try to extend.
        if (canExtendTo(prev, puzzle, cell)) {
          return extend(prev, cell);
        }
        return prev;
      });
    },
    [puzzle, isDragging],
  );

  const endDrag = useCallback(() => {
    setDragging(false);
  }, []);

  // Fire completion callback once path fills and tail is the last number.
  useEffect(() => {
    if (!puzzle || completeFiredRef.current) return;
    if (isComplete(state, puzzle)) {
      completeFiredRef.current = true;
      const elapsed =
        state.startedAt != null ? Date.now() - state.startedAt : 0;
      setState((prev) => ({ ...prev, completedAt: Date.now() }));
      setDragging(false);
      onComplete?.(elapsed);
    }
  }, [state, puzzle, onComplete]);

  return { state, isDragging, beginAt, moveTo, endDrag, reset };
};
