// Businesses for sale for the browser tests (Update 5): the hand-off's 8 sample listings (e2e/forsale-fixture.json,
// made from code/businesses-for-sale.js fsSeed) served like Supabase would, with the same privacy rules as
// sale_browse() / sale_detail(), and kept in memory so listing, contacting, sharing and the team's checks can be tested.
import fs from "node:fs";

const FIX = JSON.parse(fs.readFileSync(new URL("./forsale-fixture.json", import.meta.url), "utf8"));
const DAY = 864e5;
const ME = "00000000-0000-4000-8000-000000000001";
let S;
export function resetForsale() {
  const now = Date.now();
  S = {
    listings: FIX.listings.map((l) => ({ ...l, created_at: new Date(now - l.days * DAY - 60000).toISOString(), checked_at: l.checked ? new Date(now - l.days * DAY).toISOString() : null })),
    people: FIX.people,
    enquiries: [], saves: [], reports: [], optout: [], views: new Set(),
  };
}
resetForsale();

const person = (id) => S.people.find((p) => p.id === id) ?? { id, full_name: id === ME ? "Test Member" : "Team Lead", headline: id === ME ? "Owner, Test Bakery" : "", avatar_url: null, member_type: "owner", plan: "free" };
const card = (l, m, me) => ({
  id: l.id, slug: l.slug, title: l.title, industry: l.industry, city: l.city, province: l.province, area: l.area_shown, price: l.price, por: l.price_on_request,
  type: l.sale_type, photo: l.photo_url, status: l.status, checked: !!l.checked_at, created_at: l.created_at, earnings: m ? l.owner_earnings : null,
  saved: !!me && S.saves.some((s) => s.listing_id === l.id && s.member_id === me),
});

export function handleForsale(req, res, url, { member, staff, sub, claims }) {
  const me = member ? sub : null;
  const t = url.pathname.match(/^\/rest\/v1\/(rpc\/)?([a-z_]+)$/);
  if (url.pathname === "/__reset_forsale") { resetForsale(); res.end("{}"); return true; }
  if (!t) return false;
  const name = t[2];
  const isRpc = !!t[1];
  const known = ["sale_listings", "sale_enquiries", "sale_saves", "sale_reports", "email_opt_out"];
  if (!isRpc && !known.includes(name)) return false;
  if (isRpc && !name.startsWith("sale_")) return false;
  const body = () => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch { r({}); } }); });
  const one = String(req.headers.accept).includes("vnd.pgrst.object");
  const send = (rows, count) => {
    if (count != null) res.setHeader("content-range", `0-${Math.max(0, rows.length - 1)}/${count}`);
    if (req.method === "HEAD") return res.end();
    if (one) {
      if (!rows.length) { if (String(req.headers.accept).includes("vnd.pgrst.object")) { res.statusCode = 406; return res.end(JSON.stringify({ code: "PGRST116", message: "no rows" })); } }
      return res.end(JSON.stringify(rows[0] ?? null));
    }
    return res.end(JSON.stringify(rows));
  };
  const err = (m) => { res.statusCode = 400; res.end(JSON.stringify({ code: "P0001", message: m })); return true; };
  const eq = (k) => url.searchParams.get(k)?.replace(/^eq\./, "");
  const paid = member && (staff || ["plus", "advisor"].includes(claims.plan));
  const shown = (l) => !!me && (!l.confidential || l.seller_id === me || staff || S.enquiries.some((e) => e.listing_id === l.id && e.buyer_id === me && e.docs_shared_at));
  const buyerVisible = (l) => l.status === "live" || l.status === "offer";

  (async () => {
    if (isRpc) {
      const a = req.method === "POST" ? await body() : {};
      switch (name) {
        case "sale_can_list": return res.end(JSON.stringify(!!paid));
        case "sale_browse":
          return res.end(JSON.stringify(S.listings.filter(buyerVisible).sort((x, y) => y.created_at.localeCompare(x.created_at))
            .map((l) => ({ ...card(l, member, me), search: `${l.title} ${l.industry} ${l.area_shown} ${l.city} ${member ? l.description.join(" ") : l.description[0]}` }))));
        case "sale_saved": return res.end(JSON.stringify(S.saves.filter((s) => s.member_id === me).map((s) => S.listings.find((l) => l.id === s.listing_id)).filter((l) => l && buyerVisible(l)).map((l) => card(l, true, me))));
        case "sale_similar": {
          const l = S.listings.find((x) => x.id === a.p_id);
          return res.end(JSON.stringify(l ? S.listings.filter((o) => o.id !== l.id && o.status === "live" && (o.industry === l.industry || o.province === l.province)).sort((x, y) => y.created_at.localeCompare(x.created_at)).slice(0, 3).map((o) => card(o, member, me)) : []));
        }
        case "sale_detail": {
          const l = S.listings.find((x) => x.slug === a.p_key || x.id === a.p_key);
          const mine = !!me && l?.seller_id === me;
          if (!l || (!buyerVisible(l) && !mine && !staff)) return res.end("null");
          const e = S.enquiries.find((x) => x.listing_id === l.id && x.buyer_id === me);
          let out = { ...card(l, member, me), established: l.year_established, premises: l.premises, highlights: l.highlights, description: member ? l.description : [l.description[0]], has_employees: l.employees > 0, mine, staff, member };
          if (member) {
            out = { ...out, sales: l.yearly_sales, employees: l.employees, reason: l.reason, training: l.training, lease: l.lease_details, financing: l.seller_financing, buyer: l.ideal_buyer, included: l.included, documents: l.documents, seller_plan: person(l.seller_id).plan, enquiry: e ? { created_at: e.created_at, shared: !!e.docs_shared_at, thread: !!e.thread_at } : null };
            if (shown(l)) { const p = person(l.seller_id); out = { ...out, seller: { id: p.id, name: p.full_name, role: p.headline, avatar: p.avatar_url, member_type: p.member_type }, business_name: l.business_name, confidential: l.confidential }; }
          }
          if (mine || staff) out = { ...out, views: l.views, saves: l.saves, confidential: l.confidential, enquiries: S.enquiries.filter((x) => x.listing_id === l.id).length };
          return res.end(JSON.stringify(out));
        }
        case "sale_count_view": {
          const l = S.listings.find((x) => x.id === a.p_id);
          const who = me ?? `v:${a.p_visitor}`;
          if (l && l.seller_id !== me && buyerVisible(l) && !S.views.has(`${l.id}|${who}`)) { S.views.add(`${l.id}|${who}`); l.views++; }
          return res.end("null");
        }
        case "sale_enquire": {
          const l = S.listings.find((x) => x.id === a.p_listing);
          if (!me) return err("Sign in to contact the seller.");
          if (!l || !buyerVisible(l)) return err("This listing isn’t available.");
          if (l.status === "offer") return err("The seller has accepted an offer.");
          if (l.seller_id === me) return err("This is your own listing.");
          if (!a.p_agreed) return err("Tick the box to agree to keep the details private.");
          if (String(a.p_message ?? "").trim().length < 20) return err("Write at least a sentence or two so the seller knows who you are.");
          if (S.enquiries.some((x) => x.listing_id === l.id && x.buyer_id === me)) return err("You already contacted this seller.");
          const id = crypto.randomUUID();
          S.enquiries.push({ id, listing_id: l.id, buyer_id: me, funding: a.p_funding, timing: a.p_timing, message: a.p_message.trim(), agreed_private: true, docs_shared_at: null, read_at: null, thread_at: l.confidential ? null : new Date().toISOString(), created_at: new Date().toISOString() });
          return res.end(JSON.stringify(id));
        }
        case "sale_open_thread": {
          const e = S.enquiries.find((x) => x.id === a.p_enquiry);
          const l = e && S.listings.find((x) => x.id === e.listing_id);
          if (!l || l.seller_id !== me) return err("Only the seller can reply.");
          e.thread_at ??= new Date().toISOString();
          return res.end(JSON.stringify(e.buyer_id));
        }
        case "sale_share_docs": {
          const e = S.enquiries.find((x) => x.id === a.p_enquiry);
          const l = e && S.listings.find((x) => x.id === e.listing_id);
          if (!l || l.seller_id !== me) return err("Only the seller can share documents.");
          e.docs_shared_at ??= new Date().toISOString();
          return res.end("null");
        }
        case "sale_enquiries_seen":
          for (const e of S.enquiries) if (S.listings.find((l) => l.id === e.listing_id)?.seller_id === me) e.read_at ??= new Date().toISOString();
          return res.end("null");
        case "sale_unread_enquiries":
          return res.end(String(S.enquiries.filter((e) => !e.read_at && S.listings.find((l) => l.id === e.listing_id)?.seller_id === me).length));
        case "sale_set_checked": {
          if (!staff) return err("Only the Hub team can check listings.");
          const l = S.listings.find((x) => x.id === a.p_id);
          if (l) l.checked_at = a.p_on ? new Date().toISOString() : null;
          return res.end("null");
        }
        case "sale_set_hidden": {
          if (!staff) return err("Only the Hub team can hide listings.");
          const l = S.listings.find((x) => x.id === a.p_id);
          if (l && (a.p_hide || l.status === "hidden")) l.status = a.p_hide ? "hidden" : "live";
          return res.end(JSON.stringify(l?.seller_id ?? null));
        }
        default: return res.end("null");
      }
    }
    if (name === "sale_listings") {
      if (req.method === "POST") {
        const r = await body();
        if (!paid || r.seller_id !== me) return err("new row violates row-level security policy");
        S.listings.push({ ...r, status: "live", checked_at: null, views: 0, saves: 0, created_at: new Date().toISOString(), price_on_request: !!r.price_on_request });
        res.statusCode = 201;
        return res.end("");
      }
      if (req.method === "PATCH") {
        const r = await body();
        const l = S.listings.find((x) => x.id === eq("id"));
        if (!l || (l.seller_id !== me && !staff)) return send([]);
        if (!staff && (r.status === "hidden" || l.status === "hidden")) delete r.status;
        Object.assign(l, r);
        return send([l]);
      }
      let rows = S.listings.filter((l) => l.seller_id === me || staff);
      if (eq("seller_id")) rows = rows.filter((l) => l.seller_id === eq("seller_id"));
      if (eq("id")) rows = rows.filter((l) => l.id === eq("id"));
      rows = rows.slice().sort((x, y) => y.created_at.localeCompare(x.created_at));
      const sel = url.searchParams.get("select") ?? "";
      const out = rows.map((l) => (sel.includes("seller:") ? { ...l, seller: person(l.seller_id) } : l));
      return send(out, rows.length);
    }
    if (name === "sale_enquiries") {
      const ids = (url.searchParams.get("listing_id") ?? "").replace(/^in\.\(|\)$/g, "").split(",").map((s) => s.replace(/"/g, ""));
      const rows = S.enquiries.filter((e) => ids.includes(e.listing_id) && (e.buyer_id === me || S.listings.find((l) => l.id === e.listing_id)?.seller_id === me))
        .sort((x, y) => y.created_at.localeCompare(x.created_at)).map((e) => ({ ...e, buyer: person(e.buyer_id) }));
      return send(rows);
    }
    if (name === "sale_saves") {
      if (req.method === "POST") {
        const r = await body();
        const l = S.listings.find((x) => x.id === r.listing_id);
        if (!me || !l || !buyerVisible(l) || l.seller_id === me) return err("new row violates row-level security policy");
        S.saves.push({ member_id: me, listing_id: r.listing_id });
        l.saves++;
        res.statusCode = 201;
        return res.end("");
      }
      if (req.method === "DELETE") {
        const before = S.saves.length;
        S.saves = S.saves.filter((s) => !(s.member_id === me && s.listing_id === eq("listing_id")));
        const l = S.listings.find((x) => x.id === eq("listing_id"));
        if (l && S.saves.length < before) l.saves = Math.max(0, l.saves - 1);
        res.statusCode = 204;
        return res.end();
      }
      return send(S.saves.filter((s) => s.member_id === me && (!eq("listing_id") || s.listing_id === eq("listing_id"))));
    }
    if (name === "sale_reports") {
      if (req.method === "POST") {
        const r = await body();
        if (S.reports.some((x) => x.listing_id === r.listing_id && x.reporter_id === me)) return err("duplicate key value violates unique constraint");
        S.reports.push({ ...r, reporter_id: me });
        res.statusCode = 201;
        return res.end("");
      }
      return send(staff ? S.reports : []);
    }
    if (name === "email_opt_out") {
      if (req.method === "POST") { if (!S.optout.includes(me)) S.optout.push(me); res.statusCode = 201; return res.end(""); }
      if (req.method === "DELETE") { S.optout = S.optout.filter((x) => x !== me); res.statusCode = 204; return res.end(); }
      return send(S.optout.includes(me) ? [{ grp: "forsale" }] : []);
    }
    return res.end("[]");
  })();
  return true;
}
