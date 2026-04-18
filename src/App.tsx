import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Game } from "@/components/Game";
import { generatePuzzle } from "../convex/lib/generator";
import type { Puzzle } from "@/lib/types";
import { api } from "../convex/_generated/api";

const convexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

export const App = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 dark">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">zip</h1>
        <div className="text-xs text-muted-foreground">
          {convexConfigured ? "connected" : "offline mode"}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4">
        {convexConfigured ? <ConvexGame /> : <OfflineGame />}
      </main>
    </div>
  );
};

const ConvexGame = () => {
  const [token, setToken] = useState(() => Math.floor(Math.random() * 1e9));
  const result = useQuery(api.puzzles.getRandom, { seed: token });

  const handleNew = useCallback(
    () => setToken(Math.floor(Math.random() * 1e9)),
    [],
  );

  if (result === undefined) {
    return <Loading />;
  }
  if (result === null) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No puzzles in DB yet. Run{" "}
        <code className="rounded bg-neutral-900 px-1 py-0.5">
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

  return <Game key={result._id + ":" + token} puzzle={puzzle} onNewPuzzle={handleNew} />;
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

const Loading = () => {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      350,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <div className="py-16 text-center text-sm text-muted-foreground">
      loading puzzle{dots}
    </div>
  );
};
