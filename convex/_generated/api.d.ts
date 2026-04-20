/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as completions from "../completions.js";
import type * as daily from "../daily.js";
import type * as http from "../http.js";
import type * as lib_generator from "../lib/generator.js";
import type * as lib_shareId from "../lib/shareId.js";
import type * as lib_solver from "../lib/solver.js";
import type * as puzzles from "../puzzles.js";
import type * as viewer from "../viewer.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  completions: typeof completions;
  daily: typeof daily;
  http: typeof http;
  "lib/generator": typeof lib_generator;
  "lib/shareId": typeof lib_shareId;
  "lib/solver": typeof lib_solver;
  puzzles: typeof puzzles;
  viewer: typeof viewer;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
