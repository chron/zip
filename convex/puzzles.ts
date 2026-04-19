import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generateShareId } from "./lib/shareId";

const DEFAULT_MODE = "classic";

const coord = v.object({ row: v.number(), col: v.number() });
const numbered = v.object({
  row: v.number(),
  col: v.number(),
  value: v.number(),
});
const wall = v.object({ a: coord, b: coord });

// Persists a pre-generated puzzle. Generation runs client-side (pure compute)
// so we don't consume the 1s mutation budget on DFS work.
export const create = mutation({
  args: {
    mode: v.optional(v.string()),
    width: v.number(),
    height: v.number(),
    numberCount: v.number(),
    numbers: v.array(numbered),
    walls: v.array(wall),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mode = args.mode ?? DEFAULT_MODE;

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
      width: args.width,
      height: args.height,
      numberCount: args.numberCount,
      numbers: args.numbers,
      walls: args.walls,
      difficulty: args.difficulty,
      createdAt: Date.now(),
    });

    return { id, shareId };
  },
});

export const getRandom = query({
  // `seed` picks the puzzle deterministically so a re-run of this subscription
  // returns the same row. `before` bounds the read set to puzzles that existed
  // when the subscription started, so new inserts don't invalidate it.
  args: {
    seed: v.number(),
    mode: v.optional(v.string()),
    before: v.number(),
  },
  handler: async (ctx, { seed, mode, before }) => {
    const targetMode = mode ?? DEFAULT_MODE;
    const all = await ctx.db
      .query("puzzles")
      .withIndex("by_mode_createdAt", (q) =>
        q.eq("mode", targetMode).lte("createdAt", before),
      )
      .collect();
    if (all.length === 0) return null;
    return all[Math.abs(seed) % all.length]!;
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

// Deletes up to `batchSize` puzzles and returns how many were removed.
// Convex mutations are capped at 1s, so a wipe of a large table needs the
// client to loop this until it returns 0.
export const deleteBatch = mutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, { batchSize }) => {
    const limit = batchSize ?? 100;
    const rows = await ctx.db.query("puzzles").take(limit);
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return rows.length;
  },
});
