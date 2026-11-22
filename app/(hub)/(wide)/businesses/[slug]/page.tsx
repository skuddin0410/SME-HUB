/* eslint-disable @next/next/no-img-element */
import { absolute, jsonLd, pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, Mail, MapPin, Phone } from "lucide-react";
import { AUTHOR_FIELDS, fetchPosts, getViewer, type Author } from "@/lib/hub";
import { ACTIONS, DAYS, DAY_LABEL, KINDS, STATUS_LABEL, dayLine, money, type Hours } from "@/lib/business";
import { getBusinessSettings } from "@/lib/business-server";
import { Cover } from "@/components/hub-client";
import { Empty, PostCard } from "@/components/hub";
import { FollowButton, Reviews, Stars, type Review } from "@/components/business-client";
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

  const primary = (() => {
    const a = company.primary_action;
    if (a === "call" && contact?.phone) return { href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`, label: "Call", icon: Phone };
    if (a === "web" && site) return { href: site, label: "Visit website", icon: Globe, external: true };
    if (a === "book" && company.booking_url) return { href: company.booking_url, label: "Book", icon: Globe, external: true };
    return { href: "#contact", label: "Message", icon: Mail };
  })();
  const Primary = primary.icon;

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

  return (
    <>
      {published && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />}
      <Link href="/businesses" className="inline-flex items-center gap-1.5 self-start rounded px-1 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All businesses
      </Link>

      {!published && onTeam && (
        <p role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Only your team can see this page. Status: <strong>{STATUS_LABEL[company.status] ?? company.status}</strong>.{" "}
          <Link href={`/businesses/mine/${slug}`} className="font-semibold underline">
            Manage this page
          </Link>
        </p>
      )}

      <section className="panel overflow-hidden">
        {company.cover_url ? <img src={company.cover_url} alt="" className="h-32 w-full object-cover" /> : <Cover seed={company.id} className="h-32" />}
        <div className="px-5 pb-5">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="relative -mt-12 h-24 w-24 rounded-xl bg-white object-cover ring-4 ring-white" />
          ) : (
            <span className="cover relative -mt-12 flex h-24 w-24 items-center justify-center rounded-xl text-4xl font-semibold text-white ring-4 ring-white">{company.name.charAt(0)}</span>
          )}
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">{company.name}</h1>
              <p className="text-sm text-muted-foreground">
                {[company.category, KINDS[company.kind], where].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                {visibleReviews.length > 0 && (
                  <>
                    <Stars value={average} />
                    <span className="font-semibold">{average.toFixed(1)}</span>
                    <span className="text-muted-foreground">({visibleReviews.length})</span>
                  </>
                )}
                {isOpen && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Open now</span>}
                {company.appointments && <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">By appointment</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {published && <FollowButton companyId={company.id} following={!!followRes.data} count={Number(followers.data ?? 0)} signedIn={!!userId} />}
              {published && (
                <a
                  href={primary.href}
                  {...(primary.external ? { target: "_blank", rel: "noreferrer nofollow" } : {})}
                  className="press inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  <Primary className="h-4 w-4" /> {primary.label}
                </a>
              )}
              {canEdit && (
                <Link href={`/businesses/mine/${slug}`} className="press rounded-xl border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10">
                  Manage
                </Link>
              )}
            </div>
          </div>
        </div>
        <nav aria-label="Business page sections" className="flex gap-1 overflow-x-auto border-t px-3">
          {TABS.map((t) => (
            <Link key={t} href={tabHref(t)} aria-current={t === tab ? "page" : undefined} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold capitalize ${t === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t}
              {t === "reviews" && visibleReviews.length > 0 ? ` (${visibleReviews.length})` : ""}
            </Link>
          ))}
        </nav>
      </section>

      {company.claimable && published && (
        <section className="panel p-4">
          <h2 className="text-base font-semibold">Is this your business?</h2>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">This page was added by the team. Claim it to manage the details and answer customers.</p>
          {!userId ? (
            <Link href="/auth/login" className="text-sm font-semibold text-primary hover:underline">
              Sign in to claim it
            </Link>
          ) : claimRes.data ? (
            <p className="text-sm text-muted-foreground">Your claim is waiting for the team to review it.</p>
          ) : (
            <ClaimForm companyId={company.id} />
          )}
        </section>
      )}

      {tab === "feed" && (
        <>
          {posts.length === 0 && <Empty title="No posts yet">{onTeam ? "Post as this business from the feed composer." : "Follow this business to see its updates."}</Empty>}
          {posts.map((p) => (
            <PostCard key={p.id} post={p} viewer={viewer} />
          ))}
        </>
      )}

      {tab === "services" && (
        <section className="panel divide-y">
          {services.length === 0 && <p className="p-5 text-sm text-muted-foreground">No services listed yet.</p>}
          {services.map((s) => (
            <div key={s.id} className="flex gap-3 px-4 py-3">
              {s.photo_url && <img src={s.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.name}</p>
                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
              </div>
              <p className="shrink-0 text-sm font-semibold">{s.price_type === "quote" ? "Ask for a quote" : `${s.price_type === "from" ? "From " : ""}${money(s.price)}`}</p>
            </div>
          ))}
          {published && userId && !onTeam && (
            <div className="p-4">
              <h2 className="mb-2 text-base font-semibold">Request a quote</h2>
              <InquiryForm companyId={company.id} quote />
            </div>
          )}
        </section>
      )}

      {tab === "about" && (
        <>
          {(company.about || company.description) && (
            <section className="panel p-4">
              <h2 className="text-base font-semibold">About</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-5">{company.about || company.description}</p>
            </section>
          )}
          <section className="panel p-4">
            <h2 className="text-base font-semibold">Hours</h2>
            <dl className="mt-2 grid gap-1 text-sm">
              {DAYS.map((d) => (
                <div key={d} className="flex justify-between gap-4">
                  <dt>{DAY_LABEL[d]}</dt>
                  <dd className="text-muted-foreground">{dayLine(company.hours, d)}</dd>
                </div>
              ))}
            </dl>
            {company.closures.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Closed on {company.closures.map((c) => c.date).join(", ")}.</p>}
          </section>
          <section id="contact" className="panel p-4">
            <h2 className="text-base font-semibold">Contact</h2>
            <ul className="mt-2 grid gap-1.5 text-sm">
              {contact?.street && (
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {contact.street}, {company.city}, {company.province} {contact.postal}
                </li>
              )}
              {!contact?.street && where && (
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {where}
                  {company.service_area && ` · serves ${company.service_area}`}
                </li>
              )}
              {contact?.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" /> <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">{contact.phone}</a>
                </li>
              )}
              {contact?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                </li>
              )}
              {site && (
                <li className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" /> <a href={site} target="_blank" rel="noreferrer nofollow" className="hover:underline">{site.replace(/^https?:\/\//, "")}</a>
                </li>
              )}
              {Object.entries(company.social).map(([k, v]) => (
                <li key={k}>
                  <a href={v} target="_blank" rel="noreferrer nofollow" className="capitalize hover:underline">{k}</a>
                </li>
              ))}
            </ul>
            {published && userId && !onTeam && (
              <div className="mt-4 border-t pt-4">
                <h3 className="mb-2 text-sm font-semibold">Send a message</h3>
                <InquiryForm companyId={company.id} />
              </div>
            )}
            {published && !userId && (
              <p className="mt-4 text-sm">
                <Link href="/auth/login" className="font-semibold text-primary hover:underline">Sign in</Link> to message this business.
              </p>
            )}
          </section>
        </>
      )}

      {tab === "photos" && (
        <section className="panel p-4">
          {photos.length === 0 && <p className="text-sm text-muted-foreground">No photos yet.</p>}
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((x) => (
              <li key={x.id}>
                <img src={x.url} alt={x.caption || `Photo from ${company.name}`} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                {x.caption && <p className="mt-1 text-xs text-muted-foreground">{x.caption}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "shop" && (
        <section className="panel divide-y">
          {products.length === 0 && <p className="p-5 text-sm text-muted-foreground">Nothing in the shop yet.</p>}
          {products.map((x) => (
            <div key={x.id} className="flex gap-3 px-4 py-3">
              {x.photo_url && <img src={x.photo_url} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{x.name}</p>
                {x.description && <p className="text-sm text-muted-foreground">{x.description}</p>}
                {!x.available && <p className="mt-1 text-xs font-semibold text-rose-700">Sold out</p>}
              </div>
              <p className="shrink-0 text-sm font-semibold">{money(x.price)}</p>
            </div>
          ))}
          {published && userId && !onTeam && (
            <div className="p-4">
              <h2 className="mb-1 text-base font-semibold">Want to order?</h2>
              <p className="mb-2 text-sm text-muted-foreground">Message the business to place an order or ask about delivery.</p>
              <InquiryForm companyId={company.id} />
            </div>
          )}
        </section>
      )}

      {tab === "events" && (
        <section className="panel divide-y">
          {events.length === 0 && <p className="p-5 text-sm text-muted-foreground">No events yet.</p>}
          {events.map((x) => {
            const when = new Date(x.starts_at as string);
            const past = when.getTime() < Date.now();
            return (
              <div key={x.id} className={`px-4 py-3 ${past ? "opacity-70" : ""}`}>
                <p className="text-sm font-semibold">{x.title}{past && <span className="ml-2 text-xs font-normal text-muted-foreground">Past event</span>}</p>
                <p className="text-sm text-muted-foreground">
                  {when.toLocaleString("en-CA", { dateStyle: "full", timeStyle: "short", timeZone: company.tz })}
                  {x.location ? ` · ${x.location}` : ""}
                </p>
                {x.description && <p className="mt-1 whitespace-pre-wrap text-sm">{x.description}</p>}
                {x.url && <a href={x.url} target="_blank" rel="noreferrer nofollow" className="mt-1 inline-block text-sm font-semibold text-primary hover:underline">More details</a>}
              </div>
            );
          })}
        </section>
      )}

      {tab === "jobs" && (
        <section className="panel divide-y">
          {jobs.filter((x) => x.open).length === 0 && <p className="p-5 text-sm text-muted-foreground">No open jobs right now.</p>}
          {jobs.filter((x) => x.open).map((x) => (
            <div key={x.id} className="px-4 py-3">
              <p className="text-sm font-semibold">{x.title}</p>
              <p className="text-sm capitalize text-muted-foreground">{x.job_type}{x.location ? ` · ${x.location}` : ""}</p>
              {x.description && <p className="mt-1 whitespace-pre-wrap text-sm">{x.description}</p>}
              {x.apply_url && <a href={x.apply_url} target="_blank" rel="noreferrer nofollow" className="mt-1 inline-block text-sm font-semibold text-primary hover:underline">How to apply</a>}
            </div>
          ))}
        </section>
      )}

      {tab === "reviews" && <Reviews companyId={company.id} criteria={settings.criteria} initial={reviews} me={me} canReview={published && !onTeam} canReply={canReply} isStaff={isStaff} />}
    </>
  );
}
