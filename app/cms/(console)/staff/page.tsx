import { requireCms, fmtDate, timeAgo, type CmsUser } from "@/lib/cms";
import { ConfirmSubmit } from "@/components/cms/client";
import { BTN_DANGER, BTN_PRIMARY, Card, Empty, INPUT, PageHeader, Person, TABLE, TD, TH } from "@/components/cms/ui";
import { cmsGrantAdmin, cmsRevokeAdmin } from "@/app/cms/actions";

export const metadata = { title: "Admins" };

export default async function CmsStaff() {
  const { supabase, profile: me } = await requireCms();
  const { data, error } = await supabase.rpc("cms_users", { p_role: "admin", p_limit: 200 });
  if (error) throw new Error(error.message);
  const admins = (data ?? []) as CmsUser[];

  return (
    <>
      <PageHeader title="Admins" description="People who can sign in to this CMS and manage the hub." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21.25rem]">
        <Card flush>
          {admins.length === 0 ? (
            <Empty>No admins.</Empty>
          ) : (
            <table className={TABLE}>
              <thead><tr><th className={TH}>Admin</th><th className={TH}>Email</th><th className={TH}>Member since</th><th className={TH}>Last sign-in</th><th className={`${TH} text-right`}>Access</th></tr></thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td className={`${TD} max-w-[15rem]`}><Person person={a} sub={a.id === me.id ? "You" : a.headline} /></td>
                    <td className={`${TD} text-zinc-700`}>{a.email}</td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(a.created_at)}</td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{timeAgo(a.last_sign_in_at)}</td>
                    <td className={`${TD} text-right`}>
                      {a.id === me.id ? (
                        <span className="text-[0.8125rem] text-zinc-400">—</span>
                      ) : (
                        <form action={cmsRevokeAdmin.bind(null, a.id)}>
                          <ConfirmSubmit className={`${BTN_DANGER} h-8 px-2.5`} confirm={`Remove CMS access for ${a.full_name}? Their hub account stays.`}>Remove access</ConfirmSubmit>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Add an admin">
          <form action={cmsGrantAdmin} className="grid gap-3">
            <label className="grid gap-1 text-[0.8438rem] font-medium text-zinc-700">
              Their SMB Hub email
              <input name="email" type="email" required placeholder="name@canadiansme.ca" className={INPUT} />
            </label>
            <ConfirmSubmit className={BTN_PRIMARY} confirm="Give this person full CMS access?">Give CMS access</ConfirmSubmit>
            <p className="text-[0.8125rem] leading-relaxed text-zinc-500">They must already have a hub account. Admins can edit and delete anything, so add only people you trust.</p>
          </form>
        </Card>
      </div>
    </>
  );
}
