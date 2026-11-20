import Link from "next/link";
import { AvatarImg } from "@/components/hub-client";
import { describeEvent, eventHref, eventPerson, timeAgo, fmtDate, type CmsEvent } from "@/lib/cms-format";
import { Badge, Empty, type Tone } from "@/components/cms/ui";

type Who = { id: string; full_name: string; avatar_url: string | null };

const TONE: Record<string, Tone> = { insert: "green", update: "blue", delete: "rose" };

/** Loads the members an activity list mentions, in one query. */
export async function peopleFor(supabase: { from: (t: string) => any }, events: CmsEvent[]): Promise<Map<string, Who>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ids = [...new Set(events.map(eventPerson).filter(Boolean) as string[])];
  if (!ids.length) return new Map();
  const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
  return new Map(((data ?? []) as Who[]).map((p) => [p.id, p]));
}

export function ActivityList({ events, people, compact = false }: { events: CmsEvent[]; people: Map<string, Who>; compact?: boolean }) {
  if (!events.length) return <Empty>Nothing has happened yet. New activity on the hub appears here as it happens.</Empty>;
  return (
    <ul className="divide-y divide-zinc-100">
      {events.map((e) => {
        const who = people.get(eventPerson(e) ?? "");
        const href = eventHref(e);
        const line = describeEvent(e);
        return (
          <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
            {who ? <AvatarImg person={who} size={28} /> : <span className="h-7 w-7 shrink-0 rounded-full bg-zinc-100" />}
            <div className="min-w-0 flex-1 text-[13px]">
              <p className="truncate text-zinc-900">
                {who && (
                  <Link href={`/cms/members/${who.id}`} className="font-semibold hover:underline">
                    {who.full_name || "Member"}
                  </Link>
                )}
                {who ? " · " : ""}
                {href ? (
                  <Link href={href} className="hover:underline">
                    {line}
                  </Link>
                ) : (
                  line
                )}
              </p>
              {!compact && typeof e.data.body === "string" && <p className="truncate text-[12px] text-zinc-500">“{e.data.body}”</p>}
            </div>
            {!compact && (e.source === "cms" ? <Badge tone="violet">admin</Badge> : <Badge tone={TONE[e.action] ?? "zinc"}>{e.action}</Badge>)}
            <time dateTime={e.at} title={fmtDate(e.at, true)} className="w-16 shrink-0 text-right text-[11.5px] tabular-nums text-zinc-500">
              {timeAgo(e.at)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
