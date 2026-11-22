import Link from "next/link";
import { ChevronRight, MessageSquareText } from "lucide-react";
import { AUTHOR_FIELDS, requireUser, type Author } from "@/lib/hub";
import { AvatarImg } from "@/components/hub-client";
import { ConnectButton, Invitations, Suggestions, type Person } from "@/components/network-client";
import { GroupsCard, SocialCard } from "@/components/rails";
import { IntroAnswer } from "@/components/profile-extras";

export const metadata = { title: "My network", robots: { index: false } };

type Row = { requester_id: string; addressee_id: string; status: "pending" | "accepted"; requester: Author; addressee: Author };

export default async function NetworkPage() {
  const { supabase, userId, profile } = await requireUser();
  const [linksRes, peopleRes, groupsRes] = await Promise.all([
    supabase
      .from("connections")
      .select(
        `requester_id, addressee_id, status, requester:profiles!connections_requester_id_fkey(${AUTHOR_FIELDS}), addressee:profiles!connections_addressee_id_fkey(${AUTHOR_FIELDS})`,
      )
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select(`${AUTHOR_FIELDS}, location`).neq("id", userId).order("created_at", { ascending: false }).limit(60),
    supabase.from("group_members").select("group_id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const rows = (linksRes.data ?? []) as unknown as Row[];
  // people asking me to introduce them to one of my connections
  const introRows = (
    await supabase
      .from("intro_requests")
      .select("id, note, requester:profiles!intro_requests_requester_id_fkey(id, full_name), target:profiles!intro_requests_target_id_fkey(id, full_name)")
      .eq("via_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
  ).data as unknown as { id: string; note: string; requester: { id: string; full_name: string }; target: { id: string; full_name: string } }[] | null;
  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === userId).map((r) => r.requester);
  const sent = rows.filter((r) => r.status === "pending" && r.requester_id === userId).map((r) => r.addressee);
  const connected = rows.filter((r) => r.status === "accepted").map((r) => (r.requester_id === userId ? r.addressee : r.requester));

  const linked = new Set(rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id)));
  const everyone = ((peopleRes.data ?? []) as Person[]).filter((p) => !linked.has(p.id));
  const city = profile?.location?.split(",")[0]?.trim();
  const nearby = city ? everyone.filter((p) => p.location?.toLowerCase().includes(city.toLowerCase())) : [];
  const nearbyIds = new Set(nearby.map((p) => p.id));
  const others = everyone.filter((p) => !nearbyIds.has(p.id));

  const stat = "flex-1 rounded px-2 py-1 transition-colors hover:bg-muted";
  const manage = "flex items-center justify-between rounded px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <div className="mx-auto grid max-w-[1360px] items-start gap-6 px-4 sm:px-6 lg:px-8 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rail hidden space-y-2 lg:block">
        <section className="panel p-4">
          <h1 className="text-xl font-semibold">Network overview</h1>
          <div className="mt-3 flex gap-1">
            <a href="#sent" className={stat}>
              <span className="block text-2xl font-normal">{sent.length}</span>
              <span className="text-xs font-semibold">Invites sent</span>
            </a>
            <a href="#connections" className={stat}>
              <span className="block text-2xl font-normal">{connected.length}</span>
              <span className="text-xs font-semibold">Connections</span>
            </a>
            <Link href="/groups" className={stat}>
              <span className="block text-2xl font-normal">{groupsRes.count ?? 0}</span>
              <span className="text-xs font-semibold">Groups</span>
            </Link>
          </div>
        </section>
        <section className="panel py-2">
          {[
            ["Find members", "/members"],
            ["Messages", "/messages"],
            ["Explore businesses", "/businesses"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className={manage}>
              {label}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ))}
        </section>
        <GroupsCard />
        <SocialCard />
      </aside>

      <main className="flex min-w-0 flex-col gap-2">
        <Invitations people={incoming} />

        {(introRows ?? []).length > 0 && (
          <section className="panel" aria-labelledby="intros">
            <h2 id="intros" className="px-4 py-3 text-base font-semibold">Introduction requests ({introRows!.length})</h2>
            {introRows!.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <p className="min-w-0 text-sm">
                  <Link href={`/members/${r.requester.id}`} className="font-semibold hover:underline">{r.requester.full_name}</Link> would like to meet{" "}
                  <Link href={`/members/${r.target.id}`} className="font-semibold hover:underline">{r.target.full_name}</Link>.
                  <span className="mt-1 block text-muted-foreground">{r.note}</span>
                </p>
                <IntroAnswer id={r.id} />
              </div>
            ))}
          </section>
        )}

        {nearby.length > 0 && <Suggestions title={`People you may know in ${city}`} people={nearby} signedIn visible={4} />}
        <Suggestions title={nearby.length ? "More people on SMB Hub" : "People you may know"} people={others} signedIn />

        {sent.length > 0 && (
          <section id="sent" className="panel scroll-mt-24">
            <h2 className="px-4 py-3 text-base font-semibold">Invitations you sent ({sent.length})</h2>
            {sent.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <Link href={`/members/${p.id}`} className="flex min-w-0 items-center gap-3">
                  <AvatarImg person={p} size={48} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold hover:underline">{p.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.headline}</span>
                  </span>
                </Link>
                <ConnectButton otherId={p.id} initial="sent" signedIn />
              </div>
            ))}
          </section>
        )}

        <section id="connections" className="panel scroll-mt-24">
          <h2 className="px-4 py-3 text-base font-semibold">Your connections ({connected.length})</h2>
          {connected.length === 0 && (
            <p className="border-t px-4 py-8 text-center text-sm text-muted-foreground">
              No connections yet. Press Connect on anyone above and they will get an invitation.
            </p>
          )}
          {connected.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 transition-colors hover:bg-muted/50">
              <Link href={`/members/${p.id}`} className="flex min-w-0 items-center gap-3">
                <AvatarImg person={p} size={56} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold hover:underline">{p.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{p.headline}</span>
                </span>
              </Link>
              <Link
                href={`/messages?with=${p.id}`}
                className="press inline-flex items-center gap-1.5 rounded-xl border border-primary px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <MessageSquareText className="h-4 w-4" />
                Message
              </Link>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
