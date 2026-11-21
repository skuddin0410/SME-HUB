// A stand-in for Supabase so browser tests run without the real database or any keys.
// Every table read returns no rows and nobody is signed in, which is enough to check that pages
// render and fit the screen. Tests that need data add it in later phases.
import http from "node:http";

const port = Number(process.env.MOCK_SUPABASE_PORT || 54398);

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "*");
    res.setHeader("access-control-allow-methods", "*");
    if (req.method === "OPTIONS") return res.end();
    res.setHeader("content-type", "application/json");
    if (url.pathname.startsWith("/auth/v1/")) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ code: 401, msg: "not signed in" }));
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
