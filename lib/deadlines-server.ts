import "server-only";
import { cache } from "react";
import { getViewer } from "@/lib/hub";
import { DEFAULT_REM, dlGen, torontoToday, type DlCustom, type DlRem, type DlSetup } from "@/lib/deadlines";

/** The signed-in member's deadlines (private: the database only returns their own rows). */
export const getMyDeadlines = cache(async () => {
  const { supabase, userId } = await getViewer();
  if (!userId) return null;
  const [{ data: s }, { data: c }] = await Promise.all([
    supabase.from("deadline_settings").select("setup, done, rem").eq("user_id", userId).maybeSingle(),
    supabase.from("deadline_custom").select("id, title, due, rep, note").eq("user_id", userId).order("due"),
  ]);
  const row = s as { setup: DlSetup; done: Record<string, boolean>; rem: DlRem } | null;
  const today = torontoToday();
  return {
    today,
    setup: row?.setup ?? null,
    done: row?.done ?? {},
    rem: { ...DEFAULT_REM, ...(row?.rem ?? {}) },
    custom: (c ?? []) as DlCustom[],
    list: row?.setup || (c ?? []).length ? dlGen(row?.setup ?? null, (c ?? []) as DlCustom[], today) : [],
  };
});
