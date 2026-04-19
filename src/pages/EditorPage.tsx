import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const EditorPage = () => {
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <div className="pt-4">
        <p className="font-mono text-xs uppercase text-tomato">Editor</p>
        <h2 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-none text-ink sm:text-5xl">
          Build tools land here next.
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-7 text-ink/75">
          First pass: choose a grid, place the numbered stops, draw walls, and
          playtest before saving.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild className="bg-ink text-paper hover:bg-ink/90">
            <Link to="/puzzles">Browse puzzles</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-ink/30 bg-paper hover:bg-paper-warm"
          >
            <Link to="/">Play random</Link>
          </Button>
        </div>
      </div>

      <div className="border-2 border-ink bg-paper-warm p-4">
        <div className="grid aspect-square grid-cols-5 border-2 border-ink bg-[#FBF5E6]">
          {Array.from({ length: 25 }, (_, index) => {
            const isStop =
              index === 1 || index === 8 || index === 16 || index === 23;
            const stopNumber =
              index === 1 ? 1 : index === 8 ? 2 : index === 16 ? 3 : 4;

            return (
              <div
                key={index}
                className="relative border border-ink/15"
                aria-hidden="true"
              >
                {isStop && (
                  <div className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-tomato font-display text-lg font-extrabold text-paper">
                    {stopNumber}
                  </div>
                )}
                {(index === 6 || index === 7 || index === 12) && (
                  <div className="absolute right-[-3px] top-0 h-full w-[6px] rounded-full bg-ink" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <StubControl label="Grid" value="5 x 5" />
          <StubControl label="Stops" value="4" />
          <StubControl label="Walls" value="3" />
          <StubControl label="Save" value="Coming next" />
        </div>
      </div>
    </section>
  );
};

const StubControl = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border border-ink/25 bg-paper px-3 py-2">
    <span className="font-mono text-[11px] uppercase text-ink/60">{label}</span>
    <span className="text-sm font-semibold text-ink">{value}</span>
  </div>
);
