"use client";

import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { useReady } from "@/components/ready/provider";

/** Own profile: "Build my profile with AI" (or "Rewrite with AI" once there is an introduction), as in the zip. */
export function AiProfileButton({ rewrite }: { rewrite: boolean }) {
  const r = useReady();
  const label = rewrite ? "Rewrite with AI" : "Build my profile with AI";
  return r ? (
    <button type="button" className="btn line" onClick={() => r.openAi()}><Ic n="spark" s={14} />{label}</button>
  ) : (
    <Link href="/profile/edit" className="btn line"><Ic n="spark" s={14} />{label}</Link>
  );
}
