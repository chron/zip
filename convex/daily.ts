import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
  query,
} from "./_generated/server";

const DEFAULT_MODE = "classic";

// UTC date in YYYY-MM-DD. Daily rollover is at 00:00 UTC globally, so the
// client doesn't need to pass a date — the server resolves it from `now`.
function utcDateString(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export const today = query({
  args: { mode: v.optional(v.string()) },
  handler: async (ctx, { mode }) => {
    const targetMode = mode ?? DEFAULT_MODE;
    const date = utcDateString(Date.now());
    return await ctx.db
      .query("dailyPuzzles")
      .withIndex("by_date_and_mode", (q) =>
        q.eq("date", date).eq("mode", targetMode),
      )
      .unique();
  },
});

// Joined read for the home-page loader: today's daily plus its puzzle row.
// Returns null when no assignment exists yet — the client follows up with
// `ensureToday` to create one.
export const todayWithPuzzle = query({
  args: { mode: v.optional(v.string()) },
  handler: async (ctx, { mode }) => {
    const targetMode = mode ?? DEFAULT_MODE;
    const date = utcDateString(Date.now());
    const daily = await ctx.db
      .query("dailyPuzzles")
      .withIndex("by_date_and_mode", (q) =>
        q.eq("date", date).eq("mode", targetMode),
      )
      .unique();
    if (!daily) return null;
    const puzzle = await ctx.db.get(daily.puzzleId);
    if (!puzzle) return null;
    return { daily, puzzle };
  },
});

async function findOldestUnscheduledPuzzle(
  ctx: MutationCtx,
  mode: string,
): Promise<Doc<"puzzles"> | null> {
  // Iterate puzzles in creation order and return the first one without a
  // `dailyPuzzles` row. Short-circuits on the first hit, so the common case
  // (plenty of unscheduled puzzles ahead of scheduled ones) is cheap. If the
  // pool ever fills up with scheduled-only puzzles we can switch to a denorm
  // flag on the puzzle itself.
  for await (const puzzle of ctx.db
    .query("puzzles")
    .withIndex("by_mode_createdAt", (q) => q.eq("mode", mode))
    .order("asc")) {
    const scheduled = await ctx.db
      .query("dailyPuzzles")
      .withIndex("by_puzzleId", (q) => q.eq("puzzleId", puzzle._id))
      .first();
    if (!scheduled) return puzzle;
  }
  return null;
}

// Idempotently ensure today's daily exists for a mode. Safe to call from the
// homepage loader — if the row is already there we just return it.
export const ensureToday = mutation({
  args: { mode: v.optional(v.string()) },
  handler: async (ctx, { mode }) => {
    const targetMode = mode ?? DEFAULT_MODE;
    const date = utcDateString(Date.now());

    const existing = await ctx.db
      .query("dailyPuzzles")
      .withIndex("by_date_and_mode", (q) =>
        q.eq("date", date).eq("mode", targetMode),
      )
      .unique();
    if (existing) return existing;

    const puzzle = await findOldestUnscheduledPuzzle(ctx, targetMode);
    if (!puzzle) {
      // TODO(#1): generate + persist a fresh puzzle here when the pool is
      // empty. Blocked on moving generation off the client (current generator
      // lives in the browser — see convex/puzzles.ts:17).
      throw new Error(
        `No unscheduled puzzles left for mode "${targetMode}" — cannot assign daily for ${date}.`,
      );
    }

    const id = await ctx.db.insert("dailyPuzzles", {
      date,
      mode: targetMode,
      puzzleId: puzzle._id,
      assignedAt: Date.now(),
      assignedBy: "auto",
    });
    const inserted = await ctx.db.get(id);
    if (!inserted) throw new Error("Daily assignment disappeared post-insert");
    return inserted;
  },
});

// Admin override — upserts a manual assignment for a given date + mode.
// Exposed as `internalMutation` so it's only callable from the Convex
// dashboard or a trusted server-side caller, not the public client API.
export const setManual = internalMutation({
  args: {
    date: v.string(),
    mode: v.optional(v.string()),
    puzzleId: v.id("puzzles"),
  },
  handler: async (ctx, { date, mode, puzzleId }) => {
    const targetMode = mode ?? DEFAULT_MODE;
    const puzzle = await ctx.db.get(puzzleId);
    if (!puzzle) throw new Error(`Puzzle ${puzzleId} does not exist`);
    if (puzzle.mode !== targetMode) {
      throw new Error(
        `Puzzle mode "${puzzle.mode}" does not match target mode "${targetMode}"`,
      );
    }

    const existing = await ctx.db
      .query("dailyPuzzles")
      .withIndex("by_date_and_mode", (q) =>
        q.eq("date", date).eq("mode", targetMode),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        puzzleId,
        assignedAt: Date.now(),
        assignedBy: "manual",
      });
      const updated = await ctx.db.get(existing._id);
      if (!updated) throw new Error("Daily assignment disappeared post-patch");
      return updated;
    }

    const id = await ctx.db.insert("dailyPuzzles", {
      date,
      mode: targetMode,
      puzzleId,
      assignedAt: Date.now(),
      assignedBy: "manual",
    });
    const inserted = await ctx.db.get(id);
    if (!inserted) throw new Error("Daily assignment disappeared post-insert");
    return inserted;
  },
});
