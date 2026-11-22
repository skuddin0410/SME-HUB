"use client";

import { useActionState } from "react";
import { Archive, BarChart3, Croissant, Laptop, Network, Ship, Store, Sun, Truck } from "lucide-react";
import { createGroupV2, messageMembers, requestToJoin, saveGroup, saveGroupSettings, type GroupState } from "@/app/(hub)/group-actions";
import { SubmitButton } from "@/components/hub-client";
import { GROUP_COVERS, JOIN_MODES, type GroupSettings } from "@/lib/groups";

const label = "grid gap-1.5 text-sm font-semibold";
const check = "flex items-center gap-2 text-sm";

const ART: Record<string, { icon: typeof Network; from: string; to: string; name: string }> = {
  nodes: { icon: Network, from: "#2563eb", to: "#7c3aed", name: "Network" },
  bars: { icon: BarChart3, from: "#0891b2", to: "#2563eb", name: "Growth" },
  awning: { icon: Store, from: "#e11d48", to: "#f59e0b", name: "Storefront" },
  laptop: { icon: Laptop, from: "#475569", to: "#2563eb", name: "Online" },
  ship: { icon: Ship, from: "#0369a1", to: "#14b8a6", name: "Trade" },
  solar: { icon: Sun, from: "#f59e0b", to: "#16a34a", name: "Energy" },
  truck: { icon: Truck, from: "#b45309", to: "#78716c", name: "Logistics" },
  bakery: { icon: Croissant, from: "#c2410c", to: "#f59e0b", name: "Food" },
};

/** Cover art for a group, drawn from its chosen style (no outside images needed). */
export function GroupCover({ cover, className = "h-20" }: { cover: string; className?: string }) {
  const a = ART[cover] ?? ART.nodes;
  const Icon = a.icon;
  return (
    <div aria-hidden="true" className={`relative w-full overflow-hidden ${className}`} style={{ background: `linear-gradient(120deg, ${a.from}, ${a.to})` }}>
      <Icon className="absolute -bottom-3 right-4 h-[140%] w-auto text-white/20" strokeWidth={1.25} />
    </div>
  );
}

function Msg({ state }: { state: GroupState }) {
  if (state.error) return <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>;
  if (state.ok && state.info) return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.info}</p>;
  return null;
}

function CoverPicker({ defaultValue }: { defaultValue: string }) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="text-sm font-semibold">Cover style</legend>
      <div className="flex flex-wrap gap-2">
        {GROUP_COVERS.map((c) => (
          <label key={c} className="cursor-pointer">
            <input type="radio" name="cover" value={c} defaultChecked={c === defaultValue} className="peer sr-only" />
            <span className="block overflow-hidden rounded-lg ring-2 ring-transparent peer-checked:ring-primary peer-focus-visible:ring-primary/60">
              <GroupCover cover={c} className="h-10 w-16" />
              <span className="sr-only">{ART[c].name}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CreateGroupForm({ s, canPrivate }: { s: GroupSettings; canPrivate: boolean }) {
  const [state, action] = useActionState<GroupState, FormData>(createGroupV2, {});
  const privOk = s.create_private !== "off";
  const pubOk = s.create_public !== "off";
  if (!privOk && !pubOk) return <p className="text-sm text-muted-foreground">New groups are paused right now.</p>;
  return (
    <form action={action} className="mt-4 flex animate-rise flex-col gap-3">
      <input name="name" required minLength={3} maxLength={80} placeholder="Group name" aria-label="Group name" className="field" />
      <textarea name="description" rows={2} maxLength={500} placeholder="What is this group about?" aria-label="Description" className="field" />
      <label className={label}>
        Type
        <select name="category" className="field font-normal">
          {s.types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <CoverPicker defaultValue={s.def_cover} />
      {privOk && (
        <>
          <label className={check}>
            <input type="checkbox" name="is_private" className="h-4 w-4 accent-[hsl(var(--primary))]" /> Private: only members see the posts
          </label>
          {!canPrivate && s.create_private === "paid" && <p className="text-xs text-muted-foreground">Private groups need a paid plan.</p>}
        </>
      )}
      {s.create_public === "approval" && <p className="text-xs text-muted-foreground">Public groups go live once the team approves them.</p>}
      <Msg state={state} />
      <SubmitButton className="self-start">Create group</SubmitButton>
    </form>
  );
}

export function RequestJoinForm({ groupId }: { groupId: string }) {
  const [state, action] = useActionState<GroupState, FormData>(requestToJoin.bind(null, groupId), {});
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-2">
      <textarea name="message" rows={2} maxLength={300} placeholder="Say a few words about why you want to join (optional)" aria-label="Message to the moderators" className="field" />
      <Msg state={state} />
      <SubmitButton className="self-start">Request to join</SubmitButton>
    </form>
  );
}

export function ManageGroupForm({
  groupId,
  g,
  types,
  isAdmin,
  isPrivate,
}: {
  groupId: string;
  g: { description: string; rules: string; cover: string; category: string; join_mode: string };
  types: string[];
  isAdmin: boolean;
  isPrivate: boolean;
}) {
  const [state, action] = useActionState<GroupState, FormData>(saveGroup.bind(null, groupId), {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className={label}>
        Description
        <textarea name="description" rows={3} maxLength={500} defaultValue={g.description} className="field font-normal" />
      </label>
      <label className={label}>
        Group rules
        <textarea name="rules" rows={5} maxLength={2000} defaultValue={g.rules} className="field font-normal" />
      </label>
      <label className={label}>
        Type
        <select name="category" defaultValue={g.category} className="field font-normal">
          {[...new Set([g.category, ...types])].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      {isAdmin && (
        <label className={label}>
          Who can join
          <select name="join_mode" defaultValue={g.join_mode} className="field font-normal">
            {JOIN_MODES.filter((m) => !isPrivate || m.value !== "open").map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <CoverPicker defaultValue={g.cover} />
      <Msg state={state} />
      <SubmitButton className="self-start">Save group</SubmitButton>
    </form>
  );
}

export function MessageAllForm({ groupId }: { groupId: string }) {
  const [state, action] = useActionState<GroupState, FormData>(messageMembers.bind(null, groupId), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <textarea name="body" rows={3} maxLength={2000} required placeholder="Write to every member of this group" aria-label="Message to all members" className="field" />
      <Msg state={state} />
      <SubmitButton tone="outline" className="self-start">
        Send to all members
      </SubmitButton>
    </form>
  );
}

export function GroupSettingsForm({ s }: { s: GroupSettings }) {
  const [state, action] = useActionState<GroupState, FormData>(saveGroupSettings, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>
          Private groups
          <select name="create_private" defaultValue={s.create_private} className="field font-normal">
            <option value="paid">Paid plans only</option>
            <option value="all">Every active member</option>
            <option value="off">Nobody</option>
          </select>
        </label>
        <label className={label}>
          Public groups
          <select name="create_public" defaultValue={s.create_public} className="field font-normal">
            <option value="approval">Need team approval</option>
            <option value="all">Go live straight away</option>
            <option value="off">Nobody</option>
          </select>
        </label>
        <label className={label}>
          Joining a private group
          <select name="priv_join" defaultValue={s.priv_join} className="field font-normal">
            <option value="request">By request</option>
            <option value="invite">By invitation</option>
          </select>
        </label>
        <label className={label}>
          Group list layout
          <select name="layout" defaultValue={s.layout} className="field font-normal">
            <option value="grid">Grid</option>
            <option value="list">List</option>
          </select>
        </label>
        <label className={label}>
          Group page header
          <select name="header" defaultValue={s.header} className="field font-normal">
            <option value="side">Logo beside the name</option>
            <option value="top">Cover on top</option>
          </select>
        </label>
        <label className={label}>
          Default cover
          <select name="def_cover" defaultValue={s.def_cover} className="field font-normal">
            {GROUP_COVERS.map((c) => (
              <option key={c} value={c}>
                {ART[c].name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-sm font-semibold">Shown on group cards</legend>
        {(["cat", "desc", "count", "act", "host"] as const).map((k) => (
          <label key={k} className={check}>
            <input type="checkbox" name={`card_${k}`} defaultChecked={s.card[k]} />
            {{ cat: "Type", desc: "Description", count: "Member count", act: "Join button", host: "Host" }[k]}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-sm font-semibold">Shown on a group page</legend>
        {(["type", "priv", "desc", "faces", "act"] as const).map((k) => (
          <label key={k} className={check}>
            <input type="checkbox" name={`head_${k}`} defaultChecked={s.head[k]} />
            {{ type: "Type", priv: "Public or private", desc: "Description", faces: "Member faces", act: "Join button" }[k]}
          </label>
        ))}
      </fieldset>
      <label className={check}>
        <input type="checkbox" name="msg_all" defaultChecked={s.msg_all} /> Group admins can message all members
      </label>
      <label className={check}>
        <input type="checkbox" name="archive" defaultChecked={s.archive} /> <Archive className="h-4 w-4" aria-hidden="true" /> Group owners can archive their group
      </label>
      <label className={label}>
        Group types (one per line, up to 12)
        <textarea name="types" rows={6} defaultValue={s.types.join("\n")} className="field font-normal" />
      </label>
      <Msg state={state} />
      <SubmitButton className="self-start">Save settings</SubmitButton>
    </form>
  );
}
