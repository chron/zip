import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { Game } from "@/components/Game";
import { LoadingMessage } from "@/components/LoadingMessage";
import { useCompletionActions } from "@/hooks/useCompletionActions";
import { generatePuzzle } from "../../convex/lib/generator";
import type { Puzzle } from "@/lib/types";
import { api } from "../../convex/_generated/api";

const convexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

export const HomePage = () => {
  return convexConfigured ? <DailyGame /> : <OfflineGame />;
};

// Human-friendly label for the daily header (e.g. "Mon 20 Apr").
const formatDailyLabel = (ymd: string): string => {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

const DailyGame = () => {
  const navigate = useNavigate();
  const today = useQuery(api.daily.todayWithPuzzle, {});
  const streak = useQuery(api.streaks.mine, {});
  const ensureToday = useMutation(api.daily.ensureToday);
  const [ensureError, setEnsureError] = useState<string | null>(null);

  // Kick off auto-assignment when there's no row yet. Idempotent on the
  // server, so the pending subscription picks up the insert and flips
  // `today` non-null.
  useEffect(() => {
    if (today !== null) return;
    let cancelled = false;
    ensureToday({})
      .then(() => {
        if (!cancelled) setEnsureError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setEnsureError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [today, ensureToday]);

  const puzzleId = today?.puzzle._id ?? null;
  const { recordCompletion, setPerceivedDifficulty } =
    useCompletionActions(puzzleId);

  const handleOpenArchive = useCallback(() => {
    navigate({ to: "/puzzles" });
  }, [navigate]);

  if (today === undefined) {
    return <LoadingMessage label="loading today's puzzle" />;
  }

  if (today === null) {
    if (ensureError) {
      return (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Couldn't set up today's puzzle: {ensureError}
        </div>
      );
    }
    return <LoadingMessage label="picking today's puzzle" />;
  }

  const { daily, puzzle: puzzleRow } = today;
  const puzzle: Puzzle = {
    width: puzzleRow.width,
    height: puzzleRow.height,
    numbers: puzzleRow.numbers,
    walls: puzzleRow.walls,
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">
        <span>{formatDailyLabel(daily.date)}</span>
        <span className="mx-2 text-ink/20">/</span>
        <span>
          {puzzleRow.width}x{puzzleRow.height}
        </span>
        <span className="mx-2 text-ink/20">/</span>
        <span>{puzzleRow.numberCount ?? puzzleRow.numbers.length} numbers</span>
        {puzzleRow.walls.length > 0 && (
          <>
            <span className="mx-2 text-ink/20">/</span>
            <span>{puzzleRow.walls.length} walls</span>
          </>
        )}
        {streak && streak.current > 0 && (
          <>
            <span className="mx-2 text-ink/20">/</span>
            <span className="text-tomato">streak {streak.current}</span>
          </>
        )}
      </div>
      <Game
        key={puzzleRow._id}
        puzzle={puzzle}
        generatedDifficulty={puzzleRow.difficulty ?? null}
        newPuzzleLabel="Archive"
        streak={streak}
        recordCompletion={recordCompletion}
        onSetPerceivedDifficulty={setPerceivedDifficulty}
        onNewPuzzle={handleOpenArchive}
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
