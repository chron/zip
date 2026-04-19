import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { PerceivedDifficulty } from "@/components/CompleteDialog";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const useCompletionActions = (puzzleId: Id<"puzzles"> | null) => {
  const recordCompletionMutation = useMutation(api.completions.record);
  const setPerceivedDifficultyMutation = useMutation(
    api.completions.setPerceivedDifficulty,
  );

  const recordCompletion = useCallback(
    async (durationMs: number) => {
      if (!puzzleId) return null;
      return await recordCompletionMutation({ puzzleId, durationMs });
    },
    [puzzleId, recordCompletionMutation],
  );

  const setPerceivedDifficulty = useCallback(
    async (
      completionId: Id<"completions">,
      difficulty: PerceivedDifficulty,
    ) => {
      await setPerceivedDifficultyMutation({ completionId, difficulty });
    },
    [setPerceivedDifficultyMutation],
  );

  return { recordCompletion, setPerceivedDifficulty };
};
