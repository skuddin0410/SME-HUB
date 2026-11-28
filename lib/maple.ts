import type { MapleAnswer } from "@/supabase/functions/_shared/maple-rules";

/** Updates 46 to 48: Maple, SME Hub's AI assistant. What the pages and the server share. */
export type MapleMsg = {
  id: string;
  by: "me" | "maple";
  /** the question, or the answer as plain text */
  t: string;
  a?: MapleAnswer;
  /** the question an answer replies to (for "Ask a person instead") */
  q?: string;
  /** the member's rating: 1 helpful, -1 not helpful */
  fb?: -1 | 0 | 1;
  /** written by an AI model (not the Hub's own rules or the approved library) */
  ai?: boolean;
  at?: string;
};
export type MapleLeft = { used: number; limit: number | null };
export type MapleSettings = { on: boolean; personal: boolean; tips: boolean };
export const MAPLE_DEFAULTS: MapleSettings = { on: true, personal: true, tips: true };

/** Questions left this month (null = no monthly limit). */
export const mapleRemaining = (l: MapleLeft) => (l.limit === null ? null : Math.max(0, l.limit - l.used));
