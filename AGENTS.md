# Zip

A puzzle game based off LinkedIn Zip.

NOTE: This project is in the prototyping phase! Don't worry about backwards compatibility and it's no big deal to delete and recreate data in the development database at any time.

There will usually be a dev server running, so you won't need to start your own.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Checks

Before handing off code changes, run `bun run check`. It runs TypeScript (`tsc -b`), Oxlint, Knip, and the Vitest suite.
