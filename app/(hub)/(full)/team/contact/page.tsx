import Link from "next/link";
import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { ContactRow, type CMsg } from "@/components/zip/contact-team";
import { CTOPICS, topicInbox, topicLabel } from "@/lib/contact";

export const metadata = { title: "Contact messages", robots: { index: false } };

type Params = { show?: string; topic?: string };

export default async function TeamContactPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { supabase, gate } = await teamViewer("Contact messages");
  if (gate) return gate;
  const { show = "open", topic = "" } = await searchParams;
  let q = supabase.from("contact_messages").select("id, name, email, business, topic, message, created_at, handled_at, team_note, user_id").order("created_at", { ascending: false }).limit(300);
  if (show === "open") q = q.is("handled_at", null);
  if (show === "handled") q = q.not("handled_at", "is", null);
  if (CTOPICS.some(([k]) => k === topic) || topic === "other") q = q.eq("topic", topic);
  const [{ data }, openCount] = await Promise.all([q, supabase.from("contact_messages").select("id", { count: "exact", head: true }).is("handled_at", null)]);
  const list: CMsg[] = ((data ?? []) as { id: string; name: string; email: string; business: string | null; topic: string | null; message: string; created_at: string; handled_at: string | null; team_note: string | null; user_id: string | null }[]).map((m) => ({
    id: m.id, name: m.name, email: m.email, business: m.business ?? "", topic: m.topic ?? "other", topicLabel: topicLabel(m.topic ?? "other"), inbox: topicInbox(m.topic ?? "other"),
    message: m.message, created_at: m.created_at, handled_at: m.handled_at, team_note: m.team_note ?? "", member: m.user_id,
  }));
  const href = (p: Params) => { const u = new URLSearchParams(Object.entries({ show, topic, ...p }).filter(([, v]) => v) as [string, string][]); return `/team/contact?${u}`; };
  return (
    <TeamWrap>
      <TeamHead title="Contact messages" text="Messages from the Contact us page. Each one is also emailed to the topic's inbox; replying goes straight to the sender. Mark a message handled when it is done." />
      <nav className="autabs" aria-label="Show">
        {[["open", `Open (${openCount.count ?? 0})`], ["handled", "Handled"], ["all", "All"]].map(([k, l]) => <Link key={k} className="chip" href={href({ show: k })} aria-current={show === k ? "true" : undefined}>{l}</Link>)}
      </nav>
      <nav className="chips" aria-label="Topic" style={{ marginBottom: 16 }}>
        <Link className="chip" href={href({ topic: "" })} aria-current={!topic ? "true" : undefined}>All topics</Link>
        {[...CTOPICS.map(([k, l]) => [k, l]), ["other", "Something else"]].map(([k, l]) => <Link key={k} className="chip" href={href({ topic: k })} aria-current={topic === k ? "true" : undefined}>{l}</Link>)}
      </nav>
      <div className="stack" style={{ gap: 12 }}>
        {list.length ? list.map((m) => <ContactRow key={m.id} m={m} />) : <div className="card"><p className="muted">{show === "open" ? "No open messages. Nice work." : "No messages here."}</p></div>}
      </div>
    </TeamWrap>
  );
}
