"use client";

import { useEffect, useState } from "react";
import { blockSender, checkLink, reportScamMessage } from "@/app/(hub)/safety-actions";
import { toast } from "@/components/toast";
import { Ic } from "@/components/zip/ic";

/**
 * Update 41: "Be careful with this message", above a message that asks for a code or password, money, gift cards or
 * crypto, says the account is in trouble, tries to move the chat to WhatsApp or Telegram, or links to a blocked site.
 */

const LINKS = /(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|ca|net|org|io|co|xyz|biz|info|ly|me|app|shop|online|site|link|click|top)\b[^\s<>"']*/gi;
const domainOf = (u: string) => u.toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0];
const OWN = /(^|\.)smehub\.ca$|(^|\.)canadiansme\.ca$/;
const seen = new Map<string, Promise<{ bad: boolean; look: boolean }>>();

function verdict(d: string) {
  if (!seen.has(d)) seen.set(d, checkLink(`https://${d}`).then((v) => ({ bad: v.blocked, look: v.lookalike })).catch(() => ({ bad: false, look: false })));
  return seen.get(d)!;
}

export function scamHits(text: string, words: string[]) {
  const low = text.toLowerCase();
  const hit = words.filter((w) => low.includes(w.toLowerCase()));
  if (/\b(code|password)\b/.test(low) && /(reply|send|share|enter)/.test(low) && !hit.includes("6-digit code") && !hit.includes("password")) hit.push("a code");
  return hit;
}

function why(h: string[]) {
  const j = h.join(" ").toLowerCase();
  const o: string[] = [];
  if (/code/.test(j)) o.push("asks for a code");
  if (/password/.test(j)) o.push("asks for your password");
  if (/gift|bitcoin|crypto|wire|e-transfer/.test(j)) o.push("asks for money or crypto");
  if (/verify|closed/.test(j)) o.push("says your account is in trouble");
  if (/whatsapp|telegram/.test(j)) o.push("tries to move you to another app");
  if (!o.length) return "";
  return `It ${o.length > 1 ? `${o.slice(0, -1).join(", ")} and ${o[o.length - 1]}` : o[0]}. `;
}

export function ScamWarning({ body, words, from }: { body: string; words: string[]; from: string }) {
  const hits = scamHits(body, words);
  const domains = [...new Set((body.match(LINKS) ?? []).map(domainOf).filter((d) => d.includes(".") && !OWN.test(d)))].slice(0, 5);
  const [bad, setBad] = useState<{ d: string; look: boolean } | null>(null);
  const [done, setDone] = useState<"" | "reported" | "blocked">("");
  const key = domains.join(",");

  useEffect(() => {
    let live = true;
    (async () => {
      for (const d of key ? key.split(",") : []) {
        const v = await verdict(d);
        if (!live) return;
        if (v.bad) return setBad({ d, look: v.look });
      }
    })();
    return () => { live = false; };
  }, [key]);

  if (!hits.length && !bad) return null;
  return (
    <div className="sfwarn" role="note">
      <strong className="sfwt"><Ic n="alert" s={15} />Be careful with this message</strong>
      <span>
        {bad ? <>It links to <b>{bad.d}</b>, {bad.look ? "a site pretending to be SME Hub" : "a site known for scams"}. </> : null}
        {why(hits)}SME Hub staff will never ask for your password or a code in a message.
      </span>
      <span className="sfwb">
        <button type="button" className="btn sm ghost" disabled={!!done} onClick={async () => {
          const r = await reportScamMessage(from, body);
          if (r.error) return toast(r.error);
          setDone("reported");
          toast("Thanks. You reported it, and the Hub team will look at it today.");
        }}>{done === "reported" ? "Reported" : "Report"}</button>
        <button type="button" className="btn sm ghost" disabled={done === "blocked"} onClick={async () => {
          const r = await blockSender(from);
          if (r.error) return toast(r.error);
          setDone("blocked");
          toast("Blocked. They can’t message you or see your profile.");
        }}>{done === "blocked" ? "Blocked" : "Block"}</button>
      </span>
    </div>
  );
}
