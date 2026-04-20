import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const coord = v.object({
  row: v.number(),
  col: v.number(),
});

export default defineSchema({
  ...authTables,
  puzzles: defineTable({
    mode: v.string(),
    shareId: v.string(),
    width: v.number(),
    height: v.number(),
    numberCount: v.number(),
    numbers: v.array(
      v.object({
        row: v.number(),
        col: v.number(),
        value: v.number(),
      }),
    ),
    walls: v.array(
      v.object({
        a: coord,
        b: coord,
      }),
    ),
    difficulty: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_shareId", ["shareId"])
    .index("by_mode_createdAt", ["mode", "createdAt"]),
  // Schedules a puzzle to be "today's daily" for a given mode. The `puzzles`
  // table stays a reusable pool; this table is the assignment layer on top.
  dailyPuzzles: defineTable({
    date: v.string(), // YYYY-MM-DD in UTC
    mode: v.string(),
    puzzleId: v.id("puzzles"),
    assignedAt: v.number(),
    assignedBy: v.union(v.literal("auto"), v.literal("manual")),
  })
    .index("by_date_and_mode", ["date", "mode"])
    .index("by_mode_and_date", ["mode", "date"])
    .index("by_puzzleId", ["puzzleId"]),
  completions: defineTable({
    puzzleId: v.id("puzzles"),
    userId: v.optional(v.id("users")),
    durationMs: v.number(),
    perceivedDifficulty: v.optional(
      v.union(
        v.literal("easy"),
        v.literal("medium"),
        v.literal("hard"),
        v.literal("expert"),
      ),
    ),
    completedAt: v.number(),
  })
    .index("by_puzzleId", ["puzzleId"])
    .index("by_userId_and_completedAt", ["userId", "completedAt"])
    .index("by_completedAt", ["completedAt"]),
});
