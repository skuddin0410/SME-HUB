import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/demo";

// Every post kind the database accepts must have a label on the site, or a post of that kind
// crashes the feed (this happened when the Intro kind arrived with the sample data).
describe("post kinds", () => {
  it("the site knows every kind the database allows", () => {
    const sql = readFileSync("supabase/migrations/0015_sample_data_support.sql", "utf8");
    const allowed = /posts_kind_check check \(kind in \(([^)]*)\)\)/.exec(sql)?.[1].match(/'([a-z]+)'/g)?.map((k) => k.slice(1, -1));
    expect(allowed?.length).toBeGreaterThan(0);
    for (const kind of allowed!) expect(KINDS, kind).toHaveProperty(kind);
  });
});
