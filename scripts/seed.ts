// Run with: bun run scripts/seed.ts
// Requires VITE_CONVEX_URL in .env.local (set automatically by `bunx convex dev`).
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const url = process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL;
if (!url) {
  console.error(
    "Missing VITE_CONVEX_URL. Run `bunx convex dev` once to create .env.local, then retry.",
  );
  process.exit(1);
}

const client = new ConvexHttpClient(url);
const count = Number(process.argv[2] ?? 50);

console.log(`Seeding ${count} puzzles to ${url}...`);
const ids = await client.mutation(api.puzzles.seed, { count });
console.log(`Inserted ${ids.length} puzzles.`);
