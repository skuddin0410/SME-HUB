import Link from "next/link";
import { AUTHOR_FIELDS, requireUser, type Author } from "@/lib/hub";
import { Empty, PageTitle, PersonLine } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";
import { acceptConnection, removeConnection } from "@/app/(hub)/actions";

type Row = { requester_id: string; addressee_id: string; status: "pending" | "accepted"; requester: Author; addressee: Author };

export default async function NetworkPage() {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("connections")
    .select(
      `requester_id, addressee_id, status, requester:profiles!connections_requester_id_fkey(${AUTHOR_FIELDS}), addressee:profiles!connections_addressee_id_fkey(${AUTHOR_FIELDS})`,
    )
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === userId);
  const sent = rows.filter((r) => r.status === "pending" && r.requester_id === userId);
  const connected = rows.filter((r) => r.status === "accepted");
  const other = (r: Row) => (r.requester_id === userId ? r.addressee : r.requester);
  const row = "flex flex-wrap items-center justify-between gap-3 px-4 py-3";

  return (
    <>
      <PageTitle title="My network" />

      {incoming.length > 0 && (
        <section className="panel divide-y">
          <h2 className="px-4 py-3 text-[15px] font-semibold">Waiting for your answer ({incoming.length})</h2>
          {incoming.map((r) => (
            <div key={r.requester_id} className={row}>
              <PersonLine person={r.requester} />
              <div className="flex gap-2">
                <form action={acceptConnection.bind(null, r.requester_id)}>
                  <SubmitButton>Accept</SubmitButton>
                </form>
                <form action={removeConnection.bind(null, r.requester_id)}>
                  <SubmitButton tone="outline">Decline</SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      {sent.length > 0 && (
        <section className="panel divide-y">
          <h2 className="px-4 py-3 text-[15px] font-semibold">Requests you sent ({sent.length})</h2>
          {sent.map((r) => (
            <div key={r.addressee_id} className={row}>
              <PersonLine person={r.addressee} />
              <form action={removeConnection.bind(null, r.addressee_id)}>
                <SubmitButton tone="outline">Cancel request</SubmitButton>
              </form>
            </div>
          ))}
        </section>
      )}

      {connected.length === 0 ? (
        <Empty title="No connections yet">
          <Link href="/members" className="font-semibold text-primary hover:underline">
            Browse members
          </Link>{" "}
          and connect with owners in your city or industry.
        </Empty>
      ) : (
        <section className="panel divide-y">
          <h2 className="px-4 py-3 text-[15px] font-semibold">Connections ({connected.length})</h2>
          {connected.map((r) => (
            <div key={other(r).id} className={row}>
              <PersonLine person={other(r)} />
              <form action={removeConnection.bind(null, other(r).id)}>
                <SubmitButton tone="ghost">Remove</SubmitButton>
              </form>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
