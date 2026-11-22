/** Stored names stay stable; the old site and old posts use like, celebrate and love. */
export const REACTION_KINDS = ["like", "celebrate", "support", "love", "insight", "funny"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export const REACTION_LABEL: Record<ReactionKind, string> = {
  like: "Like",
  celebrate: "Celebrate",
  support: "Support",
  love: "Love",
  insight: "Insightful",
  funny: "Funny",
};
