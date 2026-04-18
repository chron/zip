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

type Props = {
  open: boolean;
  elapsedMs: number;
  onPlayAgain: () => void;
  onOpenChange: (open: boolean) => void;
};

export const CompleteDialog = ({
  open,
  elapsedMs,
  onPlayAgain,
  onOpenChange,
}: Props) => {
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
        </div>
        <DialogFooter>
          <Button
            onClick={onPlayAgain}
            className="w-full font-mono uppercase tracking-[0.12em] bg-ink text-paper hover:bg-ink/90"
          >
            Play again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
