# Ideas

A running archive of things we might want to add to the game. Not a roadmap — nothing here is committed. Move items to `TODO.md` (or similar) when they're ready to build.

## Decisions so far

- **Daily rollover**: midnight GMT, globally. Everyone is on the same puzzle at the same moment; no local-time weirdness.
- **Anonymous progress**: persist against a device fingerprint by default. Show a dismissible banner encouraging sign-in to save progress properly. On sign-in, merge the device's local history into the account rather than discarding it.
- **Modes**: puzzles belong to a named mode. `classic` (no extra mechanics) ships first. Future modes (`regions`, `portals`, `ice`, etc.) are layered on as separate variants — eventually a daily per mode, but not at launch. Worth encoding `mode` in the schema from the start so we don't have to migrate later.

## Daily puzzle & archive

- **Daily puzzle**: one puzzle per day, identical for everyone. Rolls over at a fixed UTC time (or local midnight — decide).
- **Archive**: browse and replay past dailies. Mark which you've solved, and highlight streaks.
- **Streaks**: current + longest consecutive-day streaks (Wordle-style). Grace day? Or strict?
- **Daily reminder**: optional push / email / PWA notification when the new daily drops.
- **Countdown to next daily**: after solving, show a timer + prompt to share.
- **Puzzle of the week**: a tougher weekly challenge, separate from daily.
- **Seasons**: 3-month cycles with themed puzzle packs and a soft reset of leaderboards.

## Accounts & identity

- **Anonymous-first**: the full daily loop should work with no account — progress stored locally.
- **Optional auth**: sign in to sync progress across devices, climb the leaderboard with a name, and unlock social features.
- **Local → account merge**: when a user signs in, merge their anonymous history instead of discarding it.
- **Display name + avatar**: lightweight identity for leaderboards. No real-name requirement.
- **Guest streaks that survive**: use a long-lived device ID so anonymous streaks don't die if cookies clear mid-streak.

## Stats, scores, leaderboards

- **Per-puzzle stats**: your time, move count, number of undos, whether you had a clean solve (no backtracking).
- **Aggregate stats**: total solved, average time by difficulty, fastest solve, longest streak, solve-rate by size.
- **Relative-to-others**: "you solved in the top 20% of times today." Shown only if there's a meaningful sample.
- **Per-puzzle leaderboard**: fastest clean solves for each daily. Consider separate boards for "fastest" vs "fewest moves."
- **Weekly/seasonal boards**: cumulative scoring rather than single-puzzle times.
- **Friends-only board**: opt-in social mode without exposing yourself to the global top.
- **Distribution histogram**: show where your time landed on the curve (like Wordle's guess distribution).

## Sharing & social

- **Shareable result card**: emoji/ASCII grid of your path shape + time, no spoilers. Wordle-style.
- **Share image**: pre-rendered OG image for the daily so Twitter/iMessage previews look good.
- **Short puzzle codes**: every puzzle gets a compact shareable code (e.g. `ZIP-7K3QA`) for linking.
- **Friend challenges**: "I solved today's in 42s, beat me." One-tap share, opponent sees your time as a ghost target.
- **Ghost replay**: after solving, watch an animation of a faster solver's path (top solver of the day, or a friend's).

## Puzzle generation & variety

- **Tighter generator**: enforce unique solutions at generation time; reject puzzles with multiple valid paths.
- **Walls as first-class constraints**: more interesting use of walls to force specific routings rather than just blocking.
- **Difficulty grading**: computed from solver search depth / branching factor, not just grid size. Calibrate against human times once we have data.
- **Difficulty buckets**: easy / medium / hard / expert — each daily week could cycle through them.
- **Board shapes**: non-rectangular boards (L-shapes, plus-signs), and eventually hex grids.
- **Variable size**: puzzles from 4×4 up to 10×10 depending on difficulty.
- **Generator tooling**: a CLI/admin page that previews a batch of candidates with difficulty estimates so we can curate.
- **Human-authored puzzles**: seed a set of hand-crafted puzzles alongside generated ones for quality.

## New mechanics & variants

- **Portals / teleporters**: pairs of tiles that act as one.
- **Ice tiles**: path slides until it hits a wall or edge.
- **One-way arrows**: tile can only be entered from one direction.
- **Keys & doors**: certain walls open after visiting a key tile.
- **Colored regions**: numbered waypoints must be visited in order *and* the path must cover every tile of a region contiguously.
- **Multi-path mode**: two disjoint paths from distinct starts that must cover all tiles between them.
- **Branching waypoints**: one waypoint can be reached from multiple valid sub-orders.
- **Reverse mode**: see the solved path for 2 seconds, reproduce from memory.
- **Time attack**: rapid-fire mini-puzzles, score based on how many you clear in 60s.
- **Zen mode**: no timer, no score, just a calm queue of puzzles.

## Custom puzzles

- **Puzzle editor**: drag numbers, place walls, toggle cells. Auto-validate uniqueness.
- **Publish**: share custom puzzles via short code or a public gallery.
- **Community gallery**: browse, rate, and favourite user-submitted puzzles.
- **Per-puzzle comments**: lightweight discussion thread after you've solved (so no spoilers).
- **"Remix"**: fork someone else's puzzle as a starting point.

## Achievements & meta

- **Achievements**: clean solves, speed tiers, streak milestones, completing a full size/difficulty matrix, solving every daily in a month, etc.
- **Titles / flair**: earned cosmetics shown next to your name on the leaderboard.
- **Collections**: "solve every expert daily this season" style long-form goals.
- **Progress map**: a visual of every daily you've completed, like a GitHub contribution graph.

## Multiplayer

- **Versus (async)**: both solve today's puzzle; fastest wins. Already covered by leaderboard but make it explicit.
- **Versus (live)**: matchmaking on the same puzzle, see each other's progress as ghost trails.
- **Co-op**: two cursors on one board, collaborative solve.
- **Relay**: player A draws until a marker, player B finishes — score the combined result.
- **Two-lines variant**: one board, two paths, each player owns one — compete for coverage or cooperate to meet constraints.
- **Tournaments**: scheduled bracket events on themed puzzle sets.

## UX & polish

- **Tutorial / onboarding**: first-time walkthrough that teaches constraints by example, not by wall-of-text.
- **Progressive hint system**: gentle → specific, with a score penalty proportional to hint strength.
- **Undo / unwind**: click any cell on your current path to rewind to it (LinkedIn Zip already does this — verify we do too).
- **Replay animation**: watch your own solve play back after completing.
- **Keyboard play**: arrow keys / hjkl for accessibility and speedrun-ability.
- **Touch polish**: large hit targets, haptics on waypoint hits, resistance at walls.
- **Color-blind mode**: shape/pattern cues in addition to color for waypoints and regions.
- **Sound + music**: subtle ambient loop + satisfying solve chime, both easily muted.
- **Themes / skins**: visual palettes (minimal, hand-drawn, neon) — cosmetic only.
- **Offline / PWA**: cache today's daily so it can be played on the subway.

## Infra & tooling

- **Admin dashboard**: see daily solve rates, average times, drop-off points, report broken puzzles.
- **Puzzle health checks**: automated verification that every published puzzle has exactly one solution.
- **Analytics**: funnel from land → first move → solve, so we can find onboarding friction.
- **Seed + rotation**: enough generated puzzles in the bank to cover ~6 months of dailies before re-seeding.
- **A/B on difficulty curves**: try different weekly difficulty patterns and see which drives retention.

## Wildcards

- **AI-narrated puzzles**: each daily gets a tiny flavor blurb ("a walk through the old quarter") — leans into the personal/literary tone without clutter.
- **Generative art on solve**: your completed path becomes a little abstract print you can collect or share.
- **Physical export**: print-friendly PDF of a week of puzzles for a paper-and-pen session.
- **Embed mode**: a minimal widget others can embed in blogs or newsletters.
