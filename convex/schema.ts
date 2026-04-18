import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const coord = v.object({
  row: v.number(),
  col: v.number(),
});

export default defineSchema({
  puzzles: defineTable({
    width: v.number(),
    height: v.number(),
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
  }).index("by_createdAt", ["createdAt"]),
});
