/**
 * Class strings for the sign-in, join and password screens, copied from the approved design
 * (docs/design/auth.html) so every field, button and card has the same size, radius and type.
 */

/** White card that holds a form. */
export const CARD = "bg-white border border-[#E5E5E8] rounded-3xl p-6 sm:p-7 shadow-auth-card";

export const LABEL = "block text-xs font-semibold text-slate-700 mb-1";

/** Text field with an icon on the left (pl-10). */
export const INPUT =
  "w-full h-11 pl-10 pr-4 rounded-full bg-slate-50/90 border border-slate-200 text-[13px] text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition-all";

/** Smaller field without an icon (join form extras). */
export const INPUT_PLAIN =
  "w-full h-10 px-4 rounded-full bg-slate-50/90 border border-slate-200 text-[13px] text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition-all";

export const ICON = "w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none";

/** Full-width primary action. */
export const PRIMARY =
  "w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-display font-bold text-[13.5px] shadow-[0_8px_20px_-6px_rgba(37,99,235,0.55)] flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:pointer-events-none";

/** Small primary and secondary buttons (dialogs, error pages). */
export const PRIMARY_SM = "inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-70";
export const SECONDARY_SM = "inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors";

export const LINK = "font-semibold text-blue-600 hover:underline";
export const FIELD_ERROR = "text-[11px] text-rose-600 mt-1 pl-1";
export const FORM_ERROR = "text-xs text-rose-600 bg-rose-50 border border-rose-200/70 rounded-2xl px-4 py-2.5";

export const TITLE = "font-display font-bold text-base text-slate-950";
export const BODY = "text-xs text-slate-500 leading-relaxed";
