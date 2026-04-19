import type { Wall } from "@/lib/types";

type Props = {
  walls: Wall[];
  cellSize: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
};

type WallRun =
  | {
      kind: "vertical";
      col: number;
      rowStart: number;
      rowEnd: number;
    }
  | {
      kind: "horizontal";
      row: number;
      colStart: number;
      colEnd: number;
    };

export const WallLayer = ({
  walls,
  cellSize,
  stroke = "var(--ink)",
  strokeWidth = 6,
  className,
}: Props) => {
  const runs = buildWallRuns(walls);

  return (
    <g className={className} pointerEvents="none">
      {runs.map((run) => {
        const key =
          run.kind === "vertical"
            ? `v-${run.col}-${run.rowStart}-${run.rowEnd}`
            : `h-${run.row}-${run.colStart}-${run.colEnd}`;

        if (run.kind === "vertical") {
          return (
            <line
              key={key}
              x1={run.col * cellSize}
              y1={run.rowStart * cellSize}
              x2={run.col * cellSize}
              y2={run.rowEnd * cellSize}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }

        return (
          <line
            key={key}
            x1={run.colStart * cellSize}
            y1={run.row * cellSize}
            x2={run.colEnd * cellSize}
            y2={run.row * cellSize}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  );
};

const buildWallRuns = (walls: Wall[]): WallRun[] => {
  const verticalByColumn = new Map<number, number[]>();
  const horizontalByRow = new Map<number, number[]>();

  for (const wall of walls) {
    const { a, b } = wall;
    if (a.row === b.row) {
      const col = Math.max(a.col, b.col);
      const starts = verticalByColumn.get(col) ?? [];
      starts.push(a.row);
      verticalByColumn.set(col, starts);
    } else {
      const row = Math.max(a.row, b.row);
      const starts = horizontalByRow.get(row) ?? [];
      starts.push(a.col);
      horizontalByRow.set(row, starts);
    }
  }

  const runs: WallRun[] = [];

  for (const [col, starts] of verticalByColumn) {
    for (const [rowStart, rowEnd] of contiguousRuns(starts)) {
      runs.push({ kind: "vertical", col, rowStart, rowEnd });
    }
  }

  for (const [row, starts] of horizontalByRow) {
    for (const [colStart, colEnd] of contiguousRuns(starts)) {
      runs.push({ kind: "horizontal", row, colStart, colEnd });
    }
  }

  return runs;
};

const contiguousRuns = (starts: number[]): Array<[number, number]> => {
  const sorted = [...new Set(starts)].sort((a, b) => a - b);
  const runs: Array<[number, number]> = [];
  let start = sorted[0];
  let end = start === undefined ? undefined : start + 1;

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]!;
    if (end === next) {
      end = next + 1;
      continue;
    }
    if (start !== undefined && end !== undefined) runs.push([start, end]);
    start = next;
    end = next + 1;
  }

  if (start !== undefined && end !== undefined) runs.push([start, end]);
  return runs;
};
