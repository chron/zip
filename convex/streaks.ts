import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";

const DEFAULT_MODE = "classic";
const DAY_MS = 86_400_000;

function utcDateString(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function shiftDay(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date string: ${ymd}`);
  return utcDateString(Date.UTC(y, m - 1, d) + deltaDays * DAY_MS);
}

// Build the set of UTC days on which the user solved that day's scheduled
// daily puzzle for the given mode. Archive replays (solving a past daily on
// a later day) don't count — the completion day must match the daily's
// scheduled date.
async function collectSolvedDailyDays(
  ctx: QueryCtx,
  userId: Id<"users">,
  mode: string,
): Promise<Set<string>> {
  const dates = new Set<string>();
  for await (const completion of ctx.db
    .query("completions")
    .withIndex("by_userId_and_completedAt", (q) => q.eq("userId", userId))) {
    const completionDay = utcDateString(completion.completedAt);
    // One puzzle could in principle be scheduled to multiple dates; accept a
    // match on any of them.
    for await (const scheduled of ctx.db
      .query("dailyPuzzles")
      .withIndex("by_puzzleId", (q) => q.eq("puzzleId", completion.puzzleId))) {
      if (scheduled.mode === mode && scheduled.date === completionDay) {
        dates.add(completionDay);
        break;
      }
    }
  }
  return dates;
}

function currentStreak(dates: Set<string>, today: string): number {
  // Wordle-style: today's unsolved doesn't break the streak until a full day
  // passes without a solve. Start counting from today if solved, otherwise
  // yesterday if solved, otherwise the streak is 0.
  let cursor: string | null = null;
  if (dates.has(today)) cursor = today;
  else if (dates.has(shiftDay(today, -1))) cursor = shiftDay(today, -1);
  if (!cursor) return 0;

  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

function longestStreak(dates: Set<string>): number {
  if (dates.size === 0) return 0;
  const sorted = [...dates].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === shiftDay(sorted[i - 1]!, 1)) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }
  return longest;
}

// Returns current + longest streak for the authenticated user. Returns null
// when signed out — UI uses that signal to prompt sign-in rather than
// rendering a zero. Anonymous-streaks support is deferred until device-ID
// work lands (#8 / #11).
export const mine = query({
  args: { mode: v.optional(v.string()) },
  handler: async (ctx, { mode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const targetMode = mode ?? DEFAULT_MODE;
    const dates = await collectSolvedDailyDays(ctx, userId, targetMode);
    const today = utcDateString(Date.now());
    return {
      current: currentStreak(dates, today),
      longest: longestStreak(dates),
    };
  },
});
