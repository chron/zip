import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Game } from "@/components/Game";
import { generatePuzzle } from "../convex/lib/generator";
import type { Puzzle } from "@/lib/types";
import { api } from "../convex/_generated/api";

const convexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

export const App = () => {
  return (
    <div className="min-h-screen text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-10">
        <h1 className="font-display text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] text-ink">
          <span className="relative inline-block">
            zip
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-[6px] w-full translate-y-[2px] rounded-full bg-tomato"
              style={{ clipPath: "polygon(0 40%, 100% 0, 100% 60%, 0 100%)" }}
            />
          </span>
        </h1>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {convexConfigured ? "connected" : "offline"}
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
