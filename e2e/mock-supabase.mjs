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
    if (member && url.pathname === "/auth/v1/user") {
      return res.end(JSON.stringify({ id: MEMBER.id, aud: "authenticated", role: "authenticated", email: "member@example.test", app_metadata: {}, user_metadata: {}, created_at: MEMBER.created_at }));
    }
    if (member && url.pathname === "/rest/v1/profiles" && url.searchParams.get("id") === `eq.${MEMBER.id}`) {
      return res.end(JSON.stringify(String(req.headers.accept).includes("vnd.pgrst.object") ? MEMBER : [MEMBER]));
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
    if (url.pathname === "/rest/v1/rpc/business_map_cities") return res.end(JSON.stringify([{ city: "Toronto", province: "ON", businesses: 3 }, { city: "Calgary", province: "AB", businesses: 1 }]));
    if (url.pathname === "/rest/v1/rpc/business_contact") return res.end(JSON.stringify([{ street: "12 Queen St", postal: "M5V 1A1", email: "hello@maple.example.ca", phone: "(416) 555-0100", whatsapp: null }]));
    if (url.pathname === "/rest/v1/rpc/business_follower_count") return res.end("3");
    if (url.pathname === "/rest/v1/rpc/business_is_open") return res.end("true");
    if (url.pathname === "/rest/v1/business_settings") return one(SETTINGS);
    const GSET = { create_private: "paid", create_public: "approval", priv_join: "request", layout: "grid", header: "side", card: { cat: true, desc: true, count: true, act: true, host: true }, head: { type: true, priv: true, desc: true, faces: true, act: true }, def_cover: "nodes", msg_all: true, archive: true, types: ["Topic", "Industry", "Community", "City or region", "Private circle"] };
    const GROUP = (over) => ({ id: "00000000-0000-4000-8000-0000000000f1", slug: "retail-owners", name: "Retail owners", description: "Shop talk for Canadian retailers.", is_private: false, category: "Industry", cover: "awning", rules: "Be kind.", join_mode: "open", status: "active", created_by: AUTHOR.id, group_members: [{ count: 12 }], host: { full_name: "Priya Raman" }, ...over });
    if (url.pathname === "/rest/v1/plan_limits") return res.end(JSON.stringify([["offers_per_month", 0, 2, 4], ["private_groups", 0, 1, 3], ["ai_per_month", 10, 100, 100], ["viewer_names", 2, null, null], ["daily_matches", 3, 5, 5]].flatMap(([key, f, p, a]) => [{ plan: "free", key, value: f }, { plan: "plus", key, value: p }, { plan: "advisor", key, value: a }])));
    if (url.pathname === "/rest/v1/rpc/founding_offer_left") return res.end("212");
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
