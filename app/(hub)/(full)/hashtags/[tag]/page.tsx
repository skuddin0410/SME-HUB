import { TagPage } from "@/components/zip/hashtags";

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  return { title: `#${decodeURIComponent((await params).tag).slice(0, 40)}` };
}

export default async function Page({ params }: { params: Promise<{ tag: string }> }) {
  return <TagPage tag={decodeURIComponent((await params).tag).toLowerCase().slice(0, 40)} />;
}
