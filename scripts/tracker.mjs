// Auto-checked progress tracker: SME Hub against the LinkedIn feature set.
// Run: npm run tracker   -> prints a summary, writes docs/tracker.csv and docs/tracker.json
// Every feature lists checks (a file exists, or a pattern appears in the code or migrations).
// All checks pass = Built. Some = Partial. None = Not started. Nothing is ticked by hand.
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const walk = (dir) =>
  !existsSync(dir)
    ? []
    : readdirSync(dir).flatMap((n) => {
        if (["node_modules", ".next", ".git"].includes(n)) return [];
        const p = join(dir, n);
        return statSync(p).isDirectory() ? walk(p) : [p];
      });
const rootFiles = ["package.json", "amplify.yml", "next.config.ts", "vitest.config.ts"].map((f) => join(ROOT, f)).filter(existsSync);
const files = [...["app", "components", "lib", "supabase", "public", ".github", "tests"].flatMap((d) => walk(join(ROOT, d))), ...rootFiles];
const text = new Map([...files, ...rootFiles].filter((f) => !/\.(png|jpg|mp4)$/.test(f)).map((f) => [f, readFileSync(f, "utf8")]));
const code = (f) => /\.(tsx?|mjs)$/.test(f);

// check helpers
const file = (path) => ({ label: `file ${path}`, ok: files.some((f) => relative(ROOT, f).startsWith(path)) });
const code_ = (re) => ({ label: `code /${re.source}/`, ok: [...text].some(([f, t]) => code(f) && re.test(t)) });
const sql = (re) => ({ label: `database /${re.source}/`, ok: [...text].some(([f, t]) => f.includes("supabase/migrations") && re.test(t)) });
const any = (...cs) => ({ label: cs.map((c) => c.label).join("  OR  "), ok: cs.some((c) => c.ok) });
const yml = (re) => ({ label: `workflow /${re.source}/`, ok: [...text].some(([f, t]) => f.includes(".github/workflows") && re.test(t)) });
const pkg = (re) => ({ label: `package ${re.source}`, ok: re.test(text.get(join(ROOT, "package.json")) ?? "") });

// [area, feature, what LinkedIn does, when to build (if missing), checks]
const F = [
  ["Accounts", "Sign up, sign in, email confirmation", "Account creation with email verification", "", [file("app/auth/sign-up"), file("app/auth/confirm")]],
  ["Accounts", "Password reset", "Forgot / update password", "", [file("app/auth/forgot-password"), file("app/auth/update-password")]],
  ["Accounts", "Two roles only: member and admin", "Members plus staff tools", "", [sql(/profiles_role_check/)]],
  ["Accounts", "Branded account emails from accounts@smbhub.ca", "Own templates and sender for sign-up and reset mail", "", [file("app/api/auth/send-email/route.ts"), file("lib/auth/webhook.ts"), code_(/accounts@/)]],
  ["Accounts", "Scanner-safe confirm link that signs you in", "One-click verification link", "", [file("app/auth/confirm/actions.ts"), code_(/verifyOtp/)]],
  ["Accounts", "Welcome email, sent once", "Onboarding email after joining", "", [sql(/claim_welcome_email/), code_(/templates\.welcome/)]],
  ["Accounts", "Password changed notice + sign out other devices", "Security alert on password change", "", [code_(/passwordChanged/), code_(/scope: "others"/)]],
  ["Profiles", "Profile page (cover, photo, headline, about)", "Profile with banner, photo, headline", "", [file("app/(hub)/(wide)/members/[id]")]],
  ["Profiles", "Edit profile and upload photo", "Edit intro, upload photo", "", [file("app/(hub)/(plain)/profile/edit"), file("lib/upload.ts")]],
  ["Profiles", "Profile strength meter", "Profile completeness prompts", "", [code_(/Profile strength/)]],
  ["Profiles", "Experience, education and skills sections", "Structured career history and skills", "Next", [sql(/create table (experience|education|skills|member_skills)/)]],
  ["Profiles", "Public profile SEO (JSON-LD, sitemap)", "Profiles are Google-indexed", "", [code_(/"@type": "Person"|@type.*Person/), file("app/sitemap.ts")]],
  ["Profiles", "Business pages with reviews", "Company pages", "", [sql(/create table companies/), sql(/create table company_reviews/), file("app/(hub)/(wide)/businesses")]],
  ["Profiles", "Membership tiers and badges", "Premium and verified badges", "", [code_(/TierBadge/)]],
  ["Profiles", "Who viewed your profile", "Profile viewers list", "Later", [sql(/create table profile_views/)]],
  ["Network", "Connect, accept, remove", "Connections with invitations", "", [code_(/requestConnection/), code_(/acceptConnection/)]],
  ["Network", "Invitations and network page", "My Network tab", "", [file("app/(hub)/(wide)/network")]],
  ["Network", "1st / 2nd / 3rd degree labels", "Degrees of separation badges", "", [sql(/function connection_degrees/)]],
  ["Network", "Mutual connections", "Shared connections shown on profiles", "", [sql(/function mutual_connections/)]],
  ["Network", "People You May Know suggestions", "Friend-of-friend recommendations", "Now", [sql(/people_you_may_know|pymk/i)]],
  ["Network", "Follow members, businesses, topics", "One-way follow", "Next", [sql(/create table follows/)]],
  ["Network", "Block a member", "Block and report people", "", [sql(/create table blocks/), code_(/blockMember/)]],
  ["Feed", "Posts with text and photos", "Share an update with image", "", [code_(/createPost/), file("lib/upload.ts")]],
  ["Feed", "Post types: win, question, offer, hiring", "Post formats (poll, article, job)", "", [code_(/KINDS/)]],
  ["Feed", "Reactions (like, celebrate, love)", "Six reaction types", "", [code_(/setReaction/), sql(/reactions.*kind|add column kind/is)]],
  ["Feed", "Comments", "Comment on posts", "", [sql(/create table comments/), code_(/addComment/)]],
  ["Feed", "Replies inside comments", "Threaded replies", "Next", [sql(/comments.*parent_id|parent_id.*comments/is)]],
  ["Feed", "Reposts", "Repost with or without comment", "", [sql(/create table reposts/), code_(/toggleRepost/)]],
  ["Feed", "Ranked feed (relevance, not just newest)", "Two-pass ML ranking", "Now", [any(sql(/feed_score|rank_feed/i), code_(/feedScore|rankFeed|scorePost/))]],
  ["Feed", "Hashtags and topics", "Hashtag follow and discovery", "Next", [sql(/create table (hashtags|topics)/)]],
  ["Feed", "Save posts for later", "Saved items", "Next", [sql(/create table saved_posts/)]],
  ["Feed", "Newsletters and long articles", "Articles and newsletters", "Later", [sql(/create table (articles|newsletters)/)]],
  ["Feed", "Polls", "Poll posts", "Later", [sql(/create table (polls|poll_options)/)]],
  ["Search", "Full-text search (people, posts, businesses, groups)", "Search across entities", "", [sql(/fts tsvector/), file("app/(hub)/(rails)/search")]],
  ["Search", "Search as you type (suggestions)", "Typeahead", "Next", [code_(/typeahead|useSearchSuggest|search_suggest/i)]],
  ["Search", "Meaning-based search (embeddings)", "Semantic search", "Later", [sql(/create extension.*vector/i)]],
  ["Search", "Dedicated search engine (Typesense / Meilisearch)", "Galene / Lucene", "Later", [pkg(/typesense|meilisearch/)]],
  ["Messaging", "Direct messages", "Messaging", "", [sql(/create table messages/), file("app/(hub)/(wide)/messages")]],
  ["Messaging", "Instant delivery (realtime)", "Live message delivery", "", [code_(/\.channel\(/)]],
  ["Messaging", "Unread counts and read marks", "Unread badges", "", [sql(/read_at/), code_(/markThreadRead/)]],
  ["Notifications", "In-app notifications", "Notifications tab", "", [sql(/create table notifications/), sql(/function notify_reaction/), file("app/(hub)/(rails)/notifications")]],
  ["Notifications", "Email notifications and digest", "Email digests", "Next", [pkg(/resend|sendgrid|postmark|nodemailer/)]],
  ["Notifications", "Push notifications / installable app", "Mobile app and push", "Later", [any(file("app/manifest.ts"), file("public/manifest.json"))]],
  ["Community", "Groups (public and private)", "Groups", "", [sql(/create table groups/), file("app/(hub)/(rails)/groups")]],
  ["Community", "Group invites", "Invite to group", "", [sql(/create table group_invites/)]],
  ["Community", "Events", "Events", "Next", [sql(/create table events/)]],
  ["Opportunities", "Jobs and opportunities board", "Jobs", "Later", [sql(/create table (jobs|opportunities)/)]],
  ["Opportunities", "Matching people to jobs or opportunities", "Jobs You May Be Interested In", "Later", [any(sql(/job_match|match_jobs/i), code_(/matchJobs|jobMatch/))]],
  ["Safety", "Report content and review queue", "Report and moderate", "", [sql(/create table reports/), file("app/admin/(panel)/reports")]],
  ["Safety", "Admin dashboard", "Internal staff tools", "", [file("app/admin/(panel)/members"), file("app/admin/(panel)/posts")]],
  ["Safety", "Row-level security tests", "Access control", "", [file("supabase/tests/security.sql")]],
  ["Safety", "Rate limits against spam", "Abuse protection", "", [sql(/function enforce_rate/)]],
  ["Platform", "Pre-launch SEO switch", "Controlled indexing", "", [file("app/robots.ts"), code_(/INDEXABLE/)]],
  ["Platform", "Deployed on AWS Amplify", "Hosting", "", [file("amplify.yml")]],
  ["Platform", "CI: lint, types, unit + database tests, secret scan", "Automated checks on every change", "", [file(".github/workflows/ci.yml"), file("vitest.config.ts")]],
  ["Platform", "Deploy only after CI passes", "Gated continuous delivery", "", [yml(/needs: \[test, database, secrets\]/), yml(/AMPLIFY_WEBHOOK_URL/)]],
  ["Platform", "Caching layer (Redis)", "Caching and rate counters", "Next", [pkg(/redis|upstash|ioredis/)]],
  ["Platform", "Background job queue", "Kafka / Samza pipelines", "Next", [pkg(/bullmq|pg-boss|inngest/)]],
];

const rows = F.map(([area, feature, linkedin, when, checks]) => {
  const passed = checks.filter((c) => c.ok).length;
  const status = passed === checks.length ? "Built" : passed > 0 ? "Partial" : "Not started";
  return { area, feature, linkedin, status, when: status === "Built" ? "" : when || "Next", evidence: checks.map((c) => `${c.ok ? "ok" : "missing"}: ${c.label}`).join("; ") };
});

const count = (s) => rows.filter((r) => r.status === s).length;
const stamp = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
console.log(`SME Hub vs LinkedIn  |  ${stamp}\nBuilt ${count("Built")}  Partial ${count("Partial")}  Not started ${count("Not started")}  of ${rows.length}  (${Math.round((count("Built") / rows.length) * 100)}% built)\n`);
for (const a of [...new Set(rows.map((r) => r.area))]) {
  const r = rows.filter((x) => x.area === a);
  console.log(`${a.padEnd(14)} ${r.filter((x) => x.status === "Built").length}/${r.length}`);
}
const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(join(ROOT, "docs/tracker.csv"), ["Area,Feature,LinkedIn equivalent,Status,Build when,Evidence,Checked", ...rows.map((r) => [r.area, r.feature, r.linkedin, r.status, r.when, r.evidence, stamp].map(q).join(","))].join("\n"));
writeFileSync(join(ROOT, "docs/tracker.json"), JSON.stringify({ checked: stamp, rows }, null, 2));
