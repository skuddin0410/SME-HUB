"use client";

import { useRouter } from "next/navigation";
import { toast } from "@/components/toast";
import { restoreFromLog } from "@/app/(hub)/team-extra-actions";

export function RestoreBtn({ id }: { id: string }) {
  const router = useRouter();
  return <button type="button" className="btn sm ghost" onClick={async () => { const r = await restoreFromLog(id); toast(r.error ?? "Restored"); router.refresh(); }}>Restore</button>;
}
