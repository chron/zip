import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { AuthMenu } from "@/components/AuthMenu";
import { HomePage } from "@/pages/HomePage";
import { PuzzlesPage } from "@/pages/PuzzlesPage";
import { PuzzlePage } from "@/pages/PuzzlePage";
import { EditorPage } from "@/pages/EditorPage";
import { cn } from "@/lib/utils";

const convexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const puzzlesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "puzzles",
  component: Outlet,
});

const puzzlesIndexRoute = createRoute({
  getParentRoute: () => puzzlesRoute,
  path: "/",
  component: PuzzlesPage,
});

const puzzleRoute = createRoute({
  getParentRoute: () => puzzlesRoute,
  path: "$shareId",
  component: PuzzleRoute,
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "editor",
  component: EditorPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  puzzlesRoute.addChildren([puzzlesIndexRoute, puzzleRoute]),
  editorRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AppShell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <div className="min-h-screen text-ink">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 pt-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="font-display text-[2.25rem] font-extrabold leading-none text-ink"
            aria-label="zip home"
          >
            <span className="relative inline-block">
              zip
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-[6px] w-full translate-y-[2px] rounded-full bg-tomato"
                style={{
                  clipPath: "polygon(0 40%, 100% 0, 100% 60%, 0 100%)",
                }}
              />
            </span>
          </Link>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <Link to="/" className={navLinkClass(pathname === "/")}>
            Play
          </Link>
          <Link
            to="/puzzles"
            className={navLinkClass(
              pathname === "/puzzles" || pathname.startsWith("/puzzles/"),
            )}
          >
            Puzzles
          </Link>
          <Link to="/editor" className={navLinkClass(pathname === "/editor")}>
            Editor
          </Link>
          {convexConfigured && <AuthSlot />}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

function AuthSlot() {
  const authState = useConvexAuth();

  return (
    <AuthMenu
      isAuthenticated={authState.isAuthenticated}
      isLoading={authState.isLoading}
    />
  );
}

function PuzzleRoute() {
  const { shareId } = puzzleRoute.useParams();
  return <PuzzlePage shareId={shareId} />;
}

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl py-16 text-center">
      <p className="font-mono text-xs uppercase text-tomato">404</p>
      <h2 className="mt-2 font-display text-4xl font-extrabold text-ink">
        Nothing zipped here.
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
        Try the puzzle archive or jump back into a random game.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link
          to="/puzzles"
          className="inline-flex h-8 items-center justify-center rounded-md bg-ink px-3 text-sm font-medium text-paper hover:bg-ink/90"
        >
          Open archive
        </Link>
        <Link
          to="/"
          className="inline-flex h-8 items-center justify-center rounded-md border border-ink/30 bg-paper px-3 text-sm font-medium text-ink hover:bg-paper-warm"
        >
          Play random
        </Link>
      </div>
    </section>
  );
}

const navLinkClass = (active: boolean) =>
  cn(
    "inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors",
    active
      ? "border-ink bg-ink text-paper"
      : "border-ink/20 bg-paper text-ink hover:border-ink/50 hover:bg-paper-warm",
  );
