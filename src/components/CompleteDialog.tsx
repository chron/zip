import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatElapsed } from "@/hooks/useTimer";
import type { Id } from "../../convex/_generated/dataModel";

export type PerceivedDifficulty = "easy" | "medium" | "hard" | "expert";

const OPTIONS: PerceivedDifficulty[] = ["easy", "medium", "hard", "expert"];

export type StreakSummary = {
  current: number;
  longest: number;
};

type Props = {
  open: boolean;
  elapsedMs: number;
  generatedDifficulty: string | null;
  completionId: Id<"completions"> | null;
  streak?: StreakSummary | null;
  playAgainLabel?: string;
  onSetPerceivedDifficulty?: (
    completionId: Id<"completions">,
    difficulty: PerceivedDifficulty,
  ) => Promise<void>;
  onPlayAgain: () => void;
  onOpenChange: (open: boolean) => void;
};

export const CompleteDialog = ({
  open,
  elapsedMs,
  generatedDifficulty,
  completionId,
  streak,
  playAgainLabel = "Play again",
  onSetPerceivedDifficulty,
  onPlayAgain,
  onOpenChange,
}: Props) => {
  const [picked, setPicked] = useState<PerceivedDifficulty | null>(null);

  // Reset the picker each time a new completion opens the dialog.
  useEffect(() => {
    if (open) setPicked(null);
  }, [open, completionId]);

  const handlePick = (value: PerceivedDifficulty) => {
    setPicked(value);
    if (completionId && onSetPerceivedDifficulty) {
      onSetPerceivedDifficulty(completionId, value).catch(() => {
        // Non-fatal — revert the local selection so the user can retry.
        setPicked(null);
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-ink bg-paper text-ink">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-extrabold tracking-[-0.02em]">
            <span className="text-tomato">Zipped.</span>
          </DialogTitle>
          <DialogDescription className="text-ink/70">
            Nice path. Ready for another?
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/60">
            your time
          </div>
          <div className="mt-1 font-mono text-5xl font-bold tabular-nums text-ink">
            {formatElapsed(elapsedMs)}
          </div>
          {generatedDifficulty && (
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">
              generator: {generatedDifficulty}
            </div>
          )}
        </div>

        {streak && (
          <div className="flex items-center justify-center gap-6 pb-2 text-center">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">
                streak
              </div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-tomato">
                {streak.current}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">
                longest
              </div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">
                {streak.longest}
              </div>
            </div>
          </div>
        )}

        {completionId && onSetPerceivedDifficulty && (
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">
              how did that feel?
            </div>
            <div className="flex gap-1">
              {OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handlePick(opt)}
                  className={`rounded border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
                    picked === opt
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/20 bg-paper text-ink hover:border-ink/60"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={onPlayAgain}
            className="w-full font-mono uppercase tracking-[0.12em] bg-ink text-paper hover:bg-ink/90"
          >
            {playAgainLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
