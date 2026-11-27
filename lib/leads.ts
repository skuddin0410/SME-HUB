import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Update 30: My leads. Everyone who contacted the member through SME Hub (never an uploaded list). */
export type LeadStatus = "new" | "quoted" | "won" | "lost";
export type LeadSource = "message" | "page" | "quote" | "request";
export type Lead = {
  id: string;
  source: LeadSource;
  need: string | null;
  status: LeadStatus;
  lost_reason: string | null;
  note: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  follow_up_at: string | null;
  quoted_at: string | null;
  replied_at: string | null;
  created_at: string;
  last_contact_at: string;
  inquiry_id: string | null;
  contact: { id: string; full_name: string | null; avatar_url: string | null; location: string | null } | null;
  company: { slug: string; name: string } | null;
  events: { body: string; created_at: string }[];
};

const SELECT =
  "id, source, need, status, lost_reason, note, contact_email, contact_phone, follow_up_at, quoted_at, replied_at, created_at, last_contact_at, inquiry_id, contact:profiles!leads_contact_id_fkey(id, full_name, avatar_url, location), company:companies(slug, name), events:lead_events(body, created_at)";

/** The member's leads, newest activity first. null when the leads tables are not in the database yet. */
export async function loadLeads(supabase: SupabaseClient): Promise<Lead[] | null> {
  const { data, error } = await supabase.from("leads").select(SELECT).order("last_contact_at", { ascending: false }).limit(300);
  if (error) {
    if (/leads|relation|schema cache/i.test(error.message)) return null;
    throw new Error(error.message);
  }
  return ((data ?? []) as unknown as Lead[]).map((l) => ({
    ...l,
    events: [...(l.events ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }));
}

/** Leads still waiting for the member's first reply (the feed shortcut's red number). null when there are no leads tables yet. */
export async function leadsWaiting(supabase: SupabaseClient): Promise<number | null> {
  const { count, error } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new").is("replied_at", null);
  return error ? null : count ?? 0;
}
