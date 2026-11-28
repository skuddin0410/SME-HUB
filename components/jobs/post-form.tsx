"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { postJob } from "@/app/(hub)/job-actions";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { showSafety } from "@/lib/safety/client";
import { JOB_TYPES, SCAM_JOB, type Job, type JobBiz } from "@/lib/jobs-shared";
import { BizLogo } from "./bits";
import { JobCard } from "./jobs-list";

/** Update 43: Post a job, with the Ontario rules and a live preview. The server checks everything again. */

type Seg<T extends string> = [T, string][];

export function PostJobForm({ businesses, paid, featuredLeft }: { businesses: JobBiz[]; paid: boolean; featuredLeft: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({
    company: businesses[0]?.id ?? "", title: "", type: "Full-time", where: "onsite", size: "small", from: "", to: "", per: "hour",
    vacancy: "yes" as "yes" | "no", ai: "no" as "yes" | "no", desc: "", how: "hub", email: "", url: "", featured: false,
  });
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setErr(""); };
  const b = businesses.find((x) => x.id === f.company) ?? businesses[0];
  const ontario = b?.prov === "ON" && f.size === "big";

  const seg = <T extends string>(k: keyof typeof f, opts: Seg<T>, label: string) => (
    <div className="jxseg" role="radiogroup" aria-label={label}>
      {opts.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={f[k] === v} onClick={() => set(k, v as never)}>{l}</button>)}
    </div>
  );

  const publish = () => {
    const fr = Number(f.from.replace(/[$,\s]/g, "")) || 0, to = Number(f.to.replace(/[$,\s]/g, "")) || 0;
    if (!f.title.trim()) return setErr("Add a job title.");
    if (ontario && !fr) return setErr("Ontario employers with 25 or more people must show the pay.");
    if (to && fr && to < fr) return setErr("The “to” amount should be higher than the “from” amount.");
    if (ontario && f.per === "year" && to - fr > 50000 && to <= 200000) return setErr("In Ontario a yearly pay range can’t be wider than $50,000.");
    if (f.desc.trim().length < 40) return setErr("Tell people a little more about the job (a few sentences).");
    if (ontario && /canadian\s+experience/i.test(f.desc)) return setErr("Ontario job posts can’t ask for “Canadian experience”. Please take it out.");
    if (SCAM_JOB.test(`${f.title} ${f.desc}`)) return setErr("Job posts can’t ask applicants to pay anything, buy equipment or send banking details.");
    if (f.how === "email" && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.email.trim())) return setErr("Add the email address for applications.");
    if (f.how === "url" && !/^https?:\/\/[^\s./]+\.[^\s]+/i.test(f.url.trim())) return setErr("Add the full link, starting with https://");
    start(async () => {
      const r = await postJob({
        company: f.company, title: f.title, type: f.type, where: f.where, big: f.size === "big", from: f.from, to: f.to, per: f.per, desc: f.desc,
        how: f.how, email: f.email, url: f.url, vacancy: ontario ? f.vacancy : "", ai: ontario ? f.ai : "", featured: paid && f.featured && featuredLeft,
      }).catch(() => ({ error: "Your job didn’t post. Try again." }) as { error?: string; safety?: string; held?: boolean; id?: string });
      if ("safety" in r && r.safety) { showSafety(r.safety); return; }
      if (r.error) return setErr(r.error);
      toast(r.held ? "Thanks. Your first job is checked by the Hub team before it shows, usually within a day." : "Your job is live on Jobs, your business page and in Hiring & People.");
      router.push(`/jobs/${r.id}`);
    });
  };

  const preview: Job | null = b ? {
    id: "preview", title: f.title || "Your job title", type: f.type as Job["type"], where: f.where as Job["where"], big: f.size === "big",
    from: Number(f.from.replace(/[$,\s]/g, "")) || null, to: Number(f.to.replace(/[$,\s]/g, "")) || null, per: f.per as Job["per"], desc: "", how: "hub", email: null, url: null,
    vacancy: null, ai: null, featured: paid && f.featured && featuredLeft, status: "open", closes: "", created: new Date().toISOString(), views: 0, biz: b, refs: 0, postedBy: "",
  } : null;

  return (
    <div className="jxfgrid">
      <div className="jxform">
        {businesses.length > 1 ? (
          <>
            <label className="jxl" htmlFor="jxf-biz">Business</label>
            <select id="jxf-biz" className="jxin" value={f.company} onChange={(e) => set("company", e.target.value)}>
              {businesses.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </>
        ) : b && (
          <p className="jxpb"><BizLogo b={b} size="s" /><span>Posting as <b>{b.name}</b></span></p>
        )}
        <label className="jxl" htmlFor="jxf-title">Job title</label>
        <input id="jxf-title" className="jxin" maxLength={120} placeholder="For example: Finishing carpenter" value={f.title} onChange={(e) => set("title", e.target.value)} />
        <span className="jxl">Type</span>
        {seg("type", JOB_TYPES.map((t) => [t, t]), "Type")}
        <span className="jxl">Where</span>
        {seg("where", [["onsite", "On site"], ["hybrid", "Hybrid"], ["remote", "Remote"]], "Where")}
        <p className="jxhelp">{f.where === "remote" ? "Shown as Remote." : `In ${[b?.city, b?.prov].filter(Boolean).join(", ") || "your city"}, from your business page.`}</p>
        <span className="jxl">How many people work at the business?</span>
        {seg("size", [["small", "1 to 24"], ["big", "25 or more"]], "Team size")}
        <span className="jxl">Pay{ontario ? " (required in Ontario)" : ""}</span>
        <div className="jxpay">
          <label><span className="sr">From</span><span className="jxdol">$</span><input className="jxin" inputMode="decimal" placeholder="From" value={f.from} onChange={(e) => set("from", e.target.value)} /></label>
          <span>to</span>
          <label><span className="sr">To</span><span className="jxdol">$</span><input className="jxin" inputMode="decimal" placeholder="To" value={f.to} onChange={(e) => set("to", e.target.value)} /></label>
          {seg("per", [["hour", "an hour"], ["year", "a year"], ["project", "for the project"]], "Pay is counted")}
        </div>
        <p className="jxhelp">{ontario ? "Ontario employers with 25 or more people must show the pay. A yearly range can’t be wider than $50,000." : "Jobs that show pay get more applicants."}</p>
        {ontario && (
          <div className="jxlawf">
            <span className="jxl">Is this an existing job you’re filling now?</span>
            {seg("vacancy", [["yes", "Yes"], ["no", "No, we’re building a list for later"]], "Existing job")}
            <span className="jxl">Do you use AI to screen, sort or choose applicants?</span>
            {seg("ai", [["no", "No"], ["yes", "Yes"]], "AI screening")}
            <p className="jxhelp">Ontario also asks you to tell everyone you interview whether they got the job, within 45 days, and not to ask for “Canadian experience”.</p>
          </div>
        )}
        <label className="jxl" htmlFor="jxf-desc">About the job</label>
        <textarea id="jxf-desc" className="jxin" rows={5} maxLength={5000} placeholder="What they’ll do, the hours, and what you offer" value={f.desc} onChange={(e) => set("desc", e.target.value)} />
        <span className="jxl">How people apply</span>
        {seg("how", [["hub", "On SME Hub"], ["email", "By email"], ["url", "On my website"]], "How people apply")}
        {f.how === "email" ? (
          <><label className="sr" htmlFor="jxf-email">Email for applications</label><input id="jxf-email" className="jxin" type="email" placeholder="jobs@yourbusiness.ca" value={f.email} onChange={(e) => set("email", e.target.value)} /></>
        ) : f.how === "url" ? (
          <><label className="sr" htmlFor="jxf-url">Link for applications</label><input id="jxf-url" className="jxin" placeholder="https://yourbusiness.ca/careers" value={f.url} onChange={(e) => set("url", e.target.value)} /></>
        ) : (
          <p className="jxhelp">Applications come to My job posts and your email. Recommended.</p>
        )}
        <div className={`jxfeatrow${paid ? "" : " lock"}`}>
          <button type="button" className="jxsw" role="switch" aria-checked={paid && f.featured && featuredLeft} aria-label="Feature this job"
            onClick={() => (!paid ? toast("Featured jobs are part of Plus. You can still post this job for free.") : !featuredLeft ? toast("You’ve used this month’s featured job.") : set("featured", !f.featured))}><i /></button>
          <span><b>Feature this job</b><small>{!paid ? "Shown first for 30 days. Part of Plus." : !featuredLeft ? "You’ve used this month’s featured job." : "Shown first for 30 days. 1 featured job left this month."}</small></span>
          {!paid && <Link href="/membership-plans" className="jxplus">Plus</Link>}
        </div>
        {err && <p className="jxerr" role="alert">{err}</p>}
        <div className="jxfoot">
          <button type="button" className="btn dark" disabled={busy} onClick={publish}>{busy ? "Publishing…" : "Publish job"}</button>
          <Link className="btn ghost" href="/jobs">Cancel</Link>
        </div>
      </div>
      <aside className="jxprev">
        <p className="jxeye">Preview</p>
        {preview && <JobCard j={preview} preview />}
        <p className="jxhelp">Jobs stay open for 30 days. You can close them any time.</p>
      </aside>
    </div>
  );
}

export function JobGate({ icon, title, text, children }: { icon: string; title: string; text: string; children?: React.ReactNode }) {
  return <div className="jxgate"><Ic n={icon} s={22} /><div><b>{title}</b><span>{text}</span></div>{children}</div>;
}
