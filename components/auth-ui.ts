/**
 * Class strings for the sign-in, join and password screens, copied from the approved design
 * (docs/design/auth.html) so every field, button and card has the same size, radius and type.
 */

/** White card that holds a form. */
export const CARD =
  "bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-elevated p-5 sm:p-6";

export const LABEL = "block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5";

/** Text field with an icon on the left (pl-10). */
export const INPUT =
  "w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 dark:text-white placeholder-slate-400 transition-all";

/** Field without an icon. */
export const INPUT_PLAIN =
  "w-full px-3 py-2.5 rounded-xl text-sm bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 dark:text-white transition-all";

export const ICON = "w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none";

/** Full-width primary action. */
export const PRIMARY =
  "w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none";

/** Small primary and secondary buttons (dialogs, error pages). */
export const PRIMARY_SM = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-70";
export const SECONDARY_SM =
  "inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";

export const LINK = "font-medium text-blue-600 dark:text-blue-400 hover:underline";
export const FIELD_ERROR = "text-[11px] text-rose-600 dark:text-rose-400 mt-1";
export const FORM_ERROR = "text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/60 rounded-xl px-3.5 py-2.5";

export const TITLE = "font-jakarta font-bold text-base text-slate-900 dark:text-white";
export const BODY = "text-xs text-slate-500 dark:text-slate-400 leading-relaxed";
