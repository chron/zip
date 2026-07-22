import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Board } from "./Board";
import {
  CompleteDialog,
  type PerceivedDifficulty,
  type StreakSummary,
} from "./CompleteDialog";
import { Button } from "@/components/ui/button";
import { useGame } from "@/hooks/useGame";
import { formatElapsed, useElapsed } from "@/hooks/useTimer";
import { isComplete } from "@/lib/game";
import type { Direction } from "@/lib/game";
import type { Puzzle } from "@/lib/types";
import type { Id } from "../../convex/_generated/dataModel";

type Props = {
  puzzle: Puzzle;
  generatedDifficulty?: string | null;
  newPuzzleLabel?: string;
  streak?: StreakSummary | null;
  recordCompletion?: (
    durationMs: number,
  ) => Promise<Id<"completions"> | null>;
  onSetPerceivedDifficulty?: (
    completionId: Id<"completions">,
    difficulty: PerceivedDifficulty,
  ) => Promise<void>;
  onNewPuzzle: () => void;
};

const KEYBOARD_MOVE_INTERVAL_MS = 90;
const MAX_BUFFERED_MOVES = 16;

const arrowDirections: Partial<Record<string, Direction>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
};

export const Game = ({
  puzzle,
  generatedDifficulty,
  newPuzzleLabel = "New puzzle",
  streak,
  recordCompletion,
  onSetPerceivedDifficulty,
  onNewPuzzle,
}: Props) => {
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completionId, setCompletionId] = useState<Id<"completions"> | null>(
    null,
  );

  const handleComplete = useCallback(
    (elapsed: number) => {
      setFinalElapsed(elapsed);
      setDialogOpen(true);
      setCompletionId(null);
      if (recordCompletion) {
        recordCompletion(elapsed)
          .then((id) => setCompletionId(id))
          .catch(() => {
            // Non-fatal: the user still sees their time; we just won't be
            // able to attach a perceived-difficulty rating to this run.
          });
      }
    },
    [recordCompletion],
  );

  const { state, beginAt, moveTo, moveByKeyboard, endDrag, reset } = useGame(
    puzzle,
    handleComplete,
  );

  const keyboardBufferRef = useRef<Direction[]>([]);
  const keyboardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearKeyboardBuffer = useCallback(() => {
    keyboardBufferRef.current = [];
    if (keyboardTimerRef.current !== null) {
      clearInterval(keyboardTimerRef.current);
      keyboardTimerRef.current = null;
    }
  }, []);

  const enqueueKeyboardMove = useCallback(
    (direction: Direction) => {
      if (keyboardTimerRef.current === null) {
        moveByKeyboard(direction);
        keyboardTimerRef.current = setInterval(() => {
          const next = keyboardBufferRef.current.shift();
          if (next) {
            moveByKeyboard(next);
            return;
          }

          if (keyboardTimerRef.current !== null) {
            clearInterval(keyboardTimerRef.current);
            keyboardTimerRef.current = null;
          }
        }, KEYBOARD_MOVE_INTERVAL_MS);
        return;
      }

      if (keyboardBufferRef.current.length < MAX_BUFFERED_MOVES) {
        keyboardBufferRef.current.push(direction);
      }
    },
    [moveByKeyboard],
  );

  const elapsed = useElapsed(state.startedAt, state.completedAt);
  const done = isComplete(state, puzzle);
  const endNumber = useMemo(
    () => Math.max(...puzzle.numbers.map((n) => n.value)),
    [puzzle.numbers],
  );

  const handlePlayAgain = useCallback(() => {
    clearKeyboardBuffer();
    setDialogOpen(false);
    setFinalElapsed(null);
    setCompletionId(null);
    onNewPuzzle();
  }, [clearKeyboardBuffer, onNewPuzzle]);

  const handleReset = useCallback(() => {
    clearKeyboardBuffer();
    setDialogOpen(false);
    setFinalElapsed(null);
    setCompletionId(null);
    reset();
  }, [clearKeyboardBuffer, reset]);

  const handlePointerDownCell = useCallback(
    (cell: Parameters<typeof beginAt>[0]) => {
      clearKeyboardBuffer();
      beginAt(cell);
    },
    [beginAt, clearKeyboardBuffer],
  );

  useEffect(() => {
    if (done) {
      clearKeyboardBuffer();
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = arrowDirections[event.key];
      if (
        !direction ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      enqueueKeyboardMove(direction);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearKeyboardBuffer, done, enqueueKeyboardMove]);

  useEffect(() => clearKeyboardBuffer, [clearKeyboardBuffer, puzzle]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex w-full max-w-[min(90vw,520px)] items-center justify-between">
        <div className="font-mono text-[1.75rem] font-semibold tabular-nums text-ink">
          {formatElapsed(elapsed)}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="font-mono uppercase tracking-[0.12em] text-ink hover:bg-paper-warm"
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={onNewPuzzle}
            className="font-mono uppercase tracking-[0.12em] bg-ink text-paper hover:bg-ink/90"
          >
            {newPuzzleLabel}
          </Button>
        </div>
      </div>

      <Board
        puzzle={puzzle}
        path={state.path}
        isComplete={done}
        onPointerDownCell={handlePointerDownCell}
        onPointerEnterCell={moveTo}
        onPointerUp={endDrag}
      />

      <div className="text-sm text-muted-foreground">
        Drag from{" "}
        <span className="inline-grid h-5 w-5 place-items-center align-middle font-display text-[0.75rem] font-bold leading-none text-paper rounded-full bg-tomato">
          1
        </span>{" "}
        through{" "}
        <span className="inline-grid h-5 w-5 place-items-center align-middle font-display text-[0.75rem] font-bold leading-none text-paper rounded-full bg-tomato">
          {endNumber}
        </span>
        , or use the arrow keys. Visit numbers in order and fill every cell.
      </div>

      <CompleteDialog
        open={dialogOpen}
        elapsedMs={finalElapsed ?? 0}
        generatedDifficulty={generatedDifficulty ?? null}
        completionId={completionId}
        streak={streak}
        playAgainLabel={newPuzzleLabel}
        onSetPerceivedDifficulty={onSetPerceivedDifficulty}
        onPlayAgain={handlePlayAgain}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};
