"use client";
import { useEffect } from "react";
import { seeBusiness } from "@/app/(hub)/biz-view-actions";

/** Update 40: tells the server someone looked at this business page (once per browser tab session). */
export function BusinessSeen({ id }: { id: string }) {
  useEffect(() => {
    const k = `seen:${id}`;
    try {
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch { /* still count it */ }
    seeBusiness(id).catch(() => {});
  }, [id]);
  return null;
}
