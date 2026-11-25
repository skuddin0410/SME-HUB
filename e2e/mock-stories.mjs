// Community Stories for the browser tests: the hand-off's sample stories (data/05_stories.json), served like Supabase
// with the same audience rules, kept in memory so viewing, liking, reporting, deleting and highlights can be tested.
// The files are the hand-off's own images ("sample/..." paths), which the app streams from content/story-media.
import fs from "node:fs";

const ME = "00000000-0000-4000-8000-000000000001";
// the Made in Canada Pavilion's 13 sample exhibitors (data/09_made_in_canada_pavilion.json)
const PAV = JSON.parse(fs.readFileSync(new URL("./pavilion-fixture.json", import.meta.url), "utf8"));
const PAV_NEW = [];
const PRIYA = { id: "00000000-0000-4000-8000-000000000011", full_name: "Priya Raman", avatar_url: null };
const ISA = { id: "00000000-0000-4000-8000-000000000012", full_name: "Isabelle Tremblay", avatar_url: null };
const LUC = { id: "00000000-0000-4000-8000-000000000013", full_name: "Luc Bouchard", avatar_url: null };
const HR = 3_600_000;
const id = (n) => `00000000-0000-4000-8000-0000005700${String(n).padStart(2, "0")}`;
let S;
export function resetStories() {
  const t = (h) => new Date(Date.now() - h * HR).toISOString();
  const st = (n, a, h, caption, audience, items, over = {}) => ({ id: id(n), author_id: a.id, company_id: null, caption, audience, status: "published", reports_done: false, created_at: t(h), published_at: t(h), author: a, company: null, items, ...over });
  const it = (n, kind, path, poster = null, position = 0) => ({ id: id(50 + n), kind, path, poster_path: poster, position });
  S = {
    stories: [
      st(1, PRIYA, 2, "New this week: Maple Oat Sourdough. Wholesale samples go out Friday.", "members", [it(1, "image", "sample/story-bakery.jpg")]),
      st(2, ISA, 5, "Day 1 at the Small Business Show. Come say hi at booth 214!", "members", [it(2, "video", "sample/story-show.mp4", "sample/story-show.jpg"), it(3, "image", "sample/post-design.jpg", null, 1)]),
      st(3, LUC, 3, "Sketches for a café counter. Connections only for now.", "conn", [it(4, "image", "sample/support.jpg")]),
      st(5, PRIYA, 9 * 24, "Packing our first wholesale order.", "members", [it(6, "image", "sample/post-retail.jpg")]),
    ],
    seen: [], likes: [], reports: [],
    highlights: [{ id: id(90), owner_id: PRIYA.id, name: "Behind the Scenes", cover_item: id(56), created_at: t(100), items: [{ item_id: id(56), position: 0 }] }],
  };
}
resetStories();

// connections: the test member is connected to Priya only, so Luc's connections-only story stays hidden
const visible = (s, me) => s.status === "published" && (s.audience === "public" || (me && (s.audience === "members" || s.author_id === me || s.author_id === PRIYA.id)));
const canSee = (s, me, staff) => staff || (me && s.author_id === me && s.status !== "deleted") || visible(s, me);
const list = (v) => String(v ?? "").replace(/^in\.\(|\)$/g, "").split(",").filter(Boolean);
const body = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch { r({}); } }); });

export function handleStories(req, res, url, { member, staff, sub }) {
  const me = member ? sub : null;
  const p = url.pathname;
  const q = url.searchParams;
  const send = (x) => { res.end(JSON.stringify(x)); return true; };
  const one = (row) => send(String(req.headers.accept).includes("vnd.pgrst.object") ? row : row ? [row] : []);
  if (p === "/__reset_stories") { resetStories(); res.end("{}"); return true; }
  if (p === "/rest/v1/pavilion_listings") {
    if (req.method === "POST") { body(req).then((b) => { PAV_NEW.push({ ...b, id: `00000000-0000-4000-8000-0000006b${String(PAV_NEW.length).padStart(4, "0")}`, status: "pending", featured: false, owner: { full_name: "Test Member", avatar_url: null, headline: "" } }); res.statusCode = 201; res.end("[]"); }); return true; }
    if (req.method === "PATCH") return send([]);
    return send([...PAV_NEW.filter((x) => x.owner_id === me), ...PAV]);
  }
  if (p === "/rest/v1/pavilion_reports") { if (req.method === "POST") { res.statusCode = 201; return send([]); } return send([]); }
  if (p === "/rest/v1/stories" && req.method === "GET") {
    let rows = S.stories.filter((s) => canSee(s, me, staff));
    const a = q.get("author_id"); if (a) rows = rows.filter((s) => s.author_id === a.replace("eq.", ""));
    const st = q.get("status");
    if (st?.startsWith("eq.")) rows = rows.filter((s) => s.status === st.slice(3));
    if (st?.startsWith("in.")) rows = rows.filter((s) => list(st.slice(3)).includes(s.status));
    if (q.get("status") === "neq.deleted") rows = rows.filter((s) => s.status !== "deleted");
    const gt = q.get("published_at"); if (gt?.startsWith("gt.")) rows = rows.filter((s) => s.published_at > gt.slice(3));
    return send(rows.map((s) => ({ ...s, items: s.items.map(({ path, ...i }) => ({ ...i, path })) })));
  }
  if (p === "/rest/v1/story_items" && req.method === "GET") {
    const want = (q.get("id") || "").replace("eq.", "");
    for (const s of S.stories) for (const i of s.items) if (i.id === want) return one(canSee(s, me, staff) ? { path: i.path, poster_path: i.poster_path } : null);
    return one(null);
  }
  if (p === "/rest/v1/story_seen") return send(S.seen.filter((x) => x.viewer_id === me).map((x) => ({ item_id: x.item_id })));
  if (p === "/rest/v1/story_likes") {
    if (req.method === "POST") { body(req).then((b) => { S.likes.push({ story_id: b.story_id, member_id: me }); res.statusCode = 201; res.end("[]"); }); return true; }
    if (req.method === "DELETE") { const sid = (q.get("story_id") || "").replace("eq.", ""); S.likes = S.likes.filter((l) => !(l.story_id === sid && l.member_id === me)); return send([]); }
    return send(S.likes.filter((l) => l.member_id === me).map((l) => ({ story_id: l.story_id })));
  }
  if (p === "/rest/v1/story_highlights") {
    const o = (q.get("owner_id") || "").replace("eq.", "");
    return send(S.highlights.filter((h) => !o || h.owner_id === o));
  }
  if (p === "/rest/v1/reports" && req.method === "POST") {
    body(req).then((b) => { if (b.story_id) S.reports.push(b); res.statusCode = 201; res.end("[]"); });
    return true;
  }
  if (p === "/rest/v1/rpc/story_mark_seen") { body(req).then((b) => { for (const i of b.p_items ?? []) S.seen.push({ item_id: i, viewer_id: me }); res.end("null"); }); return true; }
  if (p === "/rest/v1/rpc/story_counts") {
    body(req).then((b) => res.end(JSON.stringify((b.p_stories ?? []).map((sid) => ({ story_id: sid, views: new Set(S.seen.filter((x) => S.stories.find((s) => s.id === sid)?.items.some((i) => i.id === x.item_id)).map((x) => x.viewer_id)).size + 2, likes: S.likes.filter((l) => l.story_id === sid).length })))));
    return true;
  }
  if (p === "/rest/v1/rpc/story_viewers") return send([{ member_id: PRIYA.id, full_name: PRIYA.full_name, avatar_url: null, liked: true, seen_at: new Date().toISOString() }]);
  if (p === "/rest/v1/rpc/story_delete") { body(req).then((b) => { const s = S.stories.find((x) => x.id === b.p_story); if (s) s.status = "deleted"; res.end("null"); }); return true; }
  if (p === "/rest/v1/rpc/story_moderate") { body(req).then((b) => { const s = S.stories.find((x) => x.id === b.p_story); if (s) s.status = { approve: "published", reject: "rejected", remove: "removed", restore: "published" }[b.p_action] ?? s.status; res.end("null"); }); return true; }
  if (p === "/rest/v1/rpc/story_create") {
    body(req).then((b) => {
      const sid = id(80 + S.stories.length);
      S.stories.push({ id: sid, author_id: me, company_id: null, caption: b.p_caption, audience: b.p_audience, status: "published", reports_done: false, created_at: new Date().toISOString(), published_at: new Date().toISOString(), author: { full_name: "Test Member", avatar_url: null }, company: null, items: (b.p_items ?? []).map((x, k) => ({ id: id(70 + k + S.stories.length), kind: x.kind, path: "sample/story-bakery.jpg", poster_path: null, position: k })) });
      res.end(JSON.stringify(sid));
    });
    return true;
  }
  if (p === "/rest/v1/rpc/story_highlight_save" || p === "/rest/v1/rpc/story_highlight_add" || p === "/rest/v1/rpc/story_highlight_delete") return send(id(91));
  return false;
}

// Ask the Hub: this month's allowance and answers built from the sample posts
let ASK_USED = 0;
export function handleAsk(req, res, url, { member }) {
  const p = url.pathname;
  const send = (x) => { res.end(JSON.stringify(x)); return true; };
  if (p === "/__reset_ask") { ASK_USED = 0; res.end("{}"); return true; }
  if (!member) return false;
  if (p === "/rest/v1/rpc/hub_ai_left") return send({ used: ASK_USED, limit: 10 });
  if (p === "/rest/v1/rpc/hub_ai_take") { if (ASK_USED >= 10) return send(false); ASK_USED++; return send(true); }
  if (p === "/rest/v1/rpc/hub_ai_save") return send("00000000-0000-4000-8000-0000000a5001");
  if (p === "/rest/v1/posts" && (url.searchParams.get("fts") || "").startsWith("fts(english).")) {
    return send([{ id: "00000000-0000-4000-8000-0000000a5101", title: null, body: "How did you price your first wholesale order?", author: { id: PRIYA.id, full_name: "Priya Raman", avatar_url: null, headline: "Founder, Maple Bakery" }, comments: [{ body: "Start from your cost per unit, then add 30 to 40 percent. Buyers expect case pricing.", author: { id: ISA.id, full_name: "Isabelle Tremblay", avatar_url: null, headline: "Owner, Studio Tremblay" } }] }]);
  }
  if (p === "/rest/v1/rpc/search_profiles") return send([{ id: LUC.id, full_name: "Luc Bouchard", avatar_url: null, headline: "Pricing and wholesale for makers" }]);
  return false;
}
