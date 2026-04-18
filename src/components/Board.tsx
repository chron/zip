import { useCallback, useMemo, useRef } from "react";
import { motion } from "motion/react";
import type { Coord, Puzzle } from "@/lib/types";
import { coordKey, eqCoord, getNumberAt } from "@/lib/game";

const CELL = 64; // px — base cell size; SVG scales via viewBox.
const GAP = 0; // cells are flush; grid lines drawn separately.

type Props = {
  puzzle: Puzzle;
  path: Coord[];
  isComplete: boolean;
  onPointerDownCell: (cell: Coord) => void;
  onPointerEnterCell: (cell: Coord) => void;
  onPointerUp: () => void;
};

export const Board = ({
  puzzle,
  path,
  isComplete,
  onPointerDownCell,
  onPointerEnterCell,
  onPointerUp,
}: Props) => {
  const { width, height } = puzzle;
  const svgRef = useRef<SVGSVGElement | null>(null);

  const pathSet = useMemo(() => new Set(path.map(coordKey)), [path]);

  const vbW = width * CELL + GAP * (width + 1);
  const vbH = height * CELL + GAP * (height + 1);

  const cellAt = useCallback(
    (clientX: number, clientY: number): Coord | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * vbW;
      const y = ((clientY - rect.top) / rect.height) * vbH;
      const col = Math.floor(x / CELL);
      const row = Math.floor(y / CELL);
      if (row < 0 || row >= height || col < 0 || col >= width) return null;
      return { row, col };
    },
    [height, width, vbH, vbW],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const c = cellAt(e.clientX, e.clientY);
      if (!c) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // synthetic or unsupported — fine
      }
      onPointerDownCell(c);
    },
    [cellAt, onPointerDownCell],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.buttons === 0 && e.pointerType === "mouse") return;
      const c = cellAt(e.clientX, e.clientY);
      if (!c) return;
      onPointerEnterCell(c);
    },
    [cellAt, onPointerEnterCell],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      onPointerUp();
    },
    [onPointerUp],
  );

  const cells = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const key = `${r},${c}`;
      const inPath = pathSet.has(key);
      cells.push(
        <rect
          key={`cell-${key}`}
          x={c * CELL}
          y={r * CELL}
          width={CELL}
          height={CELL}
          className={
            inPath
              ? "fill-indigo-500/20"
              : "fill-neutral-900 transition-colors"
          }
        />,
      );
    }
  }

  // Grid lines
  const gridLines = [];
  for (let i = 0; i <= width; i++) {
    gridLines.push(
      <line
        key={`v-${i}`}
        x1={i * CELL}
        y1={0}
        x2={i * CELL}
        y2={vbH}
        className="stroke-neutral-800"
        strokeWidth={1.5}
      />,
    );
  }
  for (let i = 0; i <= height; i++) {
    gridLines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={i * CELL}
        x2={vbW}
        y2={i * CELL}
        className="stroke-neutral-800"
        strokeWidth={1.5}
      />,
    );
  }

  // Walls rendered as thick segments on shared cell borders.
  const wallLines = puzzle.walls.map((w, idx) => {
    const { a, b } = w;
    let x1 = 0;
    let y1 = 0;
    let x2 = 0;
    let y2 = 0;
    if (a.row === b.row) {
      // horizontal neighbors -> vertical wall between them
      const col = Math.max(a.col, b.col);
      x1 = col * CELL;
      x2 = col * CELL;
      y1 = a.row * CELL;
      y2 = a.row * CELL + CELL;
    } else {
      const row = Math.max(a.row, b.row);
      y1 = row * CELL;
      y2 = row * CELL;
      x1 = a.col * CELL;
      x2 = a.col * CELL + CELL;
    }
    return (
      <line
        key={`wall-${idx}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="stroke-neutral-50"
        strokeWidth={5}
        strokeLinecap="round"
      />
    );
  });

  // Path polyline through cell centers.
  const center = (c: Coord) => ({
    x: c.col * CELL + CELL / 2,
    y: c.row * CELL + CELL / 2,
  });
  const pathD = path.length
    ? path
        .map((c, i) => {
          const { x, y } = center(c);
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ")
    : "";

  const numberCircles = puzzle.numbers.map((n) => {
    const { x, y } = center(n);
    const inPath = pathSet.has(coordKey(n));
    return (
      <g key={`num-${n.value}`} pointerEvents="none">
        <circle
          cx={x}
          cy={y}
          r={CELL * 0.34}
          className={
            inPath
              ? "fill-indigo-500 stroke-indigo-300"
              : "fill-neutral-50 stroke-neutral-300"
          }
          strokeWidth={2}
        />
        <text
          x={x}
          y={y}
          dy={2}
          textAnchor="middle"
          dominantBaseline="middle"
          className={
            inPath
              ? "fill-white font-bold"
              : "fill-neutral-900 font-bold"
          }
          style={{ fontSize: CELL * 0.42 }}
        >
          {n.value}
        </text>
      </g>
    );
  });

  // Highlight the head of the path.
  const head = path[path.length - 1];
  const headCircle = head
    ? (() => {
        const { x, y } = center(head);
        const isOnNumber = getNumberAt(puzzle, head) !== undefined;
        if (isOnNumber) return null;
        return (
          <motion.circle
            cx={x}
            cy={y}
            r={CELL * 0.18}
            className="fill-indigo-400"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          />
        );
      })()
    : null;

  void eqCoord; // silence unused-export tree-shake warning in strict mode

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="touch-none select-none w-full max-w-[min(90vw,520px)] aspect-square rounded-2xl bg-neutral-900 shadow-xl ring-1 ring-neutral-800"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {cells}
      {gridLines}

      {pathD && (
        <motion.path
          d={pathD}
          className={
            isComplete ? "stroke-emerald-400" : "stroke-indigo-400"
          }
          strokeWidth={CELL * 0.32}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={false}
          animate={{ opacity: 1 }}
        />
      )}

      {headCircle}
      {wallLines}
      {numberCircles}
    </svg>
  );
};
