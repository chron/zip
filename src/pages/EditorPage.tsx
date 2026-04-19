import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { Game } from "@/components/Game";
import { cn } from "@/lib/utils";
import type { Coord, NumberedCell, Puzzle, Wall } from "@/lib/types";
import { api } from "../../convex/_generated/api";
import { BudgetExceededError, findSolutions } from "../../convex/lib/solver";

type Tool = "number" | "wall" | "erase";
type Mode = "edit" | "playtest";

type ValidationState = {
  canSave: boolean;
  tone: "error" | "warning" | "good";
  title: string;
  detail: string;
  solutions: number;
  nodesExplored: number;
  trace: SolveTrace | null;
};

type SolveTrace = {
  path: Coord[];
  fork: {
    at: Coord;
    options: Coord[];
  } | null;
};

const convexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);
const CELL = 64;
const GRID_SIZES = [4, 5, 6, 7];

const initialNumbers = (): NumberedCell[] => [
  { row: 0, col: 0, value: 1 },
  { row: 4, col: 4, value: 2 },
];

export const EditorPage = () => {
  return convexConfigured ? <ConvexEditor /> : <OfflineEditor />;
};

const ConvexEditor = () => {
  const navigate = useNavigate();
  const createPuzzle = useMutation(api.puzzles.create);

  const [width, setWidth] = useState(5);
  const [height, setHeight] = useState(5);
  const [numbers, setNumbers] = useState<NumberedCell[]>(initialNumbers);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [tool, setTool] = useState<Tool>("number");
  const [mode, setMode] = useState<Mode>("edit");
  const [showTrace, setShowTrace] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const puzzle = useMemo<Puzzle>(
    () => ({ width, height, numbers, walls }),
    [height, numbers, walls, width],
  );

  const validation = useMemo(() => validatePuzzle(puzzle), [puzzle]);
  const draftKey = useMemo(
    () => JSON.stringify({ width, height, numbers, walls }),
    [height, numbers, walls, width],
  );

  const updateWidth = (nextWidth: number) => {
    setWidth(nextWidth);
    setNumbers((current) =>
      renumber(current.filter((n) => n.col < nextWidth)),
    );
    setWalls((current) =>
      current.filter((w) => wallInBounds(w, nextWidth, height)),
    );
    setMode("edit");
  };

  const updateHeight = (nextHeight: number) => {
    setHeight(nextHeight);
    setNumbers((current) =>
      renumber(current.filter((n) => n.row < nextHeight)),
    );
    setWalls((current) =>
      current.filter((w) => wallInBounds(w, width, nextHeight)),
    );
    setMode("edit");
  };

  const handleCellClick = useCallback(
    (cell: Coord) => {
      setSaveError(null);
      setMode("edit");
      setNumbers((current) => {
        const existing = current.find((n) => sameCoord(n, cell));
        if (tool === "erase" || existing) {
          return renumber(current.filter((n) => !sameCoord(n, cell)));
        }
        if (tool !== "number") return current;
        return [
          ...current,
          {
            ...cell,
            value: current.length + 1,
          },
        ];
      });
    },
    [tool],
  );

  const handleWallClick = useCallback(
    (wall: Wall) => {
      setSaveError(null);
      setMode("edit");
      setWalls((current) => {
        const key = wallKey(wall);
        const exists = current.some((w) => wallKey(w) === key);
        if (tool === "erase") return current.filter((w) => wallKey(w) !== key);
        if (tool !== "wall") return current;
        if (exists) return current.filter((w) => wallKey(w) !== key);
        return [...current, normalizeWall(wall)];
      });
    },
    [tool],
  );

  const handleStopMove = useCallback((value: number, target: Coord) => {
    setSaveError(null);
    setMode("edit");
    setNumbers((current) => {
      const moving = current.find((n) => n.value === value);
      if (!moving) return current;
      const occupied = current.some(
        (n) => n.value !== value && sameCoord(n, target),
      );
      if (occupied) return current;
      return current.map((n) => (n.value === value ? { ...n, ...target } : n));
    });
  }, []);

  const clearDraft = () => {
    setNumbers([]);
    setWalls([]);
    setSaveError(null);
    setMode("edit");
  };

  const resetDraft = () => {
    setWidth(5);
    setHeight(5);
    setNumbers(initialNumbers());
    setWalls([]);
    setSaveError(null);
    setMode("edit");
  };

  const savePuzzle = async () => {
    if (!validation.canSave || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await createPuzzle({
        mode: "classic",
        width,
        height,
        numberCount: numbers.length,
        numbers,
        walls,
        difficulty:
          validation.solutions === 1
            ? "custom-unique"
            : "custom-multiple-solutions",
      });
      await navigate({
        to: "/puzzles/$shareId",
        params: { shareId: result.shareId },
      });
    } catch {
      setSaveError("Could not save this puzzle. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-7 py-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase text-tomato">Editor</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold leading-none text-ink sm:text-5xl">
              Shape a puzzle.
            </h2>
          </div>
          <div className="flex w-fit rounded-md border border-ink/25 bg-paper p-1">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={modeButtonClass(mode === "edit")}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode("playtest")}
              disabled={!validation.canSave}
              className={modeButtonClass(mode === "playtest")}
            >
              Playtest
            </button>
          </div>
        </div>

        {mode === "edit" ? (
          <EditorBoard
            puzzle={puzzle}
            tool={tool}
            trace={showTrace ? validation.trace : null}
            onCellClick={handleCellClick}
            onStopMove={handleStopMove}
            onWallClick={handleWallClick}
          />
        ) : (
          <div className="flex min-h-[520px] flex-col items-center justify-center border-y-2 border-ink">
            <Game
              key={draftKey}
              puzzle={puzzle}
              newPuzzleLabel="Restart"
              onNewPuzzle={() => setMode("playtest")}
            />
          </div>
        )}
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6">
        <Panel title="Tools">
          <div className="grid grid-cols-3 gap-2">
            <ToolButton
              active={tool === "number"}
              label="Stops"
              onClick={() => setTool("number")}
            />
            <ToolButton
              active={tool === "wall"}
              label="Walls"
              onClick={() => setTool("wall")}
            />
            <ToolButton
              active={tool === "erase"}
              label="Erase"
              onClick={() => setTool("erase")}
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            Stops keep their number when dragged. Click a numbered cell to
            remove it.
          </p>
        </Panel>

        <Panel title="Grid">
          <GridPicker
            label="Width"
            value={width}
            onChange={updateWidth}
          />
          <GridPicker
            label="Height"
            value={height}
            onChange={updateHeight}
          />
        </Panel>

        <Panel title="Checks">
          <ValidationMessage validation={validation} />
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Metric label="Stops" value={numbers.length.toString()} />
            <Metric label="Walls" value={walls.length.toString()} />
            <Metric
              label="Paths"
              value={
                validation.solutions >= 2
                  ? "2+"
                  : validation.solutions.toString()
              }
            />
          </dl>
          <button
            type="button"
            onClick={() => setShowTrace((value) => !value)}
            disabled={!validation.trace}
            className={cn(
              "mt-3 h-8 w-full rounded-md border px-3 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40",
              showTrace && validation.trace
                ? "border-ultramarine bg-ultramarine text-paper"
                : "border-ink/25 bg-paper text-ink hover:bg-paper-warm",
            )}
          >
            {showTrace ? "Hide solve trace" : "Show solve trace"}
          </button>
        </Panel>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={savePuzzle}
            disabled={!validation.canSave || saving}
            className="bg-ink text-paper hover:bg-ink/90 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save puzzle"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetDraft}
            className="border-ink/30 bg-paper hover:bg-paper-warm"
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={clearDraft}
            className="text-ink hover:bg-paper-warm"
          >
            Clear
          </Button>
        </div>

        {saveError && (
          <p className="text-sm font-semibold text-tomato">{saveError}</p>
        )}

      </aside>
    </section>
  );
};

const OfflineEditor = () => (
  <section className="mx-auto max-w-3xl py-16 text-center">
    <p className="font-mono text-xs uppercase text-tomato">Offline</p>
    <h2 className="mt-2 font-display text-4xl font-extrabold text-ink">
      The editor needs Convex to save.
    </h2>
    <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
      Set VITE_CONVEX_URL and start Convex, then come back to build puzzles.
    </p>
  </section>
);

const EditorBoard = ({
  puzzle,
  tool,
  trace,
  onCellClick,
  onStopMove,
  onWallClick,
}: {
  puzzle: Puzzle;
  tool: Tool;
  trace: SolveTrace | null;
  onCellClick: (cell: Coord) => void;
  onStopMove: (value: number, target: Coord) => void;
  onWallClick: (wall: Wall) => void;
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const suppressNextClick = useRef(false);
  const [draggedStop, setDraggedStop] = useState<NumberedCell | null>(null);
  const [dragTarget, setDragTarget] = useState<Coord | null>(null);

  const vbW = puzzle.width * CELL;
  const vbH = puzzle.height * CELL;
  const numberByCell = new Map(puzzle.numbers.map((n) => [coordKey(n), n]));
  const wallSet = new Set(puzzle.walls.map(wallKey));
  const maxBoardWidth =
    puzzle.width >= puzzle.height
      ? 620
      : Math.round((620 * puzzle.width) / puzzle.height);

  const cellAt = useCallback(
    (clientX: number, clientY: number): Coord | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * vbW;
      const y = ((clientY - rect.top) / rect.height) * vbH;
      const col = Math.floor(x / CELL);
      const row = Math.floor(y / CELL);
      if (row < 0 || row >= puzzle.height || col < 0 || col >= puzzle.width) {
        return null;
      }
      return { row, col };
    },
    [puzzle.height, puzzle.width, vbH, vbW],
  );

  const handleCellPointerDown = (
    event: ReactPointerEvent<SVGRectElement>,
    cell: Coord,
    number: NumberedCell | undefined,
  ) => {
    if (tool !== "number" || !number) return;
    setDraggedStop(number);
    setDragTarget(cell);
    suppressNextClick.current = false;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a convenience, not a requirement.
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!draggedStop) return;
    const target = cellAt(event.clientX, event.clientY);
    if (target) setDragTarget(target);
  };

  const finishStopDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!draggedStop) return;
    const target = cellAt(event.clientX, event.clientY) ?? dragTarget;
    if (target) {
      const occupied = numberByCell.get(coordKey(target));
      const sameCell = sameCoord(draggedStop, target);
      if (sameCell) {
        onCellClick(target);
      } else if (!occupied) {
        onStopMove(draggedStop.value, target);
      }
    }
    suppressNextClick.current = target !== null;
    setDraggedStop(null);
    setDragTarget(null);
  };

  const dragTargetOccupied =
    draggedStop && dragTarget
      ? numberByCell.has(coordKey(dragTarget)) &&
        !sameCoord(draggedStop, dragTarget)
      : false;

  const cells = [];
  const numberChips = [];
  for (let row = 0; row < puzzle.height; row++) {
    for (let col = 0; col < puzzle.width; col++) {
      const cell = { row, col };
      const number = numberByCell.get(coordKey(cell));
      cells.push(
        <g key={coordKey(cell)}>
          <rect
            x={col * CELL}
            y={row * CELL}
            width={CELL}
            height={CELL}
            fill={number ? "rgba(240, 58, 71, 0.1)" : "transparent"}
            className={cn(
              "cursor-pointer",
              tool === "number" && number && "cursor-grab active:cursor-grabbing",
            )}
            onPointerDown={(event) =>
              handleCellPointerDown(event, cell, number)
            }
            onClick={() => {
              if (suppressNextClick.current) {
                suppressNextClick.current = false;
                return;
              }
              onCellClick(cell);
            }}
          />
        </g>,
      );

      if (number) {
        numberChips.push(
          <g key={`number-${number.value}`} pointerEvents="none">
            <circle
              cx={col * CELL + CELL / 2 + 2}
              cy={row * CELL + CELL / 2 + 3}
              r={CELL * 0.32}
              fill="var(--ultramarine)"
              opacity={0.85}
            />
            <circle
              cx={col * CELL + CELL / 2}
              cy={row * CELL + CELL / 2}
              r={CELL * 0.32}
              fill="var(--tomato)"
              stroke="var(--ink)"
              strokeWidth={2.25}
            />
            <text
              x={col * CELL + CELL / 2}
              y={row * CELL + CELL / 2}
              dy={2}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: CELL * 0.42,
                fill: "var(--paper)",
              }}
            >
              {number.value}
            </text>
          </g>,
        );
      }
    }
  }

  const gridLines = [];
  for (let col = 1; col < puzzle.width; col++) {
    gridLines.push(
      <line
        key={`v-${col}`}
        x1={col * CELL}
        y1={0}
        x2={col * CELL}
        y2={vbH}
        stroke="var(--ink)"
        strokeOpacity={0.14}
      />,
    );
  }
  for (let row = 1; row < puzzle.height; row++) {
    gridLines.push(
      <line
        key={`h-${row}`}
        x1={0}
        y1={row * CELL}
        x2={vbW}
        y2={row * CELL}
        stroke="var(--ink)"
        strokeOpacity={0.14}
      />,
    );
  }

  const dragPreview = draggedStop && dragTarget && (
    <g pointerEvents="none">
      <circle
        cx={dragTarget.col * CELL + CELL / 2 + 2}
        cy={dragTarget.row * CELL + CELL / 2 + 3}
        r={CELL * 0.32}
        fill={dragTargetOccupied ? "var(--tomato)" : "var(--ultramarine)"}
        opacity={0.18}
      />
      <circle
        cx={dragTarget.col * CELL + CELL / 2}
        cy={dragTarget.row * CELL + CELL / 2}
        r={CELL * 0.32}
        fill={dragTargetOccupied ? "rgba(240, 58, 71, 0.14)" : "#FBF5E6"}
        stroke={dragTargetOccupied ? "var(--tomato)" : "var(--ultramarine)"}
        strokeWidth={3}
        strokeDasharray="8 7"
      />
      <text
        x={dragTarget.col * CELL + CELL / 2}
        y={dragTarget.row * CELL + CELL / 2}
        dy={2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: CELL * 0.42,
          fill: dragTargetOccupied ? "var(--tomato)" : "var(--ultramarine)",
        }}
      >
        {draggedStop.value}
      </text>
    </g>
  );

  const solveTrace = trace && <SolveTraceLayer trace={trace} />;

  const wallHits = [];
  for (let row = 0; row < puzzle.height; row++) {
    for (let col = 1; col < puzzle.width; col++) {
      const wall = normalizeWall({
        a: { row, col: col - 1 },
        b: { row, col },
      });
      const active = wallSet.has(wallKey(wall));
      wallHits.push(
        <WallHit
          key={`v-${row}-${col}`}
          active={active}
          disabled={tool === "number"}
          ghost={tool === "wall" && !active}
          x1={col * CELL}
          y1={row * CELL + 6}
          x2={col * CELL}
          y2={(row + 1) * CELL - 6}
          onClick={() => onWallClick(wall)}
        />,
      );
    }
  }
  for (let row = 1; row < puzzle.height; row++) {
    for (let col = 0; col < puzzle.width; col++) {
      const wall = normalizeWall({
        a: { row: row - 1, col },
        b: { row, col },
      });
      const active = wallSet.has(wallKey(wall));
      wallHits.push(
        <WallHit
          key={`h-${row}-${col}`}
          active={active}
          disabled={tool === "number"}
          ghost={tool === "wall" && !active}
          x1={col * CELL + 6}
          y1={row * CELL}
          x2={(col + 1) * CELL - 6}
          y2={row * CELL}
          onClick={() => onWallClick(wall)}
        />,
      );
    }
  }

  return (
    <div className="w-full">
      <div
        className="relative w-full"
        style={{
          aspectRatio: `${puzzle.width} / ${puzzle.height}`,
          maxWidth: `min(92vw, ${maxBoardWidth}px)`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 translate-x-[7px] translate-y-[8px] rounded-md bg-ultramarine"
        />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="relative h-full w-full touch-none select-none rounded-md border-[3px] border-ink bg-[#FBF5E6]"
          role="img"
          aria-label="Puzzle editor grid"
          onPointerMove={handlePointerMove}
          onPointerUp={finishStopDrag}
          onPointerCancel={() => {
            suppressNextClick.current = false;
            setDraggedStop(null);
            setDragTarget(null);
          }}
        >
          {cells}
          {gridLines}
          {solveTrace}
          {dragPreview}
          {wallHits}
          {numberChips}
        </svg>
      </div>
    </div>
  );
};

const SolveTraceLayer = ({ trace }: { trace: SolveTrace }) => {
  const mainPath = pathD(trace.path);
  const fork = trace.fork;

  return (
    <g pointerEvents="none">
      {mainPath && (
        <>
          <path
            d={mainPath}
            transform="translate(2 2)"
            stroke="var(--tomato)"
            strokeOpacity={0.28}
            strokeWidth={CELL * 0.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d={mainPath}
            stroke="var(--ultramarine)"
            strokeOpacity={0.52}
            strokeWidth={CELL * 0.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}

      {fork && (
        <g>
          {fork.options.map((option) => {
            const forkLeg = pathD([fork.at, option]);
            return (
              <path
                key={coordKey(option)}
                d={forkLeg}
                stroke="var(--ultramarine)"
                strokeOpacity={0.42}
                strokeWidth={CELL * 0.13}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 8"
                fill="none"
              />
            );
          })}
          <circle
            cx={center(fork.at).x}
            cy={center(fork.at).y}
            r={CELL * 0.13}
            fill="var(--paper)"
            stroke="var(--ultramarine)"
            strokeWidth={3}
          />
          <circle
            cx={center(fork.at).x}
            cy={center(fork.at).y}
            r={CELL * 0.055}
            fill="var(--ultramarine)"
          />
        </g>
      )}
    </g>
  );
};

const WallHit = ({
  active,
  disabled,
  ghost,
  x1,
  y1,
  x2,
  y2,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  ghost: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  onClick: () => void;
}) => (
  <g
    className={cn(
      "group",
      disabled ? "pointer-events-none" : "cursor-crosshair",
    )}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
  >
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="transparent"
      strokeWidth={22}
      strokeLinecap="round"
    />
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={active ? "var(--ink)" : "var(--tomato)"}
      strokeWidth={active ? 7 : 3}
      strokeLinecap="round"
      strokeDasharray={active ? undefined : "8 7"}
      className={cn(
        "transition-opacity",
        active && "opacity-100",
        !active && ghost && "opacity-0 group-hover:opacity-75",
        !active && !ghost && "opacity-0",
      )}
    />
  </g>
);

const Panel = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="border-b-2 border-ink pb-4">
    <h3 className="mb-3 font-mono text-[11px] font-semibold uppercase text-ink/60">
      {title}
    </h3>
    {children}
  </section>
);

const ToolButton = ({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-9 rounded-md border px-2 text-sm font-semibold transition-colors",
      active
        ? "border-ink bg-ink text-paper"
        : "border-ink/25 bg-paper text-ink hover:bg-paper-warm",
    )}
  >
    {label}
  </button>
);

const GridPicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <div className="mb-3 last:mb-0">
    <div className="mb-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
    </div>
    <div className="grid grid-cols-4 gap-2">
      {GRID_SIZES.map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => onChange(size)}
          className={cn(
            "h-8 rounded-md border font-mono text-xs font-semibold transition-colors",
            value === size
              ? "border-ink bg-ink text-paper"
              : "border-ink/25 bg-paper hover:bg-paper-warm",
          )}
        >
          {size}
        </button>
      ))}
    </div>
  </div>
);

const ValidationMessage = ({
  validation,
}: {
  validation: ValidationState;
}) => (
  <div
    className={cn(
      "border-l-4 px-3 py-2",
      validation.tone === "good" && "border-ultramarine bg-ultramarine/10",
      validation.tone === "warning" && "border-marigold bg-marigold/15",
      validation.tone === "error" && "border-tomato bg-tomato/10",
    )}
  >
    <div className="font-semibold text-ink">{validation.title}</div>
    <p className="mt-1 text-sm leading-5 text-ink/70">{validation.detail}</p>
  </div>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-ink/20 bg-paper px-2 py-2">
    <div className="font-mono text-[10px] uppercase text-ink/50">{label}</div>
    <div className="mt-1 font-mono text-lg font-bold text-ink">{value}</div>
  </div>
);

const modeButtonClass = (active: boolean) =>
  cn(
    "h-8 rounded px-3 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40",
    active ? "bg-ink text-paper" : "text-ink hover:bg-paper-warm",
  );

const validatePuzzle = (puzzle: Puzzle): ValidationState => {
  if (puzzle.numbers.length < 2) {
    return {
      canSave: false,
      tone: "error",
      title: "Place at least two stops.",
      detail: "The path needs a start and a finish before it can be played.",
      solutions: 0,
      nodesExplored: 0,
      trace: null,
    };
  }

  try {
    const result = findSolutions(puzzle, { max: 2, nodeBudget: 80_000 });
    if (result.solutions.length === 0) {
      return {
        canSave: false,
        tone: "error",
        title: "No solution yet.",
        detail: "Move a stop or remove a wall until every cell can be zipped.",
        solutions: 0,
        nodesExplored: result.nodesExplored,
        trace: null,
      };
    }

    const trace = buildSolveTrace(result.solutions);

    if (result.solutions.length > 1) {
      return {
        canSave: true,
        tone: "warning",
        title: "Playable, with branches.",
        detail:
          "This puzzle has more than one solution. Fine for now; we can add uniqueness tools next.",
        solutions: result.solutions.length,
        nodesExplored: result.nodesExplored,
        trace,
      };
    }

    return {
      canSave: true,
      tone: "good",
      title: "Ready to save.",
      detail: "The solver found one complete path through the board.",
      solutions: 1,
      nodesExplored: result.nodesExplored,
      trace,
    };
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return {
        canSave: false,
        tone: "error",
        title: "Too tangled to verify.",
        detail:
          "The solver hit its budget. Try a smaller grid or fewer ambiguous passages.",
        solutions: 0,
        nodesExplored: error.nodesExplored,
        trace: null,
      };
    }
    return {
      canSave: false,
      tone: "error",
      title: "Could not check this draft.",
      detail:
        "Something about the grid is invalid. Resetting the draft is the quickest way out.",
      solutions: 0,
      nodesExplored: 0,
      trace: null,
    };
  }
};

const buildSolveTrace = (solutions: Coord[][]): SolveTrace | null => {
  const first = solutions[0];
  if (!first) return null;
  const second = solutions[1];
  if (!second) return { path: first, fork: null };

  let divergenceIndex = 0;
  while (
    divergenceIndex < first.length &&
    divergenceIndex < second.length &&
    sameCoord(first[divergenceIndex]!, second[divergenceIndex]!)
  ) {
    divergenceIndex++;
  }

  if (divergenceIndex >= first.length || divergenceIndex >= second.length) {
    return { path: first, fork: null };
  }

  const path = first.slice(0, divergenceIndex);
  const at = path[path.length - 1];
  if (!at) {
    return { path: [], fork: null };
  }

  const options = dedupeCoords([first[divergenceIndex]!, second[divergenceIndex]!]);

  return {
    path,
    fork: {
      at,
      options,
    },
  };
};

const pathD = (path: Coord[]) =>
  path
    .map((coord, index) => {
      const { x, y } = center(coord);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

const center = (coord: Coord) => ({
  x: coord.col * CELL + CELL / 2,
  y: coord.row * CELL + CELL / 2,
});

const coordKey = (coord: Coord) => `${coord.row},${coord.col}`;

const sameCoord = (a: Coord, b: Coord) => a.row === b.row && a.col === b.col;

const dedupeCoords = (coords: Coord[]) => {
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const coord of coords) {
    const key = coordKey(coord);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(coord);
  }
  return out;
};

const renumber = (numbers: NumberedCell[]): NumberedCell[] =>
  numbers.map((number, index) => ({ ...number, value: index + 1 }));

const normalizeWall = (wall: Wall): Wall => {
  const [a, b] =
    coordKey(wall.a) < coordKey(wall.b) ? [wall.a, wall.b] : [wall.b, wall.a];
  return { a, b };
};

const wallKey = (wall: Wall) => {
  const normalized = normalizeWall(wall);
  return `${coordKey(normalized.a)}|${coordKey(normalized.b)}`;
};

const wallInBounds = (wall: Wall, width: number, height: number) =>
  inBounds(wall.a, width, height) && inBounds(wall.b, width, height);

const inBounds = (coord: Coord, width: number, height: number) =>
  coord.row >= 0 && coord.row < height && coord.col >= 0 && coord.col < width;
