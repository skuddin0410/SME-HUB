import { getMe, type Author } from "@/lib/hub";
import { Empty, PersonLine } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { acceptConnection, removeConnection } from "@/app/(hub)/actions";

type Row = { requester_id: string; addressee_id: string; status: "pending" | "accepted"; requester: Author; addressee: Author };

const PERSON = "id, full_name, headline, avatar_url, member_type";

export default async function NetworkPage() {
  const { supabase, userId } = await getMe();
  const { data } = await supabase
    .from("connections")
    .select(
      `requester_id, addressee_id, status, requester:profiles!connections_requester_id_fkey(${PERSON}), addressee:profiles!connections_addressee_id_fkey(${PERSON})`,
    )
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === userId);
  const sent = rows.filter((r) => r.status === "pending" && r.requester_id === userId);
  const connected = rows.filter((r) => r.status === "accepted");
  const other = (r: Row) => (r.requester_id === userId ? r.addressee : r.requester);

  return (
    <>
      <h1 className="text-xl font-bold">My network</h1>

      {incoming.length > 0 && <h2 className="font-semibold">Requests waiting for you</h2>}
      {incoming.map((r) => (
        <Card key={r.requester_id} className="flex items-center justify-between gap-3 p-4">
          <PersonLine person={r.requester} />
          <div className="flex gap-2">
            <form action={acceptConnection.bind(null, r.requester_id)}>
              <Button type="submit" size="sm">
                Accept
              </Button>
            </form>
            <form action={removeConnection.bind(null, r.requester_id)}>
              <Button type="submit" size="sm" variant="outline">
                Decline
              </Button>
            </form>
          </div>
        </Card>
      ))}

      {sent.length > 0 && <h2 className="font-semibold">Requests you sent</h2>}
      {sent.map((r) => (
        <Card key={r.addressee_id} className="flex items-center justify-between gap-3 p-4">
          <PersonLine person={r.addressee} />
          <form action={removeConnection.bind(null, r.addressee_id)}>
            <Button type="submit" size="sm" variant="outline">
              Cancel
            </Button>
          </form>
        </Card>
      ))}

      <h2 className="font-semibold">Connections ({connected.length})</h2>
      {connected.length === 0 && <Empty>No connections yet. Find people in Members and connect.</Empty>}
      {connected.map((r) => (
        <Card key={other(r).id} className="p-4">
          <PersonLine person={other(r)} />
        </Card>
      ))}
    </>
  );
}
