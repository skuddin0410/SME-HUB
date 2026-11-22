import { requireUser } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { loadOwnDetails } from "@/lib/profile-data";
import { DeleteAccountForm, PrivacyForm, UnblockButton } from "@/components/profile-extras";

export const metadata = pageMeta({ title: "Settings", description: "Privacy, blocked members and your data on SMB Hub.", path: "/settings", index: false });

export default async function SettingsPage() {
  const { supabase, userId } = await requireUser();
  const [details, blocked] = await Promise.all([
    loadOwnDetails(supabase, userId),
    supabase.from("blocks").select("blocked_id, blocked:profiles!blocks_blocked_id_fkey(full_name, headline)").eq("blocker_id", userId),
  ]);
  const rows = (blocked.data ?? []) as unknown as { blocked_id: string; blocked: { full_name: string; headline: string } | null }[];

  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="panel p-6" aria-labelledby="privacy">
        <h2 id="privacy" className="text-xl font-semibold">Privacy</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">Choose who can see each part of your profile. Anything you do not change is public.</p>
        <PrivacyForm details={details} />
      </section>

      <section className="panel p-6" aria-labelledby="blocked">
        <h2 id="blocked" className="text-xl font-semibold">Blocked members</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">You have not blocked anyone.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {rows.map((r) => (
              <li key={r.blocked_id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold">{r.blocked?.full_name || "Member"}</span>
                  {r.blocked?.headline && <span className="block truncate text-sm text-muted-foreground">{r.blocked.headline}</span>}
                </span>
                <UnblockButton id={r.blocked_id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel p-6" aria-labelledby="data">
        <h2 id="data" className="text-xl font-semibold">Your data</h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">Download your profile, posts, comments, connections, recommendations and messages as one file.</p>
        <a href="/settings/export" download className="press inline-flex h-8 items-center rounded-xl border border-primary px-4 text-base font-semibold text-primary hover:bg-primary/10">
          Download my data
        </a>
      </section>

      <section className="panel border-rose-200 p-6" aria-labelledby="delete">
        <h2 id="delete" className="text-xl font-semibold">Delete account</h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">This removes your profile, posts, messages and connections for good. It cannot be undone.</p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
