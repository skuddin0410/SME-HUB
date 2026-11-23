// A stand-in for Supabase so browser tests run without the real database or any keys.
// Every table read returns no rows, which is enough to check that pages render and fit the screen.
// Nobody is signed in, except a request that carries a test session token (see e2e/personas.ts):
// then /auth/v1/user and the viewer's own profile row answer, so signed-in pages can be checked.
import http from "node:http";

const MEMBER = {
  id: "00000000-0000-4000-8000-000000000001",
  full_name: "Test Member",
  headline: "Owner, Test Bakery",
  location: null,
  bio: null,
  website: null,
  avatar_url: null,
  role: "member",
  status: "active",
  member_type: "owner",
  plan: "free",
  created_at: new Date().toISOString(),
};
const port = Number(process.env.MOCK_SUPABASE_PORT || 54398);

const MODSET = { types: { post: { on: true, auto: true, hide: 3 }, comment: { on: true, auto: true, hide: 3 }, photo: { on: true, auto: true, hide: 2 }, group: { on: true, auto: false, hide: 5 }, blog: { on: true, auto: true, hide: 3 }, blogc: { on: true, auto: true, hide: 3 } }, member_report: true, blocking: true, sus_blocks: { on: true, n: 5 }, sus_reports: { on: true, n: 10 }, email_on: true, email_subject: "[SMB Hub] {{user.name}} was suspended", email_body: "Review in Moderation." };
http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "*");
    res.setHeader("access-control-allow-methods", "*");
    if (req.method === "OPTIONS") return res.end();
    res.setHeader("content-type", "application/json");
    if (process.env.MOCK_LOG) console.log(req.method, req.url.slice(0, 90), String(req.headers.authorization).slice(0, 20));
    const token = String(req.headers.authorization || "").replace(/^Bearer /, "");
    const member = token.startsWith("ey");
    let sub = MEMBER.id;
    try { sub = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub || MEMBER.id; } catch {}
    const staff = member && sub.endsWith("0002");
    if (staff) {
      const STAFF = { ...MEMBER, id: sub, full_name: "Team Lead", role: "admin" };
      if (url.pathname === "/auth/v1/user") return res.end(JSON.stringify({ id: sub, aud: "authenticated", role: "authenticated", email: "team@example.test", app_metadata: {}, user_metadata: {}, created_at: MEMBER.created_at }));
      if (url.pathname === "/rest/v1/profiles" && url.searchParams.get("id") === `eq.${sub}`) return res.end(JSON.stringify(String(req.headers.accept).includes("vnd.pgrst.object") ? STAFF : [STAFF]));
      if (url.pathname === "/rest/v1/reports") return res.end(JSON.stringify([
        { id: "r1", reason: "Spam or disguised advertising", created_at: "2026-11-19T09:00:00Z", post_id: "00000000-0000-4000-8000-0000000000a1", profile_id: null, reporter: { full_name: "Sara Haddad" } },
        { id: "r2", reason: "Scam or fraud", created_at: "2026-11-19T10:00:00Z", post_id: "00000000-0000-4000-8000-0000000000a1", profile_id: null, reporter: { full_name: "Kwame Asante" } },
        { id: "r3", reason: "Harassment", created_at: "2026-11-12T10:00:00Z", post_id: null, profile_id: "00000000-0000-4000-8000-0000000000b1", reporter: { full_name: "Luc Bouchard" } },
      ]));
      if (url.pathname === "/rest/v1/blocks") return res.end(JSON.stringify([{ blocked_id: "00000000-0000-4000-8000-0000000000b1" }]));
      if (url.pathname === "/rest/v1/posts" && (url.searchParams.get("id") || "").startsWith("in.")) return res.end(JSON.stringify([{ id: "00000000-0000-4000-8000-0000000000a1", title: null, body: "GROW YOUR BUSINESS FAST!!! 10,000 new followers in 7 days", hidden_at: null, author: { id: "x", full_name: "Growth Deals Daily", avatar_url: null } }]));
      if (url.pathname === "/rest/v1/profiles" && (url.searchParams.get("id") || "").startsWith("in.")) return res.end(JSON.stringify([{ id: "00000000-0000-4000-8000-0000000000b1", full_name: "Marcus Webb", headline: "Consultant", avatar_url: null, status: "active" }]));
      if (url.pathname === "/rest/v1/mod_settings") return res.end(JSON.stringify(String(req.headers.accept).includes("vnd.pgrst.object") ? MODSET : [MODSET]));
      if (url.pathname === "/rest/v1/report_categories") return res.end(JSON.stringify([{ id: "00000000-0000-4000-8000-0000000000c1", name: "Scam or fraud", description: "Fake offers.", show: "both" }]));
    }
    if (member && url.pathname === "/auth/v1/user") {
      return res.end(JSON.stringify({ id: MEMBER.id, aud: "authenticated", role: "authenticated", email: "member@example.test", app_metadata: {}, user_metadata: {}, created_at: MEMBER.created_at }));
    }
    if (member && url.pathname === "/rest/v1/profiles" && url.searchParams.get("id") === `eq.${MEMBER.id}`) {
      return res.end(JSON.stringify(String(req.headers.accept).includes("vnd.pgrst.object") ? MEMBER : [MEMBER]));
    }
    // a fuller member for the profile screen: Priya, with her recommendations and a few people for the side list
    const PRIYA = { id: "00000000-0000-4000-8000-000000000011", full_name: "Priya Raman", headline: "Founder, Maple Bakery", location: "Toronto, ON", bio: "We bake small-batch bread and pastries for cafes and grocers across the GTA.", website: "https://maplebakery.example", avatar_url: "/zip/img/p-priya.jpg", role: "member", status: "active", member_type: "advisor", profile_type: "advisor", founding_number: 1, created_at: "2026-05-04T12:00:00Z" };
    const SIDE = [["luc", "Luc Bouchard", "Director, Atelier Bouchard", 12], ["sara", "Sara Haddad", "Founder, Clearwater Bookkeeping", 14], ["daniel", "Daniel Okafor", "Owner, Northside Logistics", 15], ["mei", "Mei Tanaka", "Co-founder, Harbour Analytics", 17]].map(([k, n, h, i]) => ({ id: `00000000-0000-4000-8000-0000000000${i}`, full_name: n, headline: h, avatar_url: `/zip/img/p-${k}.jpg`, member_type: "owner" }));
    if (url.pathname === "/rest/v1/profiles" && url.searchParams.get("id") === `eq.${PRIYA.id}`) {
      return res.end(JSON.stringify(String(req.headers.accept).includes("vnd.pgrst.object") ? PRIYA : [PRIYA]));
    }
    if (url.pathname === "/rest/v1/profiles" && url.searchParams.get("member_type") === "eq.advisor") return res.end(JSON.stringify([{ id: PRIYA.id, full_name: "Priya Raman", headline: "Founder, Maple Bakery", avatar_url: null, location: "Toronto, ON", advisor_profiles: { field: "Food and retail", years: 11, helped: 64, rating: 4.9, about: "We bake small-batch bread and pastries for cafes and grocers across the GTA.", services: [{ name: "Wholesale readiness check", text: "" }] } }]));
    if (url.pathname === "/rest/v1/profiles" && (url.searchParams.get("id") || "").startsWith("neq.") && (url.searchParams.get("select") || "").includes("member_type")) return res.end(JSON.stringify(SIDE));
    if (url.pathname === "/rest/v1/rpc/connection_count") return res.end("10");
    if (url.pathname === "/rest/v1/rpc/follower_count") return res.end("27");
    if (url.pathname === "/rest/v1/rpc/profile_last_active") return res.end(JSON.stringify(new Date().toISOString()));
    if (url.pathname === "/rest/v1/rpc/get_profile_details") return res.end(JSON.stringify([{ user_id: PRIYA.id, helps_with: ["Wholesale", "Food retail"], needs: ["Packaging suppliers"], availability: [], social_links: {} }]));
    if (url.pathname === "/rest/v1/recommendations") {
      const r = (i, id, name, headline, rel, body) => ({ id: `rec${i}`, author_id: `00000000-0000-4000-8000-0000000000${id}`, relationship: rel, body, hidden: false, created_at: "2026-10-12T12:00:00Z", author: { id: `00000000-0000-4000-8000-0000000000${id}`, full_name: name, headline } });
      return res.end(JSON.stringify([r(1, 18, "Nadia Rahman", "Owner, Prairie Roots Catering", "referral_partner", "Priya sends us her catering clients and we send her our dessert orders. Reliable every single time."), r(2, 19, "Chloe Tremblay", "Owner, Fern & Fable Boutique", "client", "Her shortbread sells out in our shop every holiday season. Easy to order from and always on time.")]));
    }
    if (url.pathname.startsWith("/auth/v1/")) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ code: 401, msg: "not signed in" }));
    }
    if (url.pathname === "/rest/v1/rpc/my_profile_view_days") {
      return res.end(JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ day: `2026-11-${String(i + 1).padStart(2, "0")}`, views: i % 7 === 0 ? 2 : 0 }))));
    }
    if (url.pathname === "/rest/v1/rpc/my_profile_viewers") {
      return res.end(JSON.stringify([{ viewer_id: null, last_at: new Date().toISOString(), shown: false }, { viewer_id: null, last_at: new Date().toISOString(), shown: false }]));
    }
    if (url.pathname === "/rest/v1/rpc/member_map_cities") {
      return res.end(JSON.stringify([{ location: "Toronto, ON", members: 4 }, { location: "Montréal, QC", members: 2 }, { location: "Tiny Town, MB", members: 1 }]));
    }
    if (url.pathname === "/rest/v1/rpc/member_directory") {
      const day = 86400_000;
      const m = (n, id, name, headline, location, type, recs, ago, helps = [], needs = []) => ({
        id: `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`, full_name: name, headline, location, avatar_url: `/zip/img/p-${id}.jpg`, profile_type: type, member_type: "owner",
        founding_number: n, helps_with: helps, needs, recommended_by: recs, last_active: new Date(Date.now() - ago * day).toISOString(),
      });
      return res.end(JSON.stringify([
        m(11, "priya", "Priya Raman", "Founder, Maple Bakery", "Toronto, ON", "advisor", 3, 0.2, ["Wholesale"], ["Packaging"]),
        m(12, "luc", "Luc Bouchard", "Director, Atelier Bouchard", "Montréal, QC", "maker", 1, 3),
        m(13, "kwame", "Kwame Asante", "Managing Partner, Asante Legal", "Toronto, ON", "advisor", 3, 0.1, ["Contracts", "Leases", "Employment law"], ["Owner-run clients"]),
        m(14, "sara", "Sara Haddad", "Founder, Clearwater Bookkeeping", "Ottawa, ON", "advisor", 4, 0.3),
        m(15, "daniel", "Daniel Okafor", "Owner, Northside Logistics", "Mississauga, ON", "owner", 2, 2),
        m(16, "hana", "Hana Kim", "Founder, Kim & Co. Accounting", "Edmonton, AB", "advisor", 2, 4),
        m(17, "mei", "Mei Tanaka", "Co-founder, Harbour Analytics", "Vancouver, BC", "provider", 1, 5),
        m(18, "amara", "Amara Diallo", "Founder, Diallo Imports", "Moncton, NB", "owner", 0, 20),
      ]));
    }
    if (url.pathname === "/rest/v1/rpc/search_members") {
      return res.end(JSON.stringify([
        { id: "00000000-0000-4000-8000-000000000011", full_name: "Priya Raman", headline: "Founder, Maple Bakery", location: "Toronto, ON", avatar_url: null, profile_type: "owner", founding_number: 1, helps_with: ["Wholesale"] },
        { id: "00000000-0000-4000-8000-000000000012", full_name: "Luc Bouchard", headline: "Director, Atelier Bouchard", location: "Montréal, QC", avatar_url: null, profile_type: "maker", founding_number: 2, helps_with: [] },
      ]));
    }
    // feed: one published post (with a poll) and one scheduled post, so the Phase 3 screens have something to show
    const AUTHOR = { id: "00000000-0000-4000-8000-000000000011", full_name: "Priya Raman", headline: "Founder, Maple Bakery", avatar_url: null, member_type: "owner" };
    const POST_ID = "00000000-0000-4000-8000-0000000000a1";
    const postRow = (over) => ({ id: POST_ID, body: "Which wholesale box size sells best for you?", title: "Wholesale boxes", cover_url: null, image_url: null, visibility: "public", kind: "question", created_at: new Date(Date.now() - 3600_000).toISOString(), pinned_at: null, group_id: null, edited_at: null, comments_closed: false, profile_pinned: false, status: "published", scheduled_at: null, quoted_post_id: null, author: AUTHOR, group: null, reactions: [{ count: 0 }], comments: [{ count: 0 }], ...over });
    if (url.pathname === "/rest/v1/posts" && (url.searchParams.get("select") || "").includes("quoted_post_id")) {
      const scheduled = url.searchParams.get("status") === "eq.scheduled";
      const row = scheduled ? postRow({ id: "00000000-0000-4000-8000-0000000000a2", status: "scheduled", scheduled_at: new Date(Date.now() + 86400_000).toISOString(), title: "Launch day", body: "Our spring box is live." , author: { ...AUTHOR, id: MEMBER.id } }) : postRow({});
      res.setHeader("content-range", "0-0/1");
      return res.end(JSON.stringify([row]));
    }
    if (url.pathname === "/rest/v1/polls") {
      res.setHeader("content-range", "0-0/1");
      return res.end(JSON.stringify([{ post_id: POST_ID, closes_at: new Date(Date.now() + 3 * 86400_000).toISOString(), poll_options: [{ id: "00000000-0000-4000-8000-0000000000b1", label: "Six boxes", votes: 3, position: 1 }, { id: "00000000-0000-4000-8000-0000000000b2", label: "Twelve boxes", votes: 1, position: 2 }] }]));
    }
    // businesses: a directory with two pages, one published business with services and a review
    const BIZ_ID = "00000000-0000-4000-8000-0000000000c1";
    const SETTINGS = { create_mode: "all", member_limit: 3, pub_approval: true, review_approval: false, criteria: ["Quality", "Value", "Communication"], categories: ["Food & Drink", "Legal", "Retail", "Other"], tabs: { photos: true, events: true, jobs: true, shop: true } };
    const BIZ = { id: BIZ_ID, slug: "maple-demo", name: "Maple Demo Bakery", category: "Food & Drink", description: "Small-batch bread and pastry.", about: "Small-batch bread, pastry and wholesale boxes for local cafes.", website: "https://maple.example.ca", logo_url: null, cover_url: null, kind: "storefront", status: "published", city: "Toronto", province: "ON", tz: "America/Toronto", service_area: "Greater Toronto Area", booking_url: "", primary_action: "message", appointments: false, hours: { mon: [["09:00", "17:00"]], tue: [["09:00", "17:00"]] }, closures: [], social: {}, claimable: false, owner_id: MEMBER.id, show_address: true, show_email: true, show_phone: true, show_whatsapp: false, updated_at: new Date().toISOString(), created_at: new Date().toISOString() };
    const wantsObject = String(req.headers.accept).includes("vnd.pgrst.object");
    const one = (row) => res.end(JSON.stringify(wantsObject ? row : [row]));
    if (url.pathname === "/rest/v1/rpc/search_businesses") {
      return res.end(JSON.stringify([
        { id: BIZ_ID, slug: "maple-demo", name: "Maple Demo Bakery", category: "Food & Drink", description: "Small-batch bread and pastry.", logo_url: null, cover_url: null, city: "Toronto", province: "ON", kind: "storefront", rating: 4.5, reviews: 2, followers: 3, is_open: true, claimable: false },
        { id: "00000000-0000-4000-8000-0000000000c2", slug: "asante-demo", name: "Asante Demo Legal", category: "Legal", description: "Contracts and leases.", logo_url: null, cover_url: null, city: "Calgary", province: "AB", kind: "service", rating: null, reviews: 0, followers: 0, is_open: false, claimable: true },
      ]));
    }
    if (url.pathname === "/rest/v1/rpc/directory_facets") return res.end(JSON.stringify({ total: 4, open_now: 1, categories: [{ category: "Food & Drink", n: 2 }, { category: "Retail", n: 2 }], provinces: ["AB", "ON"], cities: [{ city: "Toronto", province: "ON" }, { city: "Calgary", province: "AB" }] }));
    if (url.pathname === "/rest/v1/rpc/business_map_cities") return res.end(JSON.stringify([{ city: "Toronto", province: "ON", businesses: 3 }, { city: "Calgary", province: "AB", businesses: 1 }]));
    if (url.pathname === "/rest/v1/rpc/business_contact") return res.end(JSON.stringify([{ street: "12 Queen St", postal: "M5V 1A1", email: "hello@maple.example.ca", phone: "(416) 555-0100", whatsapp: null }]));
    if (url.pathname === "/rest/v1/rpc/business_follower_count") return res.end("3");
    if (url.pathname === "/rest/v1/rpc/business_is_open") return res.end("true");
    if (url.pathname === "/rest/v1/business_settings") return one(SETTINGS);
    const GSET = { create_private: "paid", create_public: "approval", priv_join: "request", layout: "grid", header: "side", card: { cat: true, desc: true, count: true, act: true, host: true }, head: { type: true, priv: true, desc: true, faces: true, act: true }, def_cover: "nodes", msg_all: true, archive: true, types: ["Topic", "Industry", "Community", "City or region", "Private circle"] };
    const GROUP = (over) => ({ id: "00000000-0000-4000-8000-0000000000f1", slug: "retail-owners", name: "Retail owners", description: "Shop talk for Canadian retailers.", is_private: false, category: "Industry", cover: "awning", rules: "Be kind.", join_mode: "open", status: "active", created_by: AUTHOR.id, group_members: [{ count: 12 }], host: { full_name: "Priya Raman" }, ...over });
    if (url.pathname === "/rest/v1/plan_limits") return res.end(JSON.stringify([["offers_per_month", 0, 2, 4], ["private_groups", 0, 1, 3], ["ai_per_month", 10, 100, 100], ["viewer_names", 2, null, null], ["daily_matches", 3, 5, 5]].flatMap(([key, f, p, a]) => [{ plan: "free", key, value: f }, { plan: "plus", key, value: p }, { plan: "advisor", key, value: a }])));
    if (url.pathname === "/rest/v1/rpc/founding_offer_left") return res.end("212");
    if (url.pathname === "/rest/v1/hub_events") return res.end(JSON.stringify([
      { id: "00000000-0000-4000-8000-0000000000a1", title: "Founding members welcome call", when_label: "Tue, Jan 12, 2027 · 12:00 pm ET", location: "Online", note: "Meet the team and the first members." },
      { id: "00000000-0000-4000-8000-0000000000a2", title: "Small Business Show 2027", when_label: "Date to be announced", location: "In person", note: "Members get early access and a discount." },
    ]));
    if (url.pathname === "/rest/v1/hub_settings") {
      let hub = {};
      try { hub = JSON.parse(Buffer.from(String(req.headers.authorization).split(".")[1] ?? "", "base64url").toString()).hub ?? {}; } catch {}
      const key = String(url.searchParams.get("key") ?? "").replace("eq.", "");
      return hub[key] ? one({ key, value: hub[key] }) : res.end(wantsObject ? "null" : "[]");
    }
    if (url.pathname === "/rest/v1/group_settings") return one(GSET);
    if (url.pathname === "/rest/v1/groups") {
      if (url.searchParams.get("slug") === "eq.retail-owners") return one(GROUP());
      return res.end(JSON.stringify([GROUP(), GROUP({ id: "00000000-0000-4000-8000-0000000000f2", slug: "private-circle", name: "Founders circle", category: "Private circle", is_private: true, join_mode: "request", cover: "nodes" })]));
    }
    if (url.pathname === "/rest/v1/companies" && (url.searchParams.get("slug") === "eq.maple-demo" || url.searchParams.get("id") === `eq.${BIZ_ID}`)) return one(BIZ);
    if (url.pathname === "/rest/v1/business_services") return res.end(JSON.stringify([{ id: "00000000-0000-4000-8000-0000000000d1", name: "Wholesale boxes", description: "Weekly delivery to cafes.", photo_url: null, price_type: "from", price: 60 }, { id: "00000000-0000-4000-8000-0000000000d2", name: "Custom cakes", description: "", photo_url: null, price_type: "quote", price: null }]));
    if (url.pathname === "/rest/v1/business_photos") return res.end(JSON.stringify([{ id: "00000000-0000-4000-8000-0000000000e1", url: "https://picsum.photos/seed/e2e-photo/800/600", caption: "Fresh from the oven", position: 0 }]));
    if (url.pathname === "/rest/v1/business_products") return res.end(JSON.stringify([{ id: "00000000-0000-4000-8000-0000000000e2", name: "Shortbread gift box", description: "Twelve cookies.", photo_url: null, price: 28, available: true, position: 0 }]));
    if (url.pathname === "/rest/v1/business_jobs") return res.end(JSON.stringify([{ id: "00000000-0000-4000-8000-0000000000e3", title: "Night baker", description: "Start at 10pm.", job_type: "full-time", location: "Toronto, ON", apply_url: "", open: true, created_at: new Date().toISOString() }]));
    if (url.pathname === "/rest/v1/business_events") return res.end(JSON.stringify([{ id: "00000000-0000-4000-8000-0000000000e4", title: "Holiday tasting", description: "Try the trays.", starts_at: "2030-12-05T15:00:00Z", ends_at: "2030-12-05T17:00:00Z", location: "Queen St E", url: "" }]));
    if (url.pathname === "/rest/v1/business_team" && member) {
      const sel = url.searchParams.get("select") || "";
      if (sel.includes("member:profiles")) return res.end(JSON.stringify([{ user_id: MEMBER.id, role: "owner", member: { full_name: MEMBER.full_name } }]));
      if (sel.includes("company:companies")) return res.end(JSON.stringify([{ role: "owner", company: { id: BIZ_ID, slug: "maple-demo", name: BIZ.name, category: BIZ.category, status: "published", owner_id: MEMBER.id } }]));
      return one({ role: "owner" });
    }
    if (url.pathname === "/rest/v1/company_reviews" && (url.searchParams.get("select") || "").includes("criteria")) {
      return res.end(JSON.stringify([{ rating: 5, body: "Best sourdough in the city.", created_at: new Date(Date.now() - 86400_000).toISOString(), criteria: { Quality: 5, Value: 5, Communication: 5 }, status: "published", author: AUTHOR }]));
    }
    if (url.pathname === "/rest/v1/business_review_replies") return res.end(JSON.stringify([{ review_author_id: AUTHOR.id, body: "Thank you, see you Saturday!" }]));
    if (url.pathname.startsWith("/rest/v1/rpc/")) return res.end("null");
    if (url.pathname.startsWith("/rest/v1/")) {
      res.setHeader("content-range", "*/0");
      return res.end("[]");
    }
    res.statusCode = 404;
    res.end("{}");
  })
  .listen(port, "127.0.0.1", () => console.log(`mock supabase on ${port}`));
