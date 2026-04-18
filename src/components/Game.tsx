import { useCallback, useState } from "react";
import { Board } from "./Board";
import { CompleteDialog } from "./CompleteDialog";
import { Button } from "@/components/ui/button";
import { useGame } from "@/hooks/useGame";
import { formatElapsed, useElapsed } from "@/hooks/useTimer";
import { isComplete } from "@/lib/game";
import type { Puzzle } from "@/lib/types";

type Props = {
  puzzle: Puzzle;
  onNewPuzzle: () => void;
};

export const Game = ({ puzzle, onNewPuzzle }: Props) => {
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleComplete = useCallback((elapsed: number) => {
    setFinalElapsed(elapsed);
    setDialogOpen(true);
  }, []);

  const { state, beginAt, moveTo, endDrag, reset } = useGame(
    puzzle,
    handleComplete,
  );

  const elapsed = useElapsed(state.startedAt, state.completedAt);
  const done = isComplete(state, puzzle);

  const handlePlayAgain = useCallback(() => {
    setDialogOpen(false);
    setFinalElapsed(null);
    onNewPuzzle();
  }, [onNewPuzzle]);

  const handleReset = useCallback(() => {
    setDialogOpen(false);
    setFinalElapsed(null);
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
            New puzzle
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
        <span className="inline-flex h-5 w-5 translate-y-[3px] items-center justify-center rounded-full bg-tomato font-display text-[0.75rem] font-bold text-paper">
          1
        </span>{" "}
        through every cell, visiting numbers in order.
      </div>

      <CompleteDialog
        open={dialogOpen}
        elapsedMs={finalElapsed ?? 0}
        onPlayAgain={handlePlayAgain}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};
