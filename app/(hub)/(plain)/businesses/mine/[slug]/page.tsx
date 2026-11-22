import Link from "next/link";
import { notFound } from "next/navigation";
import { getLinks, requireUser } from "@/lib/hub";
import { PageTitle } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";
import { BusinessForm } from "@/components/business-form";
import { DetailsForm, EventForm, JobForm, PhotoForm, ProductForm, ServiceForm, TeamAdd, type DetailsValues } from "@/components/business-manage";
import { deleteEvent, deleteJob, deletePhoto, deleteProduct, deleteService, removeTeamMember, setTeamRole, submitBusiness } from "@/app/(hub)/business-actions";
import { ROLES, ROLE_CAN, STATUS_LABEL, money } from "@/lib/business";
import { getBusinessSettings } from "@/lib/business-server";

export const dynamic = "force-dynamic";

export default async function ManageBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const { supabase, userId, isStaff } = await requireUser();
  const { data } = await supabase.from("companies").select("*").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const c = data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [{ data: roleRow }, { data: priv }, { data: services }, { data: team }, { count: unread }] = await Promise.all([
    supabase.from("business_team").select("role").eq("company_id", c.id).eq("user_id", userId).maybeSingle(),
    supabase.from("business_private").select("street, postal, email, phone, whatsapp").eq("company_id", c.id).maybeSingle(),
    supabase.from("business_services").select("id, name, description, price_type, price").eq("company_id", c.id).order("position").order("name"),
    supabase.from("business_team").select("user_id, role, member:profiles!business_team_user_id_fkey(full_name)").eq("company_id", c.id).order("added_at"),
    supabase.from("business_inquiries").select("id", { count: "exact", head: true }).eq("company_id", c.id).eq("status", "open"),
  ]);
  const role = (roleRow as { role: string } | null)?.role ?? null;
  const canEdit = isStaff || role === "owner" || role === "manager";
  if (!canEdit) notFound();
  const isOwner = isStaff || role === "owner";
  const settings = await getBusinessSettings();
  const [photos, products, jobs, events] = await Promise.all([
    settings.tabs.photos ? supabase.from("business_photos").select("id, url, caption").eq("company_id", c.id).order("position").order("created_at") : { data: [] },
    settings.tabs.shop ? supabase.from("business_products").select("id, name, price, available").eq("company_id", c.id).order("position").order("created_at") : { data: [] },
    settings.tabs.jobs ? supabase.from("business_jobs").select("id, title, job_type, open").eq("company_id", c.id).order("created_at", { ascending: false }) : { data: [] },
    settings.tabs.events ? supabase.from("business_events").select("id, title, starts_at").eq("company_id", c.id).order("starts_at") : { data: [] },
  ]);
  const Row = ({ label, remove }: { label: React.ReactNode; remove: () => Promise<void> }) => (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="min-w-0 truncate">{label}</span>
      <form action={remove}>
        <SubmitButton tone="danger" className="!px-3 !py-1">Remove</SubmitButton>
      </form>
    </li>
  );

  // people the owner can add: their connections who are not on the team yet
  const onTeam = new Set(((team ?? []) as { user_id: string }[]).map((t) => t.user_id));
  const connected = [...(await getLinks())].filter(([id, v]) => v === "connected" && !onTeam.has(id)).map(([id]) => id);
  const { data: candidates } = isOwner && connected.length ? await supabase.from("profiles").select("id, full_name").in("id", connected).order("full_name").limit(100) : { data: [] };

  const details: DetailsValues = {
    id: c.id, about: c.about, tz: c.tz, service_area: c.service_area, show_address: c.show_address, show_email: c.show_email,
    show_phone: c.show_phone, show_whatsapp: c.show_whatsapp, booking_url: c.booking_url, primary_action: c.primary_action,
    appointments: c.appointments, hours: c.hours ?? {}, closures: c.closures ?? [], social: c.social ?? {},
    street: priv?.street ?? "", postal: priv?.postal ?? "", email: priv?.email ?? "", phone: priv?.phone ?? "", whatsapp: priv?.whatsapp ?? "",
  };
  const canSubmit = ["draft", "rejected"].includes(c.status);

  return (
    <>
      <PageTitle title={c.name}>
        <span className="flex gap-3 text-sm font-semibold">
          <Link href={`/businesses/${c.slug}`} className="text-primary hover:underline">View page</Link>
          <Link href={`/businesses/mine/${c.slug}/inbox`} className="text-primary hover:underline">Inbox{unread ? ` (${unread})` : ""}</Link>
        </span>
      </PageTitle>

      <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold">Status: {STATUS_LABEL[c.status] ?? c.status}</p>
          <p className="text-xs text-muted-foreground">
            {c.status === "draft" && (settings.pub_approval ? "Send your page to the team for approval when it is ready." : "Publish your page when it is ready.")}
            {c.status === "pending" && "The team is reviewing your page."}
            {c.status === "published" && "Your page is live in the directory."}
            {c.status === "rejected" && "The team did not approve this page. Update it and send it again."}
          </p>
        </div>
        {canSubmit && (
          <form action={submitBusiness.bind(null, c.id)}>
            <SubmitButton>{settings.pub_approval ? "Send for approval" : "Publish page"}</SubmitButton>
          </form>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="mb-4 text-base font-semibold">Basics</h2>
        <BusinessForm key={c.updated_at} categories={settings.categories} values={{ id: c.id, name: c.name, kind: c.kind, category: c.category, city: c.city, province: c.province, description: c.description, website: c.website }} />
      </section>

      <section className="panel p-5">
        <h2 className="mb-4 text-base font-semibold">Hours, contacts and buttons</h2>
        <DetailsForm key={c.updated_at} v={details} />
      </section>

      <section className="panel p-5">
        <h2 className="mb-3 text-base font-semibold">Services</h2>
        <ul className="mb-4 divide-y">
          {((services ?? []) as { id: string; name: string; price_type: string; price: number | null }[]).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                {s.name} · <span className="text-muted-foreground">{s.price_type === "quote" ? "Ask for a quote" : `${s.price_type === "from" ? "From " : ""}${money(s.price)}`}</span>
              </span>
              <form action={deleteService.bind(null, s.id)}>
                <SubmitButton tone="danger" className="!px-3 !py-1">Remove</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <ServiceForm companyId={c.id} />
      </section>

      {settings.tabs.photos && (
        <section className="panel p-5">
          <h2 className="mb-3 text-base font-semibold">Photos</h2>
          <ul className="mb-4 divide-y">
            {((photos.data ?? []) as { id: string; caption: string }[]).map((x) => <Row key={x.id} label={x.caption || "Photo"} remove={deletePhoto.bind(null, x.id)} />)}
          </ul>
          <PhotoForm companyId={c.id} />
        </section>
      )}

      {settings.tabs.shop && (
        <section className="panel p-5">
          <h2 className="mb-3 text-base font-semibold">Shop</h2>
          <ul className="mb-4 divide-y">
            {((products.data ?? []) as { id: string; name: string; price: number; available: boolean }[]).map((x) => <Row key={x.id} label={`${x.name} · ${money(x.price)}${x.available ? "" : " · sold out"}`} remove={deleteProduct.bind(null, x.id)} />)}
          </ul>
          <ProductForm companyId={c.id} />
        </section>
      )}

      {settings.tabs.jobs && (
        <section className="panel p-5">
          <h2 className="mb-3 text-base font-semibold">Jobs</h2>
          <ul className="mb-4 divide-y">
            {((jobs.data ?? []) as { id: string; title: string; job_type: string }[]).map((x) => <Row key={x.id} label={`${x.title} · ${x.job_type}`} remove={deleteJob.bind(null, x.id)} />)}
          </ul>
          <JobForm companyId={c.id} />
        </section>
      )}

      {settings.tabs.events && (
        <section className="panel p-5">
          <h2 className="mb-3 text-base font-semibold">Events</h2>
          <ul className="mb-4 divide-y">
            {((events.data ?? []) as { id: string; title: string; starts_at: string }[]).map((x) => <Row key={x.id} label={`${x.title} · ${new Date(x.starts_at).toLocaleDateString("en-CA", { timeZone: c.tz })}`} remove={deleteEvent.bind(null, x.id)} />)}
          </ul>
          <EventForm companyId={c.id} />
        </section>
      )}

      <section className="panel p-5">
        <h2 className="mb-3 text-base font-semibold">Team</h2>
        <ul className="mb-4 divide-y">
          {((team ?? []) as unknown as { user_id: string; role: keyof typeof ROLES; member: { full_name: string } | null }[]).map((t) => (
            <li key={t.user_id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
              <span>
                {t.member?.full_name ?? "Member"} <span className="text-muted-foreground">· {ROLE_CAN[t.role]}</span>
              </span>
              {isOwner && t.role !== "owner" ? (
                <span className="flex items-center gap-2">
                  {(["manager", "editor", "responder"] as const).map((r) => (
                    <form key={r} action={setTeamRole.bind(null, c.id, t.user_id, r)}>
                      <button type="submit" aria-pressed={t.role === r} className={`rounded-full border px-3 py-1 text-xs font-semibold ${t.role === r ? "border-primary bg-primary/10" : "hover:bg-muted"}`}>{ROLES[r]}</button>
                    </form>
                  ))}
                  <form action={removeTeamMember.bind(null, c.id, t.user_id)}>
                    <SubmitButton tone="danger" className="!px-3 !py-1">Remove</SubmitButton>
                  </form>
                </span>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">{ROLES[t.role]}</span>
              )}
            </li>
          ))}
        </ul>
        {isOwner && <TeamAdd companyId={c.id} candidates={(candidates ?? []) as { id: string; full_name: string }[]} />}
      </section>
    </>
  );
}
