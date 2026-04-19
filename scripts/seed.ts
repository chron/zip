// Run with:
//   bun run scripts/seed.ts                           # varied default mix
//   bun run scripts/seed.ts <count>                   # N with default 5x5 classic
//   bun run scripts/seed.ts <count> <w> <h> <nums> <wallDensity>
//   bun run scripts/seed.ts --wipe [...]              # clear the table first
//
// Requires VITE_CONVEX_URL in .env.local (set automatically by `bunx convex dev`).
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { generatePuzzle } from "../convex/lib/generator";

const url = process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL;
if (!url) {
  console.error(
    "Missing VITE_CONVEX_URL. Run `bunx convex dev` once to create .env.local, then retry.",
  );
  process.exit(1);
}

const client = new ConvexHttpClient(url);

type Recipe = {
  width: number;
  height: number;
  numberCount: number;
  wallDensity: number;
  count: number;
  difficulty: string;
};

// Default seeding produces a spread of sizes, number counts, and wall densities
// so the random-puzzle UI shows meaningful variety without extra flags.
const defaultMix: Recipe[] = [
  { width: 5, height: 5, numberCount: 4, wallDensity: 0, count: 8, difficulty: "easy" },
  { width: 5, height: 5, numberCount: 5, wallDensity: 0.2, count: 8, difficulty: "easy" },
  { width: 6, height: 6, numberCount: 5, wallDensity: 0.1, count: 8, difficulty: "medium" },
  { width: 6, height: 6, numberCount: 6, wallDensity: 0.25, count: 8, difficulty: "medium" },
  { width: 7, height: 7, numberCount: 6, wallDensity: 0.15, count: 6, difficulty: "hard" },
  { width: 7, height: 7, numberCount: 7, wallDensity: 0.3, count: 6, difficulty: "hard" },
];

const rawArgs = process.argv.slice(2);
const wipe = rawArgs.includes("--wipe");
const args = rawArgs.filter((a) => a !== "--wipe");

if (wipe) {
  process.stdout.write("Wiping existing puzzles...");
  let total = 0;
  while (true) {
    const removed = await client.mutation(api.puzzles.deleteBatch, {});
    total += removed;
    if (removed === 0) break;
    process.stdout.write(".");
  }
  console.log(` ${total} removed.`);
}

const recipes: Recipe[] = (() => {
  if (args.length === 0) return defaultMix;
  const count = Number(args[0] ?? 50);
  if (args.length === 1) {
    return [{ width: 5, height: 5, numberCount: 4, wallDensity: 0, count, difficulty: "easy" }];
  }
  return [
    {
      count,
      width: Number(args[1]),
      height: Number(args[2]),
      numberCount: Number(args[3]),
      wallDensity: Number(args[4] ?? 0),
      difficulty: "custom",
    },
  ];
})();

const total = recipes.reduce((n, r) => n + r.count, 0);
console.log(`Seeding ${total} puzzles to ${url}...`);

const shareIds: string[] = [];
let done = 0;
for (const recipe of recipes) {
  console.log(
    `  ${recipe.count}× ${recipe.width}x${recipe.height}, ${recipe.numberCount} numbers, floor=${recipe.wallDensity} (${recipe.difficulty})`,
  );
  const recipeStart = performance.now();
  let wallSum = 0;
  for (let i = 0; i < recipe.count; i++) {
    const puzzle = generatePuzzle({
      width: recipe.width,
      height: recipe.height,
      numberCount: recipe.numberCount,
      wallDensity: recipe.wallDensity,
    });
    wallSum += puzzle.walls.length;
    const res = await client.mutation(api.puzzles.create, {
      width: puzzle.width,
      height: puzzle.height,
      numberCount: recipe.numberCount,
      numbers: puzzle.numbers,
      walls: puzzle.walls,
      difficulty: recipe.difficulty,
    });
    shareIds.push(res.shareId);
    done++;
  }
  const ms = Math.round(performance.now() - recipeStart);
  const avgWalls = (wallSum / recipe.count).toFixed(1);
  console.log(`     → ${ms}ms total, avg ${avgWalls} walls/puzzle`);
}

console.log(
  `Done. ${done} puzzles. First few share ids: ${shareIds.slice(0, 3).join(", ")}`,
);
