import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generatePuzzle } from "./lib/generator";
import { generateShareId } from "./lib/shareId";

const DEFAULT_MODE = "classic";

export const generate = mutation({
  args: {
    mode: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    numberCount: v.optional(v.number()),
    wallDensity: v.optional(v.number()),
    seed: v.optional(v.number()),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = args.mode ?? DEFAULT_MODE;
    const width = args.width ?? 5;
    const height = args.height ?? 5;
    const numberCount = args.numberCount ?? 4;
    const wallDensity = args.wallDensity ?? 0;

    const puzzle = generatePuzzle({
      width,
      height,
      numberCount,
      wallDensity,
      seed: args.seed,
    });

    // Collision-retry on shareId. 10 chars of a 56-char alphabet gives
    // astronomical headroom, but the retry is cheap insurance.
    let shareId = generateShareId();
    for (let i = 0; i < 5; i++) {
      const existing = await ctx.db
        .query("puzzles")
        .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
        .first();
      if (!existing) break;
      shareId = generateShareId();
    }

    const id = await ctx.db.insert("puzzles", {
      mode,
      shareId,
      width: puzzle.width,
      height: puzzle.height,
      numberCount,
      numbers: puzzle.numbers,
      walls: puzzle.walls,
      difficulty: args.difficulty,
      createdAt: Date.now(),
    });

    return { id, shareId, seed: puzzle.seed };
  },
});

export const getRandom = query({
  // `seed` is an opaque client-provided nonce so useQuery treats each call
  // as a new subscription when the user clicks "new puzzle".
  args: { seed: v.optional(v.number()), mode: v.optional(v.string()) },
  handler: async (ctx, { mode }) => {
    const targetMode = mode ?? DEFAULT_MODE;
    const all = await ctx.db
      .query("puzzles")
      .withIndex("by_mode_createdAt", (q) => q.eq("mode", targetMode))
      .collect();
    if (all.length === 0) return null;
    return all[Math.floor(Math.random() * all.length)]!;
  },
});

export const getById = query({
  args: { id: v.id("puzzles") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getByShareId = query({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) => {
    return await ctx.db
      .query("puzzles")
      .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
      .first();
  },
});

// Convenience: generate and insert N puzzles in one call for dev seeding.
export const seed = mutation({
  args: {
    count: v.number(),
    mode: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    numberCount: v.optional(v.number()),
    wallDensity: v.optional(v.number()),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = args.mode ?? DEFAULT_MODE;
    const width = args.width ?? 5;
    const height = args.height ?? 5;
    const numberCount = args.numberCount ?? 4;
    const wallDensity = args.wallDensity ?? 0;
    const difficulty = args.difficulty ?? "easy";
    const now = Date.now();
    const ids: unknown[] = [];

    for (let i = 0; i < args.count; i++) {
      const puzzle = generatePuzzle({ width, height, numberCount, wallDensity });
      let shareId = generateShareId();
      for (let j = 0; j < 5; j++) {
        const existing = await ctx.db
          .query("puzzles")
          .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
          .first();
        if (!existing) break;
        shareId = generateShareId();
      }
      ids.push(
        await ctx.db.insert("puzzles", {
          mode,
          shareId,
          width: puzzle.width,
          height: puzzle.height,
          numberCount,
          numbers: puzzle.numbers,
          walls: puzzle.walls,
          difficulty,
          createdAt: now,
        }),
      );
    }
    return ids;
  },
});
