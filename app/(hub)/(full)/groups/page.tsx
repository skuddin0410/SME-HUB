import { Crumbs } from "@/components/zip/crumbs";
import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { getGroupSettings } from "@/lib/groups-server";
import { pageMeta } from "@/lib/seo";
import { Ic } from "@/components/zip/ic";
import { Scene } from "@/components/zip/scene";
import { ZipAv } from "@/components/zip/bits";
import { LiveForm } from "@/components/zip/live-form";
import { JoinBtn, StartGroup } from "@/components/zip/groups-client";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "Groups", description: "Join groups on SME Hub to talk with other Canadian business owners about your industry, city or topic.", path: "/groups" });

type Group = {
  id: string; slug: string; name: string; description: string; is_private: boolean; category: string; cover: string; join_mode: string;
  status: string; created_by: string; created_at: string; group_members: { count: number }[]; host: { full_name: string | null } | null;
};
type Extra = { group_id: string; posts_week: number; faces: { id: string; name: string; avatar: string | null }[] };

const SORTS = [["active", "Most active"], ["members", "Most members"], ["name", "Name, A to Z"], ["new", "Newest"]] as const;

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; sort?: string }> }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const { supabase, userId } = viewer;
  const s = await getGroupSettings();
  const q = (sp.q ?? "").replace(/[^\p{L}\p{N} '-]/gu, "").slice(0, 60);
  const cat = sp.cat === "__priv" || s.types.includes(sp.cat ?? "") ? sp.cat! : "";
  const sort = SORTS.some(([v]) => v === sp.sort) ? sp.sort! : "active";

  const { data } = await supabase
    .from("groups")
    .select("id, slug, name, description, is_private, category, cover, join_mode, status, created_by, created_at, group_members(count), host:profiles!groups_created_by_fkey(full_name)")
    .in("status", ["active", "pending"]);
  const all = (data ?? []) as unknown as Group[];
  const pending = all.filter((g) => g.status === "pending" && g.created_by === userId);
  const active = all.filter((g) => g.status === "active");
  const count = (g: Group) => g.group_members[0]?.count ?? 0;

  const [extraRes, memRes, reqRes, invRes] = await Promise.all([
    supabase.rpc("group_card_extras", { p_ids: active.map((g) => g.id) }),
    userId ? supabase.from("group_members").select("group_id").eq("user_id", userId) : null,
    userId ? supabase.from("group_join_requests").select("group_id, status").eq("user_id", userId) : null,
    userId ? supabase.from("group_invites").select("group_id").eq("user_id", userId) : null,
  ]);
  const extras = new Map(((extraRes.data ?? []) as Extra[]).map((e) => [e.group_id, e]));
  const memberOf = new Set((memRes?.data ?? []).map((m) => m.group_id as string));
  const requested = new Set((reqRes?.data ?? []).filter((r) => r.status === "pending").map((r) => r.group_id as string));
  const invitedTo = new Set((invRes?.data ?? []).map((i) => i.group_id as string));
  const week = (g: Group) => extras.get(g.id)?.posts_week ?? 0;

  const needle = q.toLowerCase();
  const list = active
    .filter((g) => (cat === "__priv" ? g.is_private : !cat || g.category === cat) && (!needle || `${g.name} ${g.description}`.toLowerCase().includes(needle)))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "members" ? count(b) - count(a) : sort === "new" ? b.created_at.localeCompare(a.created_at) : week(b) - week(a) || a.name.localeCompare(b.name)));
  const mine = active.filter((g) => memberOf.has(g.id) || g.created_by === userId);
  const waiting = active.filter((g) => invitedTo.has(g.id) && !memberOf.has(g.id));
  const total = active.reduce((n, g) => n + count(g), 0);
  const plan = (viewer.profile as { plan?: string } | null)?.plan ?? "free";
  const canPrivate = plan !== "free" || s.create_private === "all";
  const types = s.types.filter((t) => active.some((g) => g.category === t));
  const href = (over: Record<string, string>) => `/groups?${new URLSearchParams({ ...(q ? { q } : {}), ...(cat ? { cat } : {}), sort, ...over }).toString()}`;
  const joinOf = (g: Group) => <JoinBtn groupId={g.id} slug={g.slug} mode={g.join_mode} priv={g.is_private} joined={memberOf.has(g.id)} host={g.created_by === userId} requested={requested.has(g.id)} signedIn={!!userId} />;
  const hostName = (g: Group) => (g.created_by === userId ? "you" : (g.host?.full_name ?? "").split(" ")[0]);

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <section className="bizhead grphead" aria-label="Groups">
          <div className="txt">
            <Crumbs items={[["Groups"]]} />
            <h1>Find the owners who face what you face</h1>
            <p>Small, focused groups by topic, industry and community. Join a few, ask your question, and get answers from people who have been there.</p>
            <LiveForm className="srow" role="search">
              <label className="sr" htmlFor="gq">Search groups</label>
              <input id="gq" name="q" className="field" type="search" placeholder="Search groups, such as tax, hiring or retail" defaultValue={q} />
              {cat && <input type="hidden" name="cat" value={cat} />}
              <input type="hidden" name="sort" value={sort} />
              <StartGroup s={s} canPrivate={canPrivate} signedIn={!!userId} />
            </LiveForm>
            <div className="stats">
              <span><b>{active.length}</b> groups</span>
              <span><b>{total.toLocaleString("en-CA")}</b> memberships</span>
              <span><b>{mine.length}</b> joined by you</span>
            </div>
          </div>
          <div className="tiles" aria-hidden="true"><div><Scene n="nodes" h={170} /></div><div><Scene n="bars" h={300} /></div><div><Scene n="awning" h={300} /></div></div>
        </section>

        {pending.length > 0 && (
          <div className="card" style={{ marginBottom: 16, borderColor: "#FCD34D", background: "#FFFBEB" }}>
            <h2 style={{ fontSize: 15 }}>Waiting for team approval</h2>
            <p className="muted small">{pending.map((g) => g.name).join(", ")}</p>
          </div>
        )}
        {waiting.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h2>You have been invited ({waiting.length})</h2>
            <div className="list">
              {waiting.map((g) => (
                <div key={g.id} className="row"><span className="grow"><strong>{g.name}</strong></span><Link href={`/groups/${g.slug}`} className="btn sm">View invitation</Link></div>
              ))}
            </div>
          </div>
        )}

        {userId && mine.length > 0 && (
          <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
            <h2 style={{ font: "700 15px var(--display)" }}>Your groups</h2>
            <div className="mygroups">
              {mine.map((g) => (
                <Link key={g.id} href={`/groups/${g.slug}`} className="mygroup"><span className="gthumb"><Scene n={g.cover} h={80} /></span>{g.name}{g.is_private && <Ic n="lock" s={12} />}</Link>
              ))}
            </div>
          </div>
        )}

        <div className="tools" style={{ marginBottom: 14 }}>
          <div className="chips grow" role="group" aria-label="Type of group">
            <Link href={href({ cat: "" })} className="chip" aria-current={!cat ? "true" : undefined}>All ({active.length})</Link>
            {types.map((t) => <Link key={t} href={href({ cat: t })} className="chip" aria-current={cat === t ? "true" : undefined}>{t}</Link>)}
            <Link href={href({ cat: "__priv" })} className="chip" aria-current={cat === "__priv" ? "true" : undefined}><Ic n="lock" s={12} />Private</Link>
          </div>
          <span className="muted small">{list.length} {list.length === 1 ? "group" : "groups"}</span>
          <LiveForm>
            <label className="sr" htmlFor="gsort">Sort groups</label>
            {q && <input type="hidden" name="q" value={q} />}
            {cat && <input type="hidden" name="cat" value={cat} />}
            <select id="gsort" name="sort" className="field" style={{ flex: "0 0 170px", width: 170 }} defaultValue={sort}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </LiveForm>
        </div>

        {list.length === 0 ? (
          <div className="card">
            <strong>No groups match.</strong>
            <p className="muted">Try another word, or start the group you are looking for.</p>
            <div className="row"><Link href="/groups" className="btn sm ghost">Clear search</Link><StartGroup s={s} canPrivate={canPrivate} signedIn={!!userId} className="btn sm" /></div>
          </div>
        ) : s.layout === "list" ? (
          <div className="card" style={{ gap: 0 }}>
            {list.map((g) => (
              <div key={g.id} className="mbrow">
                <span className="th"><Scene n={g.cover} h={300} /></span>
                <div className="stack grow" style={{ gap: 4, minWidth: 0 }}>
                  <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>{s.card.cat && <span className="acat">{g.category}</span>}{g.is_private && <span className="tag" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Ic n="lock" s={11} />Private</span>}</span>
                  <Link href={`/groups/${g.slug}`} className="atitle" style={{ font: "700 16px/1.3 var(--display)" }}>{g.name}</Link>
                  {s.card.desc && <span className="muted small">{g.description}</span>}
                  <span className="ameta">{[s.card.count ? `${count(g)} members` : "", s.card.act ? `${week(g)} posts this week` : "", s.card.host && hostName(g) ? `Hosted by ${hostName(g)}` : ""].filter(Boolean).join(" · ")}</span>
                </div>
                {joinOf(g)}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid">
            {list.map((g) => {
              const faces = extras.get(g.id)?.faces ?? [];
              return (
                <div key={g.id} className="card grpcard">
                  <div className="cover">
                    <Scene n={g.cover} h={150} />
                    {s.card.cat && <span className="gcat">{g.category}</span>}
                    {g.is_private && <span className="gcat" style={{ left: "auto", right: 10, display: "flex", gap: 4, alignItems: "center" }}><Ic n="lock" s={11} />Private</span>}
                  </div>
                  <h2 style={{ fontSize: 16 }}><Link href={`/groups/${g.slug}`} className="namebtn" style={{ font: "inherit" }}>{g.name}</Link></h2>
                  {s.card.desc ? <p className="muted small" style={{ flex: 1 }}>{g.description}</p> : <span style={{ flex: 1 }} />}
                  {s.card.count && (
                    <div className="gstat">
                      <span className="faces">{faces.slice(0, 4).map((f) => <ZipAv key={f.id} name={f.name || "M"} src={f.avatar} size="s" />)}</span>
                      <span><b style={{ color: "var(--ink)" }}>{count(g)}</b> {count(g) === 1 ? "member" : "members"}</span>
                    </div>
                  )}
                  {(s.card.act || s.card.host) && (
                    <div className="gstat">
                      {s.card.act && <span><span className="live" />{week(g)} posts this week</span>}
                      {s.card.host && hostName(g) && <span>{s.card.act ? "· " : ""}Hosted by {hostName(g)}</span>}
                    </div>
                  )}
                  <div className="row" style={{ marginTop: 4 }}>{joinOf(g)}<Link href={`/groups/${g.slug}`} className="btn sm ghost">Open group</Link></div>
                </div>
              );
            })}
          </div>
        )}

        <div className="band">
          <div className="stack grow" style={{ flexBasis: 380, gap: 6 }}>
            <h2 style={{ fontSize: 18 }}>Do not see your group?</h2>
            <p>Any member can ask for a public group. Plus members and Advisors can also open a private group of their own.</p>
          </div>
          <StartGroup s={s} canPrivate={canPrivate} signedIn={!!userId} className="btn light" />
        </div>
      </div>
    </div>
  );
}
