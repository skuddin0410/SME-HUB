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
    if (url.pathname === "/rest/v1/rpc/search_members") {
      return res.end(JSON.stringify([
        { id: "00000000-0000-4000-8000-000000000011", full_name: "Priya Raman", headline: "Founder, Maple Bakery", location: "Toronto, ON", avatar_url: null, profile_type: "owner", founding_number: 1, helps_with: ["Wholesale"] },
        { id: "00000000-0000-4000-8000-000000000012", full_name: "Luc Bouchard", headline: "Director, Atelier Bouchard", location: "Montréal, QC", avatar_url: null, profile_type: "maker", founding_number: 2, helps_with: [] },
      ]));
    }
    if (url.pathname.startsWith("/rest/v1/rpc/")) return res.end("null");
    if (url.pathname.startsWith("/rest/v1/")) {
      res.setHeader("content-range", "*/0");
      return res.end("[]");
    }
    res.statusCode = 404;
    res.end("{}");
  })
  .listen(port, "127.0.0.1", () => console.log(`mock supabase on ${port}`));
