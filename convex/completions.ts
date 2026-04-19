import { v } from "convex/values";
import { mutation } from "./_generated/server";

const perceivedDifficulty = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard"),
  v.literal("expert"),
);

export const record = mutation({
  args: {
    puzzleId: v.id("puzzles"),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("completions", {
      puzzleId: args.puzzleId,
      durationMs: args.durationMs,
      completedAt: Date.now(),
    });
    return id;
  },
});

export const setPerceivedDifficulty = mutation({
  args: {
    completionId: v.id("completions"),
    difficulty: perceivedDifficulty,
  },
  handler: async (ctx, { completionId, difficulty }) => {
    await ctx.db.patch(completionId, { perceivedDifficulty: difficulty });
  },
});
