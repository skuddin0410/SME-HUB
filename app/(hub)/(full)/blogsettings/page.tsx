import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { BlogsBody } from "@/components/zip/settings-pages";
import Link from "next/link";
import { BlogDecision } from "@/components/zip/blog-bits";
import { MB_SELECT, when, type MemberBlog } from "@/lib/zip/member-blogs";
import { loadSettings } from "@/lib/zip/settings-load";

export const metadata = { title: "Member blog settings", robots: { index: false } };

export default async function Page() {
  const { supabase, gate } = await teamViewer("Member blog settings");
  if (gate) return gate;
  const initial = await loadSettings(supabase, "blogs");
  const { data } = await supabase.from("member_blogs").select(MB_SELECT).eq("status", "review").order("created_at", { ascending: true }).limit(50);
  const waiting = (data ?? []) as unknown as MemberBlog[];
  const queue = (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="row"><h2 className="grow">Waiting for approval</h2><span className={`pill ${waiting.length ? "warn" : "on"}`}>{waiting.length} waiting</span></div>
      {waiting.length ? waiting.map((p) => (
        <div key={p.id} className="mbrow">
          <div className="stack grow" style={{ gap: 4, minWidth: 0 }}>
            <Link href={`/member-blogs/${p.id}`} style={{ font: "700 15px var(--display)" }}>{p.title}</Link>
            <span className="ameta">{p.author?.full_name} · {p.cat || "No category"} · submitted {when(p.created_at)}</span>
          </div>
          <BlogDecision id={p.id} />
        </div>
      )) : <p className="muted">Nothing is waiting. New submissions appear here.</p>}
    </div>
  );

  return (
    <TeamWrap>
      <TeamHead title="Member blog settings" text="Decide who can write, what every post must include and how posts look. Press Save changes when you are done." />
      <SettingsForm pageKey="blogs" initial={initial}>
        <BlogsBody queue={queue} />
      </SettingsForm>
    </TeamWrap>
  );
}
