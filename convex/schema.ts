import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const coord = v.object({
  row: v.number(),
  col: v.number(),
});

export default defineSchema({
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
});
