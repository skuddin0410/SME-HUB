import { notFound } from "next/navigation";
import { MemberBlogPage } from "@/components/zip/member-blogs";
import { createClient } from "@/lib/supabase/server";

const valid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!valid(id)) return {};
  const { data } = await (await createClient()).from("member_blogs").select("title").eq("id", id).maybeSingle();
  return { title: (data as { title?: string } | null)?.title ?? "Member blog" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!valid(id)) notFound();
  const view = await MemberBlogPage({ id });
  if (!view) notFound();
  return view;
}
