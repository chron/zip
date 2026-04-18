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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solved!</DialogTitle>
          <DialogDescription>Nice path. Ready for another?</DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
          <div className="text-sm text-muted-foreground">Your time</div>
          <div className="font-mono text-4xl font-bold tracking-tight">
            {formatElapsed(elapsedMs)}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onPlayAgain} className="w-full">
            Play again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
