import { useCallback, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Game } from "@/components/Game";
import { LoadingMessage } from "@/components/LoadingMessage";
import { useCompletionActions } from "@/hooks/useCompletionActions";
import { generatePuzzle } from "../../convex/lib/generator";
import type { Puzzle } from "@/lib/types";
import { api } from "../../convex/_generated/api";

const convexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

export const HomePage = () => {
  return convexConfigured ? <ConvexGame /> : <OfflineGame />;
};

const ConvexGame = () => {
  const [pick, setPick] = useState(() => ({
    seed: Math.floor(Math.random() * 1e9),
    before: Date.now(),
  }));
  const result = useQuery(api.puzzles.getRandom, pick);
  const { recordCompletion, setPerceivedDifficulty } = useCompletionActions(
    result?._id ?? null,
  );

  const handleNew = useCallback(
    () =>
      setPick({
        seed: Math.floor(Math.random() * 1e9),
        before: Date.now(),
      }),
    [],
  );

  if (result === undefined) {
    return <LoadingMessage label="loading puzzle" />;
  }
  if (result === null) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No puzzles in DB yet. Run{" "}
        <code className="rounded bg-paper-warm px-1 py-0.5 font-mono text-ink">
          bun run scripts/seed.ts
        </code>{" "}
        to generate some.
      </div>
    );
  }

  const puzzle: Puzzle = {
    width: result.width,
    height: result.height,
    numbers: result.numbers,
    walls: result.walls,
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">
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
        <span className="mx-2 text-ink/20">/</span>
        <span className="text-ink/60">{result.shareId}</span>
      </div>
      <Game
        key={result._id + ":" + pick.seed}
        puzzle={puzzle}
        generatedDifficulty={result.difficulty ?? null}
        recordCompletion={recordCompletion}
        onSetPerceivedDifficulty={setPerceivedDifficulty}
        onNewPuzzle={handleNew}
      />
    </div>
  );
};

// Fallback that generates locally so the game is playable before Convex is wired up.
const OfflineGame = () => {
  const [seed, setSeed] = useState(0);
  const puzzle = useMemo<Puzzle>(
    () => generatePuzzle({ width: 5, height: 5, numberCount: 4 }),
    [seed],
  );
  const onNew = useCallback(() => setSeed((s) => s + 1), []);

  return <Game key={seed} puzzle={puzzle} onNewPuzzle={onNew} />;
};
