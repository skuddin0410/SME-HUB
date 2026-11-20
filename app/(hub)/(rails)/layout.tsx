import { ActiveMembersCard, ArticlesCard, GroupsCard, ProfileCard, SocialCard } from "@/components/rails";
import { StickyRail } from "@/components/sticky-rail";

/**
 * Feed-style pages: three columns of 3 / 6 / 3 on a 12-column grid (design: docs/design/feed.html).
 * While the feed scrolls, the left rail stays in view, and on the right the social and newest-members
 * cards scroll away until Groups to Explore reaches the header, which then stays in place.
 * On phones and tablets the rails step aside so the feed comes first.
 */
export default function RailsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <aside className="lg:col-span-3 hidden lg:block">
          <StickyRail pinned className="space-y-4 -mx-1 px-1 pb-1">
            <ProfileCard />
            <ArticlesCard />
          </StickyRail>
        </aside>
        <main className="lg:col-span-6 flex min-w-0 flex-col gap-4">{children}</main>
        <aside className="lg:col-span-3 hidden lg:block">
          <div className="space-y-4">
            <SocialCard />
            <ActiveMembersCard />
          </div>
          <StickyRail className="mt-4">
            <GroupsCard />
          </StickyRail>
        </aside>
      </div>
    </div>
  );
}
