import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LoadingMessage } from "@/components/LoadingMessage";
import { api } from "../../convex/_generated/api";

const convexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

export const PuzzlesPage = () => {
  return convexConfigured ? <ConvexPuzzlesPage /> : <OfflinePuzzlesPage />;
};

const ConvexPuzzlesPage = () => {
  const puzzles = useQuery(api.puzzles.list);

  if (puzzles === undefined) {
    return <LoadingMessage label="loading archive" />;
  }

  return (
    <section className="mx-auto w-full max-w-5xl py-8">
      <div className="flex flex-col gap-3 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase text-tomato">Archive</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold leading-none text-ink sm:text-5xl">
            All puzzles
          </h2>
        </div>
        <Button asChild className="w-fit bg-ink text-paper hover:bg-ink/90">
          <Link to="/editor">Open editor</Link>
        </Button>
      </div>

      {puzzles.length === 0 ? (
        <div className="border-2 border-dashed border-ink/25 px-5 py-12 text-center text-sm text-muted-foreground">
          No puzzles yet. Seed the database, then they will land here.
        </div>
      ) : (
        <div className="overflow-x-auto border-y-2 border-ink">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink bg-paper-warm">
                <Th>Code</Th>
                <Th>Grid</Th>
                <Th>Numbers</Th>
                <Th>Walls</Th>
                <Th>Difficulty</Th>
                <Th>Created</Th>
                <Th>Mode</Th>
                <Th>
                  <span className="sr-only">Play</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {puzzles.map((puzzle) => (
                <tr
                  key={puzzle._id}
                  className="border-b border-ink/15 transition-colors hover:bg-paper-warm/60"
                >
                  <Td>
                    <Link
                      to="/puzzles/$shareId"
                      params={{ shareId: puzzle.shareId }}
                      className="font-mono text-sm font-semibold text-ultramarine underline-offset-4 hover:underline"
                    >
                      {puzzle.shareId}
                    </Link>
                  </Td>
                  <Td>
                    {puzzle.width}x{puzzle.height}
                  </Td>
                  <Td>{puzzle.numberCount}</Td>
                  <Td>{puzzle.wallCount}</Td>
                  <Td>{puzzle.difficulty ?? "unrated"}</Td>
                  <Td>{dateFormatter.format(puzzle.createdAt)}</Td>
                  <Td>{puzzle.mode}</Td>
                  <Td className="text-right">
                    <Button
                      asChild
                      size="sm"
                      className="bg-ink text-paper hover:bg-ink/90"
                    >
                      <Link
                        to="/puzzles/$shareId"
                        params={{ shareId: puzzle.shareId }}
                      >
                        Play
                      </Link>
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const OfflinePuzzlesPage = () => {
  return (
    <section className="mx-auto max-w-3xl py-16 text-center">
      <p className="font-mono text-xs uppercase text-tomato">Offline</p>
      <h2 className="mt-2 font-display text-4xl font-extrabold text-ink">
        Puzzle archive needs Convex
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
        Set VITE_CONVEX_URL and start Convex to browse saved puzzles.
      </p>
    </section>
  );
};

const Th = ({ children }: { children: ReactNode }) => (
  <th className="px-3 py-3 font-mono text-[11px] font-semibold uppercase text-ink">
    {children}
  </th>
);

const Td = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <td className={`px-3 py-3 text-sm text-ink ${className}`}>{children}</td>
);
