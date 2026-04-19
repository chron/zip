import { query } from "./_generated/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return {
      email: identity.email ?? null,
      name: identity.name ?? null,
      tokenIdentifier: identity.tokenIdentifier,
    };
  },
});
