import { ActiveMembersCard, ArticlesCard, GroupsCard, ProfileCard, SocialCard } from "@/components/rails";

/** Feed-style pages: fixed left and right rails, the centre column scrolls. */
export default function RailsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1260px] items-start gap-6 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
      <aside className="rail hidden space-y-2 lg:block">
        <ProfileCard />
        <ArticlesCard />
      </aside>
      <main className="flex min-w-0 flex-col gap-2">{children}</main>
      <aside className="rail hidden space-y-2 lg:block">
        <SocialCard />
        <ActiveMembersCard />
        <GroupsCard />
      </aside>
    </div>
  );
}
