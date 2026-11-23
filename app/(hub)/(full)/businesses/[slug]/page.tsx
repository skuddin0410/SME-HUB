/* eslint-disable @next/next/no-img-element */
import { absolute, jsonLd, pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { Scene } from "@/components/zip/scene";
import { ShareBtn, ZipFollow, ZipStars } from "@/components/zip/biz-client";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import { AUTHOR_FIELDS, fetchPosts, getViewer, type Author } from "@/lib/hub";
import { ACTIONS, DAYS, DAY_LABEL, KINDS, STATUS_LABEL, dayLine, money, type Hours } from "@/lib/business";
import { getBusinessSettings } from "@/lib/business-server";
import { Empty, PostCard } from "@/components/hub";
import { Reviews, type Review } from "@/components/business-client";
import { ClaimForm, InquiryForm } from "@/components/business-manage";

type Company = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  about: string;
  website: string;
  logo_url: string | null;
  cover_url: string | null;
  kind: keyof typeof KINDS;
  status: string;
  city: string;
  province: string;
  tz: string;
  service_area: string;
  booking_url: string;
  primary_action: keyof typeof ACTIONS;
  appointments: boolean;
  hours: Hours;
  closures: { date: string }[];
  social: Record<string, string>;
  claimable: boolean;
  owner_id: string;
};

const ALL_TABS = ["feed", "services", "about", "reviews", "photos", "shop", "events", "jobs"] as const;
type Tab = (typeof ALL_TABS)[number];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { title: "Business not found" };
  const { supabase } = await getViewer();
  const { data } = await supabase.from("companies").select("name, category, description, logo_url, cover_url, city, province, status").eq("slug", slug).maybeSingle();
  if (!data) return { title: "Business not found" };
  const where = data.city ? ` in ${data.city}, ${data.province}` : "";
  return pageMeta({
    title: data.category ? `${data.name} - ${data.category}${where}` : data.name,
    description: data.description || `${data.name}${where} is listed in the SMB Hub business directory.`,
    path: `/businesses/${slug}`,
    image: data.cover_url || data.logo_url,
    // only published pages belong in search results; a draft seen by its team stays out
    index: data.status === "published",
  });
}

export default async function BusinessPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { slug } = await params;
  const { tab: rawTab } = await searchParams;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const { supabase, userId, profile, isStaff } = await getViewer();
  const settings = await getBusinessSettings();
  // photos, shop, events and jobs only show when staff keep that tab switched on
  const TABS = ALL_TABS.filter((t) => !(t in settings.tabs) || settings.tabs[t as keyof typeof settings.tabs]);
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "feed";

  const { data } = await supabase.from("companies").select("*").eq("slug", slug).maybeSingle();
  const company = data as unknown as Company | null;
  if (!company) notFound();

  const [roleRes, contactRes, followers, openRes, servicesRes, reviewRes, replyRes, claimRes, followRes] = await Promise.all([
    userId ? supabase.from("business_team").select("role").eq("company_id", company.id).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc("business_contact", { cid: company.id }),
    supabase.rpc("business_follower_count", { cid: company.id }),
    supabase.rpc("business_is_open", { p_hours: company.hours, p_closures: company.closures, p_tz: company.tz }),
    supabase.from("business_services").select("id, name, description, photo_url, price_type, price").eq("company_id", company.id).order("position").order("name"),
    supabase.from("company_reviews").select(`rating, body, created_at, criteria, status, author:profiles!company_reviews_author_id_fkey(${AUTHOR_FIELDS})`).eq("company_id", company.id).order("created_at", { ascending: false }),
    supabase.from("business_review_replies").select("review_author_id, body").eq("company_id", company.id),
    userId && company.claimable ? supabase.from("business_claims").select("id").eq("company_id", company.id).eq("user_id", userId).eq("status", "pending").maybeSingle() : Promise.resolve({ data: null }),
    userId ? supabase.from("business_follows").select("company_id").eq("company_id", company.id).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const role = (roleRes.data as { role: string } | null)?.role ?? null;
  const canEdit = isStaff || role === "owner" || role === "manager";
  const canReply = canEdit;
  const onTeam = !!role;
  const contact = ((contactRes.data ?? []) as { street: string | null; postal: string | null; email: string | null; phone: string | null; whatsapp: string | null }[])[0] ?? null;
  const isOpen = openRes.data === true;
  const services = (servicesRes.data ?? []) as { id: string; name: string; description: string; photo_url: string | null; price_type: string; price: number | null }[];
  const replies = new Map(((replyRes.data ?? []) as { review_author_id: string; body: string }[]).map((r) => [r.review_author_id, r.body]));
  const reviews: Review[] = ((reviewRes.data ?? []) as unknown as (Omit<Review, "reply">)[]).map((r) => ({ ...r, criteria: r.criteria ?? {}, reply: replies.get(r.author.id) ?? null }));
  const visibleReviews = reviews.filter((r) => r.status === "published");
  const average = visibleReviews.length ? visibleReviews.reduce((n, r) => n + r.rating, 0) / visibleReviews.length : 0;
  const tabRows = async (table: string, select: string, order: string, asc = true) =>
    ((await supabase.from(table).select(select).eq("company_id", company.id).order(order, { ascending: asc }).limit(60)).data ?? []) as unknown as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const photos = tab === "photos" ? await tabRows("business_photos", "id, url, caption", "position") : [];
  const products = tab === "shop" ? await tabRows("business_products", "id, name, description, photo_url, price, available", "position") : [];
  const events = tab === "events" ? await tabRows("business_events", "id, title, description, starts_at, ends_at, location, url", "starts_at") : [];
  const jobs = tab === "jobs" ? await tabRows("business_jobs", "id, title, description, job_type, location, apply_url, open", "created_at", false) : [];
  const posts = tab === "feed" ? await fetchPosts(supabase, userId, { businessId: company.id, limit: 20 }) : [];
  const site = company.website && (company.website.startsWith("http") ? company.website : `https://${company.website}`);
  const me: Author | null = profile ? { id: profile.id, full_name: profile.full_name, headline: profile.headline, avatar_url: profile.avatar_url, member_type: profile.member_type } : null;
  const published = company.status === "published";
  const where = company.city ? `${company.city}, ${company.province}` : "";
  const viewer = { userId, isStaff, profile };

  const acts: { href: string; label: string; external?: boolean }[] = [];
  const messageAct = { href: `/businesses/${slug}?tab=about#contact`, label: "Message business" };
  const callAct = contact?.phone ? { href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`, label: `Call ${contact.phone}` } : null;
  const webAct = site ? { href: site, label: "Visit website", external: true } : null;
  const bookAct = company.booking_url ? { href: company.booking_url, label: "Book", external: true } : null;
  const ordered = { call: [callAct, messageAct, webAct, bookAct], web: [webAct, messageAct, callAct, bookAct], book: [bookAct, messageAct, callAct, webAct] }[company.primary_action as "call" | "web" | "book"] ?? [messageAct, callAct, webAct, bookAct];
  for (const x of ordered) if (x && !acts.some((y) => y.label === x.label)) acts.push(x);
  const SCENES = ["bakery", "laptop", "solar", "truck", "bars", "nodes", "ship", "awning"];
  const scene = SCENES[[...company.id].reduce((n, c) => n + c.charCodeAt(0), 0) % SCENES.length];

  const ld = {
    "@type": "LocalBusiness",
    name: company.name,
    description: company.description || undefined,
    url: absolute(`/businesses/${slug}`),
    image: company.cover_url ?? company.logo_url ?? undefined,
    logo: company.logo_url ?? undefined,
    sameAs: [site, ...Object.values(company.social)].filter(Boolean),
    telephone: contact?.phone ?? undefined,
    email: contact?.email ?? undefined,
    address: company.city
      ? { "@type": "PostalAddress", streetAddress: contact?.street ?? undefined, postalCode: contact?.postal ?? undefined, addressLocality: company.city, addressRegion: company.province, addressCountry: "CA" }
      : undefined,
    areaServed: company.service_area || undefined,
    openingHoursSpecification: DAYS.flatMap((d) =>
      (company.hours[d] ?? []).map(([opens, closes]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_LABEL[d], opens, closes })),
    ),
    aggregateRating: visibleReviews.length ? { "@type": "AggregateRating", ratingValue: average.toFixed(1), reviewCount: visibleReviews.length } : undefined,
  };

  const tabHref = (t: Tab) => (t === "feed" ? `/businesses/${slug}` : `/businesses/${slug}?tab=${t}`);
  const label = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const actCls = (i: number) => (i === 0 ? "btn" : "btn ghost sm");
  const actEl = (a: (typeof acts)[number], i: number) => (a.external ? <a key={a.label} href={a.href} target="_blank" rel="noreferrer nofollow" className={actCls(i)}>{a.label}</a> : a.href.startsWith("tel:") ? <a key={a.label} href={a.href} className={actCls(i)}>{a.label}</a> : <Link key={a.label} href={a.href} className={actCls(i)}>{a.label}</Link>);
  const money2 = (s: { price_type: string; price: number | null }) => (s.price_type === "quote" ? "Ask for a quote" : `${s.price_type === "from" ? "From " : ""}${money(s.price)}`);

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        {published && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />}
        {!published && onTeam && (
          <div className="bzbanner" role="status" style={{ maxWidth: 920, margin: "0 auto 14px" }}>
            <Ic n="eyeoff" s={16} />
            <span className="grow"><strong>{STATUS_LABEL[company.status] ?? company.status}.</strong> Only this business&rsquo;s team and the Hub team can see this page. It is hidden from search engines.</span>
            <Link href={`/businesses/mine/${slug}`} className="btn sm">Manage page</Link>
          </div>
        )}
        {company.claimable && published && (
          <div className="bzbanner claimb" style={{ maxWidth: 920, margin: "0 auto 14px" }}>
            <Ic n="flag" s={16} />
            <span className="grow"><strong>Unclaimed listing.</strong> The CanadianSME team created this page from public information. Own this business?</span>
            {!userId ? <Link href="/auth/login" className="btn sm">Sign in to claim it</Link> : claimRes.data ? <span className="small">Your claim is waiting for review.</span> : <ClaimForm companyId={company.id} />}
          </div>
        )}

        <div className="bzpage">
          <section className="card bzhead" aria-label={company.name}>
            <div className="bzcover">
              {company.cover_url ? <img src={company.cover_url} alt="" className="hdrimg" /> : <Scene n={scene} h={230} />}
            </div>
            <div className="bzhrow">
              <span className="bzlogo-wrap">
                {company.logo_url ? <span className="av bzav"><img src={company.logo_url} alt="" /></span> : <span className="av bzav" aria-hidden="true">{company.name.charAt(0).toUpperCase()}</span>}
              </span>
              <div className="stack grow" style={{ gap: 3, minWidth: 0 }}>
                <h1 className="bzh1">{company.name}</h1>
                <span className="muted">{[company.category, KINDS[company.kind], where].filter(Boolean).join(" · ")}</span>
                <span className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  {visibleReviews.length > 0 && (
                    <Link href={tabHref("reviews")} className="small" style={{ display: "inline-flex", gap: 6, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                      <ZipStars value={average} /> <strong>{average.toFixed(1)}</strong> ({visibleReviews.length} review{visibleReviews.length === 1 ? "" : "s"})
                    </Link>
                  )}
                  {isOpen && <span className="bzopen open">Open now</span>}
                  {company.appointments && <span className="bzopen appt">By appointment</span>}
                  <span className="muted small">{Number(followers.data ?? 0)} follower{Number(followers.data ?? 0) === 1 ? "" : "s"}</span>
                </span>
              </div>
            </div>
            <div className="row bzacts" style={{ flexWrap: "wrap" }}>
              {published && acts[0] && actEl(acts[0], 0)}
              {published && !onTeam && <ZipFollow companyId={company.id} following={!!followRes.data} signedIn={!!userId} />}
              {published && acts.slice(1).map((a, i) => actEl(a, i + 1))}
              {published && <ShareBtn title={company.name} />}
              {canEdit && <Link href={`/businesses/mine/${slug}`} className="btn ghost sm"><Ic n="edit" s={14} />Manage</Link>}
            </div>
            <nav className="bztabs" aria-label="Business page sections">
              {TABS.map((t) => (
                <Link key={t} href={tabHref(t)} aria-current={t === tab ? "page" : undefined}>
                  {label(t)}{t === "reviews" && visibleReviews.length > 0 ? ` (${visibleReviews.length})` : ""}
                </Link>
              ))}
            </nav>
          </section>

          <div className="bztab">
            {tab === "feed" && (
              <>
                {posts.length === 0 && <div className="card"><p className="muted">No updates yet. {onTeam ? "Post as this business from the feed composer." : "Follow to see new updates in your feed."}</p></div>}
                {posts.map((p) => <PostCard key={p.id} post={p} viewer={viewer} />)}
              </>
            )}

            {tab === "services" && (
              <div className="card">
                <h2>Services</h2>
                {services.length === 0 ? <p className="muted">No services listed yet.</p> : (
                  <div className="bzsvc">
                    {services.map((s) => (
                      <div key={s.id} className="bzsv">
                        {s.photo_url && <img src={s.photo_url} alt="" />}
                        <div className="stack grow" style={{ gap: 3 }}>
                          <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}><strong className="grow">{s.name}</strong><span className="bzprice">{money2(s)}</span></div>
                          {s.description && <span className="muted small">{s.description}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="muted small">Prices are in Canadian dollars (CAD) and may not include taxes.</p>
                {published && userId && !onTeam && (
                  <div className="stack" style={{ gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <h3 style={{ font: "700 15px var(--display)" }}>Request a quote</h3>
                    <InquiryForm companyId={company.id} quote />
                  </div>
                )}
              </div>
            )}

            {tab === "about" && (
              <>
                <div className="card">
                  <h2>About</h2>
                  {(company.about || company.description) && <p style={{ whiteSpace: "pre-wrap" }}>{company.about || company.description}</p>}
                  <dl className="bzdl" id="contact">
                    {contact?.street && <><dt>Address</dt><dd>{contact.street}, {company.city}, {company.province} {contact.postal}</dd></>}
                    {!contact?.street && where && <><dt>Based in</dt><dd>{where}{company.service_area && ` · serves ${company.service_area}`}</dd></>}
                    {contact?.phone && <><dt>Phone</dt><dd><a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a></dd></>}
                    {contact?.email && <><dt>Email</dt><dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd></>}
                    {contact?.whatsapp && <><dt>WhatsApp</dt><dd>{contact.whatsapp}</dd></>}
                    {site && <><dt>Website</dt><dd><a href={site} target="_blank" rel="noreferrer nofollow">{site.replace(/^https?:\/\//, "")}</a></dd></>}
                    {Object.keys(company.social).length > 0 && (
                      <><dt>Social</dt><dd>{Object.entries(company.social).map(([k, v], i) => <span key={k}>{i > 0 && " · "}<a href={v} target="_blank" rel="noreferrer nofollow">{label(k)}</a></span>)}</dd></>
                    )}
                  </dl>
                  {published && userId && !onTeam && (
                    <div className="stack" style={{ gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      <h3 style={{ font: "700 15px var(--display)" }}>Send a message</h3>
                      <InquiryForm companyId={company.id} />
                    </div>
                  )}
                  {published && !userId && <p className="small"><Link href="/auth/login" style={{ color: "var(--link)", fontWeight: 600 }}>Sign in</Link> to message this business.</p>}
                </div>
                <div className="card">
                  <div className="row" style={{ flexWrap: "wrap" }}><h2 className="grow">Hours</h2>{isOpen && <span className="bzopen open">Open now</span>}</div>
                  {company.appointments && <p className="small"><strong>By appointment.</strong></p>}
                  <table className="bzhrs">
                    <tbody>
                      {DAYS.map((d) => <tr key={d}><th scope="row">{DAY_LABEL[d]}</th><td>{dayLine(company.hours, d)}</td></tr>)}
                    </tbody>
                  </table>
                  {company.closures.length > 0 && <p className="small">Closed on: {company.closures.map((c) => c.date).join(", ")}</p>}
                </div>
              </>
            )}

            {tab === "photos" && (
              <div className="card">
                <h2>Photos</h2>
                {photos.length === 0 ? <p className="muted">No photos yet.</p> : (
                  <div className="bzgal">
                    {photos.map((x) => <figure key={x.id} style={{ margin: 0 }}><img src={x.url} alt={x.caption || `Photo from ${company.name}`} loading="lazy" />{x.caption && <figcaption className="muted small" style={{ marginTop: 4 }}>{x.caption}</figcaption>}</figure>)}
                  </div>
                )}
              </div>
            )}

            {tab === "shop" && (
              <div className="card">
                <h2>Shop</h2>
                {products.length === 0 ? <p className="muted">Nothing in the shop yet.</p> : (
                  <div className="bzgrid">
                    {products.map((x) => (
                      <div key={x.id} className="card bzprod">
                        {x.photo_url && <img src={x.photo_url} alt="" />}
                        <strong>{x.name}</strong>
                        {x.description && <span className="muted small">{x.description}</span>}
                        <div className="row"><span className="bzprice grow">{money(x.price)}</span>{!x.available && <span className="pill">Sold out</span>}</div>
                      </div>
                    ))}
                  </div>
                )}
                {published && userId && !onTeam && (
                  <div className="stack" style={{ gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <h3 style={{ font: "700 15px var(--display)" }}>Want to order?</h3>
                    <p className="muted small">Message the business to place an order or ask about delivery.</p>
                    <InquiryForm companyId={company.id} />
                  </div>
                )}
              </div>
            )}

            {tab === "events" && (
              <div className="card">
                <h2>Upcoming events</h2>
                {events.length === 0 && <p className="muted">No events yet.</p>}
                <div className="list">
                  {events.map((x) => {
                    const when = new Date(x.starts_at as string);
                    const past = when.getTime() < Date.now();
                    return (
                      <div key={x.id} className="row" style={{ flexWrap: "wrap", opacity: past ? 0.7 : 1 }}>
                        <div className="stack grow" style={{ gap: 2, flexBasis: 240 }}>
                          <span className="eyebrow">{when.toLocaleString("en-CA", { dateStyle: "full", timeStyle: "short", timeZone: company.tz })}</span>
                          <strong>{x.title}{past && <span className="muted small"> · Past event</span>}</strong>
                          {x.location && <span className="muted small">{x.location}</span>}
                          {x.description && <span className="small" style={{ whiteSpace: "pre-wrap" }}>{x.description}</span>}
                        </div>
                        {x.url && <a href={x.url} target="_blank" rel="noreferrer nofollow" className="btn sm ghost">More details</a>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "jobs" && (
              <div className="card">
                <h2>Open roles</h2>
                {jobs.filter((x) => x.open).length === 0 && <p className="muted">No open jobs right now.</p>}
                <div className="list">
                  {jobs.filter((x) => x.open).map((x) => (
                    <div key={x.id} className="stack" style={{ gap: 4 }}>
                      <div className="row" style={{ flexWrap: "wrap" }}><strong className="grow">{x.title}</strong><span className="tag">{x.job_type}</span></div>
                      {x.location && <span className="small">{x.location}</span>}
                      {x.description && <span className="muted small" style={{ whiteSpace: "pre-wrap" }}>{x.description}</span>}
                      {x.apply_url && <a href={x.apply_url} target="_blank" rel="noreferrer nofollow" className="btn sm ghost" style={{ alignSelf: "flex-start" }}>How to apply</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "reviews" && <Reviews companyId={company.id} criteria={settings.criteria} initial={reviews} me={me} canReview={published && !onTeam} canReply={canReply} isStaff={isStaff} />}
          </div>
        </div>
      </div>
    </div>
  );
}
