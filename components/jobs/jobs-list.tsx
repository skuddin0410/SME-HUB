"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { saveJob } from "@/app/(hub)/job-actions";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { ageText, hourly, payText, whereText, type Job } from "@/lib/jobs-shared";
import { BizLogo } from "./bits";

/** Update 43: the Jobs list: search, type, province, remote, saved and sort; featured jobs first. */

const TYPES: [string, string][] = [["all", "All"], ["Full-time", "Full-time"], ["Part-time", "Part-time"], ["gig", "Contract and freelance"], ["Seasonal", "Seasonal"]];

export function JobCard({ j, saved, applied, onSave, preview }: { j: Job; saved?: boolean; applied?: boolean; onSave?: () => void; preview?: boolean }) {
  const href = j.fromPage ? `/businesses/${j.biz.slug}?tab=jobs` : `/jobs/${j.id}`;
  return (
    <article className={`jxcard${j.featured ? " jxft" : ""}`}>
      {!preview && <Link className="jxlink" href={href} aria-label={`${j.title} at ${j.biz.name}`} />}
      <BizLogo b={j.biz} />
      <div className="jxmain">
        <div className="jxtop">
          {j.featured && <span className="jxfeat"><Ic n="spark" s={11} />Featured</span>}
          {applied && <span className="jxapp"><Ic n="check" s={11} />Applied</span>}
        </div>
        <h3>{j.title}</h3>
        <p className="jxbiz">{j.biz.name} · {whereText(j)}</p>
        <p className="jxmeta">
          <b>{payText(j)}</b>
          <span>{j.type}</span>
          <span>{ageText(j.created)}</span>
          {j.refs > 0 && <span className="jxref"><Ic n="users" s={12} />{j.refs} member{j.refs === 1 ? "" : "s"} recommended someone</span>}
        </p>
      </div>
      {!preview && !j.fromPage && onSave && (
        <button type="button" className="jxsave" aria-pressed={!!saved} aria-label={saved ? "Remove from saved" : "Save this job"} onClick={onSave}><Ic n="bookmark" s={17} /></button>
      )}
    </article>
  );
}

export function JobsList({ jobs, saved: saved0, applied, signedIn, mineOpen }: { jobs: Job[]; saved: string[]; applied: string[]; signedIn: boolean; mineOpen: number }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [prov, setProv] = useState("");
  const [remote, setRemote] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const [sort, setSort] = useState<"new" | "pay">("new");
  const [saved, setSaved] = useState<Set<string>>(new Set(saved0));
  const done = useMemo(() => new Set(applied), [applied]);

  const provs = useMemo(() => [...new Set(jobs.map((j) => j.biz.prov).filter(Boolean))].sort(), [jobs]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const L = jobs.filter((j) => {
      if (type !== "all" && (type === "gig" ? !["Contract", "Freelance"].includes(j.type) : j.type !== type)) return false;
      if (remote && j.where !== "remote") return false;
      if (prov && j.biz.prov !== prov) return false;
      if (onlySaved && !saved.has(j.id)) return false;
      if (s && !`${j.title} ${j.biz.name} ${j.desc}`.toLowerCase().includes(s)) return false;
      return true;
    });
    L.sort((a, b) => (sort === "pay" ? hourly(b) - hourly(a) : Number(b.featured) - Number(a.featured) || b.created.localeCompare(a.created)));
    return L;
  }, [jobs, q, type, prov, remote, onlySaved, saved, sort]);

  const toggle = (id: string) => {
    if (!signedIn) return void (window.location.href = "/auth/sign-up");
    const on = !saved.has(id);
    setSaved((x) => { const n = new Set(x); if (on) n.add(id); else n.delete(id); return n; });
    toast(on ? "Saved. Find it under Saved on Jobs." : "Removed from saved");
    saveJob(id, on).then((r) => {
      if (r.error) { setSaved((x) => { const n = new Set(x); if (on) n.delete(id); else n.add(id); return n; }); toast(r.error); }
    });
  };
  const clear = () => { setQ(""); setType("all"); setProv(""); setRemote(false); setOnlySaved(false); setSort("new"); };

  return (
    <div className="jxpage">
      <div className="jxhead">
        <div>
          <p className="jxeye"><Ic n="brief" s={13} /> SME Hub Jobs</p>
          <h1>Jobs at Canadian small businesses</h1>
          <p className="jxsub">Real jobs from owners you can look up. Every job links to the business page and its reviews.</p>
        </div>
        <div className="jxhb">
          {signedIn ? (
            <>
              <Link className="btn sm dark" href="/jobs/post"><Ic n="plus" s={14} />Post a job</Link>
              {mineOpen > 0 && <Link className="btn sm ghost" href="/jobs/mine">My job posts ({mineOpen})</Link>}
            </>
          ) : (
            <Link className="btn sm dark" href="/auth/sign-up">Join free to post a job</Link>
          )}
        </div>
      </div>

      <div className="jxbar">
        <label className="jxsearch"><Ic n="search" s={16} /><span className="sr">Search jobs</span><input placeholder="Job title, skill or business" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <div className="jxseg" role="radiogroup" aria-label="Type of job">
          {TYPES.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)}>{l}</button>)}
        </div>
        <div className="jxbar2">
          <label className="jxsel"><span className="sr">Province</span>
            <select value={prov} onChange={(e) => setProv(e.target.value)}>
              <option value="">All of Canada</option>
              {provs.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <button type="button" className="jxchip" aria-pressed={remote} onClick={() => setRemote((x) => !x)}><Ic n="globe" s={13} />Remote only</button>
          <button type="button" className="jxchip" aria-pressed={onlySaved} onClick={() => setOnlySaved((x) => !x)}><Ic n="bookmark" s={13} />Saved ({saved.size})</button>
          <span className="grow" />
          <label className="jxsel"><span className="sr">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as "new" | "pay")}>
              <option value="new">Newest first</option>
              <option value="pay">Highest pay</option>
            </select>
          </label>
        </div>
      </div>

      <div className="jxgrid">
        <div className="jxlist">
          <p className="jxcount" aria-live="polite">{list.length} job{list.length === 1 ? "" : "s"}</p>
          {list.length ? list.map((j) => <JobCard key={j.id} j={j} saved={saved.has(j.id)} applied={done.has(j.id)} onSave={() => toggle(j.id)} />) : (
            <div className="jxempty">
              <b>{jobs.length ? "No jobs match" : "No jobs yet"}</b>
              <span>{jobs.length ? "Try another type or province, or clear the search." : "Be the first: post a job from your business page."}</span>
              {jobs.length > 0 && <button type="button" className="btn sm ghost" onClick={clear}>Clear filters</button>}
            </div>
          )}
        </div>
        <aside className="jxside">
          <div className="jxbox">
            <h2>Hiring?</h2>
            <p>Post a job in about 5 minutes. It shows here, on your business page and in the Hiring &amp; People group.</p>
            <ul><li><b>Free:</b> 1 job at a time</li><li><b>Plus:</b> unlimited jobs and one featured job a month</li></ul>
            <Link className="btn sm dark" href={signedIn ? "/jobs/post" : "/auth/sign-up"}>Post a job</Link>
          </div>
          <div className="jxbox jxsafe">
            <Ic n="lock" s={16} />
            <div><b>Stay safe</b><span>Jobs on SME Hub never ask you to pay to apply, buy a starter kit or share banking details before you’re hired. If one does, report it.</span></div>
          </div>
          <div className="jxbox">
            <h2>Know someone?</h2>
            <p>Most small businesses hire people their contacts recommend. Open a job and select <b>I know someone</b>.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
