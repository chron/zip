import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Game } from "@/components/Game";
import { LoadingMessage } from "@/components/LoadingMessage";
import { Button } from "@/components/ui/button";
import { useCompletionActions } from "@/hooks/useCompletionActions";
import type { Puzzle } from "@/lib/types";
import { api } from "../../convex/_generated/api";

const convexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

type Props = {
  shareId: string;
};

export const PuzzlePage = ({ shareId }: Props) => {
  return convexConfigured ? (
    <ConvexPuzzlePage shareId={shareId} />
  ) : (
    <OfflinePuzzlePage />
  );
};

const ConvexPuzzlePage = ({ shareId }: Props) => {
  const [run, setRun] = useState(0);
  const result = useQuery(api.puzzles.getByShareId, { shareId });
  const { recordCompletion, setPerceivedDifficulty } = useCompletionActions(
    result?._id ?? null,
  );
  const handleReplay = useCallback(() => setRun((value) => value + 1), []);

  if (result === undefined) {
    return <LoadingMessage label="loading puzzle" />;
  }

  if (result === null) {
    return (
      <section className="mx-auto max-w-3xl py-16 text-center">
        <p className="font-mono text-xs uppercase text-tomato">Not found</p>
        <h2 className="mt-2 font-display text-4xl font-extrabold text-ink">
          No puzzle for {shareId}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Check the code, or pick another puzzle from the archive.
        </p>
        <Button asChild className="mt-6 bg-ink text-paper hover:bg-ink/90">
          <Link to="/puzzles">Open archive</Link>
        </Button>
      </section>
    );
  }

  const puzzle: Puzzle = {
    width: result.width,
    height: result.height,
    numbers: result.numbers,
    walls: result.walls,
  };

  return (
    <section className="flex flex-col items-center gap-3 py-4">
      <div className="flex w-full max-w-3xl flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/puzzles"
            className="font-mono text-xs uppercase text-ultramarine underline-offset-4 hover:underline"
          >
            Archive
          </Link>
          <h2 className="mt-2 font-display text-4xl font-extrabold leading-none text-ink">
            {result.shareId}
          </h2>
        </div>
        <div className="font-mono text-[10px] uppercase text-muted-foreground sm:text-right">
          <span>
            {result.width}x{result.height}
          </span>
          <span className="mx-2 text-ink/20">/</span>
          <span>{result.numberCount ?? result.numbers.length} numbers</span>
          {result.walls.length > 0 && (
            <>
              <span className="mx-2 text-ink/20">/</span>
              <span>{result.walls.length} walls</span>
            </>
          )}
          {result.difficulty && (
            <>
              <span className="mx-2 text-ink/20">/</span>
              <span>{result.difficulty}</span>
            </>
          )}
        </div>
      </div>

      <Game
        key={result._id + ":" + run}
        puzzle={puzzle}
        generatedDifficulty={result.difficulty ?? null}
        newPuzzleLabel="Replay"
        recordCompletion={recordCompletion}
        onSetPerceivedDifficulty={setPerceivedDifficulty}
        onNewPuzzle={handleReplay}
      />
    </section>
  );
};

const OfflinePuzzlePage = () => {
  return (
    <section className="mx-auto max-w-3xl py-16 text-center">
      <p className="font-mono text-xs uppercase text-tomato">Offline</p>
      <h2 className="mt-2 font-display text-4xl font-extrabold text-ink">
        Shared puzzles need Convex
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
        Set VITE_CONVEX_URL and start Convex to open saved puzzle codes.
      </p>
    </section>
  );
};
