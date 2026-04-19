import { useCallback, useMemo, useRef } from "react";
import { motion } from "motion/react";
import type { Coord, Puzzle } from "@/lib/types";
import { coordKey, getNumberAt } from "@/lib/game";

const CELL = 64; // px — base cell size; SVG scales via viewBox.

type Props = {
  puzzle: Puzzle;
  path: Coord[];
  isComplete: boolean;
  onPointerDownCell: (cell: Coord) => void;
  onPointerEnterCell: (cell: Coord) => void;
  onPointerUp: () => void;
};

// Riso-style misregistration offset for shadows behind circles/lines.
const RISO_OFFSET = { x: 2.2, y: 2.6 };

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

  const vbW = width * CELL;
  const vbH = height * CELL;
  const maxBoardWidth =
    width >= height ? 520 : Math.round((520 * width) / height);

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

  // Cells — paper background with a soft wash on visited cells.
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
          fill={inPath ? "rgba(240, 58, 71, 0.09)" : "transparent"}
        />,
      );
    }
  }

  // Grid lines — faint ink hatch, a bit more visible on the outer border.
  const gridLines = [];
  for (let i = 1; i < width; i++) {
    gridLines.push(
      <line
        key={`v-${i}`}
        x1={i * CELL}
        y1={0}
        x2={i * CELL}
        y2={vbH}
        stroke="var(--ink)"
        strokeOpacity={0.12}
        strokeWidth={1}
      />,
    );
  }
  for (let i = 1; i < height; i++) {
    gridLines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={i * CELL}
        x2={vbW}
        y2={i * CELL}
        stroke="var(--ink)"
        strokeOpacity={0.12}
        strokeWidth={1}
      />,
    );
  }

  // Walls — solid ink.
  const wallLines = puzzle.walls.map((w, idx) => {
    const { a, b } = w;
    let x1 = 0;
    let y1 = 0;
    let x2 = 0;
    let y2 = 0;
    if (a.row === b.row) {
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
        stroke="var(--ink)"
        strokeWidth={6}
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

  const lineColor = isComplete ? "var(--ultramarine)" : "var(--tomato)";
  const lineShadowColor = isComplete ? "var(--tomato)" : "var(--ultramarine)";

  // Numbered cells — white chip, ink ring, with a tomato offset for riso feel.
  const numberCircles = puzzle.numbers.map((n) => {
    const { x, y } = center(n);
    const inPath = pathSet.has(coordKey(n));
    const chipR = CELL * 0.36;
    return (
      <g key={`num-${n.value}`} pointerEvents="none">
        {/* misregistration shadow */}
        <circle
          cx={x + RISO_OFFSET.x}
          cy={y + RISO_OFFSET.y}
          r={chipR}
          fill="var(--tomato)"
          opacity={inPath ? 0 : 0.85}
        />
        <circle
          cx={x}
          cy={y}
          r={chipR}
          fill={inPath ? "var(--tomato)" : "#FBF5E6"}
          stroke="var(--ink)"
          strokeWidth={2.25}
        />
        <text
          x={x}
          y={y}
          dy={2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: CELL * 0.44,
            letterSpacing: "-0.04em",
            fill: inPath ? "var(--paper)" : "var(--ink)",
          }}
        >
          {n.value}
        </text>
      </g>
    );
  });

  // Head indicator — only visible when the head isn't a numbered cell.
  const head = path[path.length - 1];
  const headCircle = head
    ? (() => {
        const { x, y } = center(head);
        const isOnNumber = getNumberAt(puzzle, head) !== undefined;
        if (isOnNumber) return null;
        return (
          <motion.g
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            <circle cx={x} cy={y} r={CELL * 0.14} fill="var(--paper)" />
            <circle cx={x} cy={y} r={CELL * 0.09} fill="var(--ink)" />
          </motion.g>
        );
      })()
    : null;

  return (
    <div
      className="relative w-full"
      style={{
        aspectRatio: `${width} / ${height}`,
        maxWidth: `min(90vw, ${maxBoardWidth}px)`,
      }}
    >
      {/* Riso offset plate behind the board — gives it a printed-sticker feel. */}
      <div
        aria-hidden
        className="absolute inset-0 translate-x-[6px] translate-y-[7px] rounded-[22px] bg-ultramarine/90"
      />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="relative touch-none select-none w-full h-full rounded-[22px] ring-[3px] ring-ink"
        style={{ backgroundColor: "#FBF5E6" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {cells}
        {gridLines}

        {pathD && (
          <>
            {/* misregistration shadow behind the line */}
            <path
              d={pathD}
              transform={`translate(${RISO_OFFSET.x * 1.4} ${RISO_OFFSET.y * 1.4})`}
              stroke={lineShadowColor}
              strokeOpacity={0.55}
              strokeWidth={CELL * 0.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <motion.path
              d={pathD}
              stroke={lineColor}
              strokeWidth={CELL * 0.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={false}
              animate={isComplete ? { opacity: [1, 0.7, 1] } : { opacity: 1 }}
              transition={isComplete ? { duration: 0.7 } : { duration: 0.2 }}
            />
          </>
        )}

        {headCircle}
        {wallLines}
        {numberCircles}
      </svg>
    </div>
  );
};
