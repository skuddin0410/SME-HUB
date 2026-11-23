"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { SubmitButton } from "@/components/hub-client";
import {
  answerIntro,
  askIntro,
  deleteAccount,
  deleteRecommendation,
  requestRecommendation,
  saveDetails,
  setRecommendationHidden,
  toggleFollow,
  unblockMember,
  writeRecommendation,
  type NetState,
} from "@/app/(hub)/network-actions";
import { AVAILABILITY, PROFILE_TYPES, RELATIONSHIPS, SELF_TYPES, SOCIAL_NETWORKS, VISIBILITY_FIELDS, VISIBILITY_LEVELS } from "@/lib/profile-extra";

const cx = (...p: (string | false | null | undefined)[]) => p.filter(Boolean).join(" ");
const solid = "press inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-4 text-base font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60";
const outline = "press inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary px-4 text-base font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60";
const quiet = "press inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60";

export type Details = {
  helps_with: string[];
  needs: string[];
  availability: string[];
  social_links: Record<string, string>;
  custom_fields?: Record<string, string>;
  visibility: Record<string, string>;
  private_browsing: boolean;
};

function Notice({ state }: { state: NetState }) {
  if (state.error) return <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>;
  if (state.ok) return <p role="status" className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><Check className="h-4 w-4" />Saved</p>;
  return null;
}

// ---------- follow ----------
export function FollowButton({ otherId, initial, signedIn }: { otherId: string; initial: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={following}
      className={following ? outline : solid}
      onClick={() => {
        if (!signedIn) return router.push("/auth/login");
        const before = following;
        setFollowing(!before);
        start(async () => {
          try {
            await toggleFollow(otherId, before);
          } catch {
            setFollowing(before);
          }
        });
      }}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}

// ---------- edit profile: about section ----------
export function DetailsForm({ details, profileType, nets, extra = [] }: { details: Details; profileType: string; /** social networks the team allows */ nets?: Record<string, boolean>; /** questions the team added, which this member may answer */ extra?: { k: string; l: string; t: string; g: string }[] }) {
  const [state, action] = useActionState<NetState, FormData>(saveDetails, {});
  const typeOptions = Object.entries(PROFILE_TYPES).filter(([k]) => (SELF_TYPES as readonly string[]).includes(k) || k === profileType);
  const locked = !(SELF_TYPES as readonly string[]).includes(profileType);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="section" value="about" />
      <label className="grid gap-1.5 text-sm font-medium">
        I am a
        <select name="profile_type" defaultValue={profileType} disabled={locked} className="field font-normal">
          {typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {locked && <span className="text-xs font-normal text-muted-foreground">The SMB Hub team sets this one.</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        I can help with
        <input name="helps_with" defaultValue={details.helps_with.join(", ")} placeholder="Wholesale, Food retail" className="field font-normal" />
        <span className="text-xs font-normal text-muted-foreground">Separate with commas. Up to 12.</span>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        I am looking for
        <input name="needs" defaultValue={details.needs.join(", ")} placeholder="Packaging suppliers" className="field font-normal" />
      </label>
      {extra.length > 0 && (
        <fieldset className="grid gap-3 text-sm font-medium">
          <legend className="mb-1.5">More about you</legend>
          {extra.map((f) => (
            <label key={f.k} className="grid gap-1.5">
              {f.l}
              <input name={`custom_${f.k}`} type={f.t === "Number" ? "number" : f.t === "Email" ? "email" : f.t === "Date" ? "date" : "text"} defaultValue={details.custom_fields?.[f.k] ?? ""} maxLength={300} className="field font-normal" />
            </label>
          ))}
        </fieldset>
      )}
      <fieldset className="grid gap-1.5 text-sm font-medium">
        <legend className="mb-1.5">When I am free to chat</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2 font-normal">
          {AVAILABILITY.map((a) => (
            <label key={a} className="flex items-center gap-2"><input type="checkbox" name="availability" value={a} defaultChecked={details.availability.includes(a)} />{a}</label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-3 text-sm font-medium">
        <legend className="mb-1.5">Social links</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_NETWORKS.filter(([key]) => !nets || nets[key] !== false).map(([key, label]) => (
            <label key={key} className="grid gap-1 text-xs font-medium text-muted-foreground">
              {label}
              <input name={`social_${key}`} defaultValue={details.social_links[key] ?? ""} placeholder={`${key}.com/yourname`} maxLength={200} className="field text-sm font-normal text-foreground" />
            </label>
          ))}
        </div>
      </fieldset>
      <Notice state={state} />
      <SubmitButton className="self-start">Save details</SubmitButton>
    </form>
  );
}

// ---------- settings: privacy ----------
export function PrivacyForm({ details }: { details: Details }) {
  const [state, action] = useActionState<NetState, FormData>(saveDetails, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="section" value="privacy" />
      <div className="grid gap-3 sm:grid-cols-2">
        {VISIBILITY_FIELDS.map(([field, label]) => (
          <label key={field} className="grid gap-1.5 text-sm font-medium">
            {label}
            <select name={`vis_${field}`} defaultValue={details.visibility[field] ?? "public"} className="field font-normal">
              {Object.entries(VISIBILITY_LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        ))}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="private_browsing" defaultChecked={details.private_browsing} className="mt-1" />
        <span><span className="font-medium">Private browsing.</span> Others will not see that you viewed their profile, and you will not see who viewed yours.</span>
      </label>
      <Notice state={state} />
      <SubmitButton className="self-start">Save privacy</SubmitButton>
    </form>
  );
}

// ---------- recommendations ----------
export function RecommendForm({ subjectId, name, existing }: { subjectId: string; name: string; existing?: { relationship: string; body: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<NetState>({});
  const [pending, start] = useTransition();
  if (!open) return <button type="button" className={outline} onClick={() => setOpen(true)}>{existing ? "Edit your recommendation" : `Recommend ${name}`}</button>;
  return (
    <form
      className="panel grid gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await writeRecommendation(subjectId, String(f.get("relationship")), String(f.get("body")));
          setState(r);
          if (r.ok) { setOpen(false); router.refresh(); }
        });
      }}
    >
      <label className="grid gap-1 text-sm font-medium">
        How do you know {name}?
        <select name="relationship" defaultValue={existing?.relationship ?? "client"} className="field font-normal">
          {Object.entries(RELATIONSHIPS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Your recommendation
        <textarea name="body" required minLength={20} maxLength={1000} rows={4} defaultValue={existing?.body ?? ""} placeholder="What was it like to work with them?" className="field font-normal" />
      </label>
      <Notice state={state} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={solid}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}Post recommendation</button>
        <button type="button" className={quiet} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export function RequestRecButton({ askedId, name }: { askedId: string; name: string }) {
  const [state, setState] = useState<NetState>({});
  const [pending, start] = useTransition();
  if (state.ok) return <span role="status" className="text-sm text-muted-foreground">Asked {name}</span>;
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={pending} className={outline} onClick={() => start(async () => setState(await requestRecommendation(askedId)))}>Ask {name} for a recommendation</button>
      {state.error && <span role="alert" className="text-xs text-rose-700">{state.error}</span>}
    </span>
  );
}

export function RecActions({ id, subjectId, hidden, isSubject, isAuthor }: { id: string; subjectId: string; hidden: boolean; isSubject: boolean; isAuthor: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });
  return (
    <span className="flex gap-1">
      {isSubject && <button type="button" disabled={pending} className={quiet} onClick={() => run(() => setRecommendationHidden(id, subjectId, !hidden))}>{hidden ? "Show on profile" : "Hide from profile"}</button>}
      {isAuthor && <button type="button" disabled={pending} className={quiet} onClick={() => run(() => deleteRecommendation(id, subjectId))}>Delete</button>}
    </span>
  );
}

// ---------- warm intro ----------
export type Candidate = { id: string; full_name: string; headline: string };

export function IntroButton({ targetId, name, candidates }: { targetId: string; name: string; candidates: Candidate[] }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<NetState>({});
  const [pending, start] = useTransition();
  if (candidates.length === 0) return null;
  if (state.ok) return <span role="status" className="text-sm text-muted-foreground">Introduction requested</span>;
  if (!open) return <button type="button" className={outline} onClick={() => setOpen(true)}>Ask for an introduction</button>;
  return (
    <form
      className="panel grid w-full gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => setState(await askIntro(String(f.get("via")), targetId, String(f.get("note")))));
      }}
    >
      <label className="grid gap-1 text-sm font-medium">
        Who should introduce you to {name}?
        <select name="via" className="field font-normal">
          {candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.headline ? `, ${c.headline}` : ""}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Why would you like to meet?
        <textarea name="note" required maxLength={500} rows={3} className="field font-normal" />
      </label>
      {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={solid}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}Send request</button>
        <button type="button" className={quiet} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export function IntroAnswer({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (accept: boolean) => start(async () => { await answerIntro(id, accept); router.refresh(); });
  return (
    <span className="flex gap-2">
      <button type="button" disabled={pending} className={solid} onClick={() => run(true)}>Introduce</button>
      <button type="button" disabled={pending} className={outline} onClick={() => run(false)}>Decline</button>
    </span>
  );
}

// ---------- settings ----------
export function UnblockButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return <button type="button" disabled={pending} className={outline} onClick={() => start(async () => { await unblockMember(id); router.refresh(); })}>Unblock</button>;
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<NetState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium">
        Type DELETE to confirm
        <input name="confirm" autoComplete="off" className="field max-w-xs font-normal" />
      </label>
      {state.error && <p role="alert" className={cx("rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700")}>{state.error}</p>}
      <SubmitButton tone="danger" className="self-start">Delete my account</SubmitButton>
    </form>
  );
}
