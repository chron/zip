import { getAuthUserId } from "@convex-dev/auth/server";
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
    const userId = await getAuthUserId(ctx);
    const id = await ctx.db.insert("completions", {
      puzzleId: args.puzzleId,
      userId: userId ?? undefined,
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
    const completion = await ctx.db.get(completionId);
    if (!completion) throw new Error("Completion not found");

    const userId = await getAuthUserId(ctx);
    if (completion.userId && completion.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(completionId, { perceivedDifficulty: difficulty });
  },
});
