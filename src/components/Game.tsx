import { useCallback, useMemo, useState } from "react";
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

  const { state, beginAt, moveTo, endDrag, reset } = useGame(
    puzzle,
    handleComplete,
  );

  const elapsed = useElapsed(state.startedAt, state.completedAt);
  const done = isComplete(state, puzzle);
  const endNumber = useMemo(
    () => Math.max(...puzzle.numbers.map((n) => n.value)),
    [puzzle.numbers],
  );

  const handlePlayAgain = useCallback(() => {
    setDialogOpen(false);
    setFinalElapsed(null);
    setCompletionId(null);
    onNewPuzzle();
  }, [onNewPuzzle]);

  const handleReset = useCallback(() => {
    setDialogOpen(false);
    setFinalElapsed(null);
    setCompletionId(null);
    reset();
  }, [reset]);

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
        onPointerDownCell={beginAt}
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
        , visiting numbers in order, filling every cell.
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
