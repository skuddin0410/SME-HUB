export const REACTION_KINDS = ["like", "celebrate", "love"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];
