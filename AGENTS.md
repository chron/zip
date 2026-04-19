<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Checks

Before handing off code changes, run `bun run check`. It runs TypeScript (`tsc -b`), Oxlint, Knip, and the Vitest suite.

Use `bun run test:watch` while iterating on game logic, and keep Knip findings intentional rather than silencing them unless a file is deliberately public API.
