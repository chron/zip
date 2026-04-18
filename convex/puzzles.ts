import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generatePuzzle } from "./lib/generator";

const coord = v.object({ row: v.number(), col: v.number() });
const numbered = v.object({
  row: v.number(),
  col: v.number(),
  value: v.number(),
});
const wall = v.object({ a: coord, b: coord });

export const getRandom = query({
  // `seed` is an opaque client-provided nonce so useQuery treats each call
  // as a new subscription when the user clicks "new puzzle".
  args: { seed: v.optional(v.number()) },
  handler: async (ctx) => {
    const all = await ctx.db.query("puzzles").collect();
    if (all.length === 0) return null;
    const pick = all[Math.floor(Math.random() * all.length)]!;
    return pick;
  },
});

export const getById = query({
  args: { id: v.id("puzzles") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const insertMany = mutation({
  args: {
    puzzles: v.array(
      v.object({
        width: v.number(),
        height: v.number(),
        numbers: v.array(numbered),
        walls: v.array(wall),
        difficulty: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { puzzles }) => {
    const now = Date.now();
    const ids = [];
    for (const p of puzzles) {
      ids.push(await ctx.db.insert("puzzles", { ...p, createdAt: now }));
    }
    return ids;
  },
});

// Convenience: generate and insert N puzzles server-side in one call.
export const seed = mutation({
  args: { count: v.number() },
  handler: async (ctx, { count }) => {
    const now = Date.now();
    const ids = [];
    for (let i = 0; i < count; i++) {
      const p = generatePuzzle({ width: 5, height: 5, numberCount: 4 });
      ids.push(
        await ctx.db.insert("puzzles", {
          ...p,
          difficulty: "easy",
          createdAt: now,
        }),
      );
    }
    return ids;
  },
});
