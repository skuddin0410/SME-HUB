import Link from "next/link";
import { getMe } from "@/lib/hub";
import { Empty, fieldClass } from "@/components/hub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createGroup } from "@/app/(hub)/actions";

type Group = {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_private: boolean;
  group_members: { count: number }[];
};

export default async function GroupsPage() {
  const { supabase } = await getMe();
  const { data } = await supabase
    .from("groups")
    .select("id, slug, name, description, is_private, group_members(count)")
    .order("name");
  const groups = (data ?? []) as unknown as Group[];

  return (
    <>
      <h1 className="text-xl font-bold">Groups</h1>
      {groups.length === 0 && <Empty>No groups yet. Start the first one below.</Empty>}
      {groups.map((g) => (
        <Card key={g.id} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/groups/${g.slug}`} className="font-semibold hover:underline">
              {g.name}
            </Link>
            <Badge variant="secondary">{g.is_private ? "Private" : "Public"}</Badge>
            <span className="text-xs text-muted-foreground">{g.group_members[0]?.count ?? 0} members</span>
          </div>
          {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>}
        </Card>
      ))}

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Start a group</h2>
        <form action={createGroup} className="flex flex-col gap-3">
          <input name="name" required maxLength={80} placeholder="Group name" className={fieldClass} />
          <textarea name="description" rows={2} maxLength={500} placeholder="What is this group about?" className={fieldClass} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_private" /> Private (only members see posts)
          </label>
          <Button type="submit" size="sm" className="self-start">
            Create group
          </Button>
        </form>
      </Card>
    </>
  );
}
