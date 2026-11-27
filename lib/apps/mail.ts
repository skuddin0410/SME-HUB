import "server-only";
import { commonVars, renderEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/courses-mail";
import { serviceClient } from "@/lib/supabase/service";

export type Person = { id: string; email: string; name: string; first: string; headline: string; avatar: string | null };

/** Name, email and headline for people we email (the address needs the service key). */
export async function people(ids: string[]): Promise<Map<string, Person>> {
  const out = new Map<string, Person>();
  const db = serviceClient();
  if (!db || !ids.length) return out;
  const uniq = [...new Set(ids)];
  const { data } = await db.from("profiles").select("id, full_name, headline, avatar_url").in("id", uniq);
  const prof = new Map(((data ?? []) as { id: string; full_name: string | null; headline: string | null; avatar_url: string | null }[]).map((p) => [p.id, p]));
  await Promise.all(uniq.map(async (id) => {
    try {
      const { data: u } = await db.auth.admin.getUserById(id);
      const p = prof.get(id);
      const name = p?.full_name?.trim() || "SME Hub member";
      out.set(id, { id, email: u.user?.email ?? "", name, first: name.split(/\s+/)[0], headline: p?.headline ?? "", avatar: p?.avatar_url ?? null });
    } catch {
      /* skip */
    }
  }));
  return out;
}

/**
 * Sends one Update 36 email. Never throws: a failed email must not undo a booking or a registration.
 * With `once`, the email goes at most once (mail_sent), so a retried request or a second cron run can't repeat it.
 */
export async function mail(id: string, to: Person | undefined | null, vars: Record<string, unknown>, opts: { key?: string; once?: string; ics?: { name: string; body: string; method?: string } } = {}) {
  if (!to?.email) return false;
  const db = serviceClient();
  if (opts.once && db) {
    const { error } = await db.from("mail_sent").insert({ key: opts.once.slice(0, 200) });
    if (error) return false; // already sent (or the table isn't there yet)
  }
  try {
    const msg = await renderEmail(id, { ...commonVars(siteUrl(), to.name), ...vars });
    await sendEmail({
      to: to.email,
      idempotencyKey: opts.key ?? opts.once,
      ...msg,
      ...(opts.ics ? { attachments: [{ filename: opts.ics.name, content: opts.ics.body, contentType: `text/calendar; charset=utf-8; method=${opts.ics.method ?? "REQUEST"}` }] } : {}),
    });
    return true;
  } catch (e) {
    console.error(`email ${id}:`, (e as Error).message);
    if (opts.once && db) await db.from("mail_sent").delete().eq("key", opts.once.slice(0, 200));
    return false;
  }
}
