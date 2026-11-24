"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chooseSpotlight, messageMember, setFollowup } from "@/app/(hub)/ready-actions";
import { useReady } from "./provider";

export const FOLLOWUP_STATUS: Record<string, string> = { new: "Not contacted", called: "Called", left: "Left a message", setup: "Set up by team", ready: "Ready now" };

/** The follow-up status and the "I can set it up" message for one member. */
export function FollowCell({ id, name, status }: { id: string; name: string; status: string }) {
  const r = useReady();
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const say = (t: string) => r?.toast(t);
  return (
    <span role="cell" className="stack" style={{ gap: 6 }}>
      <label className="sr" htmlFor={`pcs-${id}`}>Follow-up for {name}</label>
      <select
        className="field sm"
        id={`pcs-${id}`}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          const before = value;
          setValue(v);
          start(async () => {
            const res = await setFollowup(id, v);
            if (res.error) {
              setValue(before);
              return say(res.error);
            }
            say(`Saved: ${FOLLOWUP_STATUS[v]}`);
            router.refresh();
          });
        }}
      >
        {Object.entries(FOLLOWUP_STATUS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
      <button
        type="button"
        className="linkbtn small"
        style={{ color: "var(--accent)", fontWeight: 600, alignSelf: "flex-start" }}
        disabled={pending}
        onClick={() => start(async () => {
          const res = await messageMember(id);
          if (res.error) return say(res.error);
          if (value === "new") setValue("left");
          say(`Message sent to ${name.split(" ")[0]}: “I can set up your profile for you in 5 minutes.”`);
          router.refresh();
        })}
      >
        Send “I can set it up” message
      </button>
    </span>
  );
}

export function ChooseBtn({ applicationId, memberId, name }: { applicationId: string; memberId: string; name: string }) {
  const r = useReady();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn sm"
      disabled={pending}
      onClick={() => start(async () => {
        const res = await chooseSpotlight(applicationId, memberId);
        if (res.error) return r?.toast(res.error);
        r?.toast(`Chosen. We messaged ${name.split(" ")[0]}.`);
        router.refresh();
      })}
    >
      Choose for Spotlight
    </button>
  );
}

/** The tab bar and the filter chips are buttons (as in the guide) that change the page's address. */
export function TabButtons({ tab, count }: { tab: string; count: number }) {
  const router = useRouter();
  const go = (t: string) => router.push(t === "list" ? "/profilefollow" : `/profilefollow?tab=${t}`);
  const b = (t: string, label: React.ReactNode) => <button type="button" className={tab === t ? "on" : ""} aria-pressed={tab === t} onClick={() => go(t)}>{label}</button>;
  return (
    <nav className="pctabs" aria-label="Profile follow-up">
      {b("list", "Profiles not ready")}
      {b("spot", <>Spotlight applications <span className="pill">{count}</span></>)}
      {b("rules", "Reminder emails")}
    </nav>
  );
}

export function FilterChips({ value, options }: { value: string; options: [string, string][] }) {
  const router = useRouter();
  return (
    <div className="chips grow" role="group" aria-label="Show">
      {options.map(([k, label]) => (
        <button type="button" className="chip" key={k} aria-pressed={value === k} onClick={() => router.push(k === "all" ? "/profilefollow" : `/profilefollow?f=${k}`)}>{label}</button>
      ))}
    </div>
  );
}
