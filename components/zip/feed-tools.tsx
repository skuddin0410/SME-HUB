"use client";
import { useRouter } from "next/navigation";

type Opt = { value: string; label: string; href: string; on?: boolean };

/** The slim line above the feed (Update 9): "Show:" and "Sort by:", each going to its own address. */
export function FeedTools({ show, sort }: { show: Opt[]; sort: Opt[] }) {
  const router = useRouter();
  const go = (list: Opt[], v: string) => { const o = list.find((x) => x.value === v); if (o) router.push(o.href); };
  const cur = (list: Opt[]) => list.find((x) => x.on)?.value ?? list[0]?.value;
  return (
    <div className="tools cptools">
      <span className="cpline" />
      {show.length > 1 && (
        <label className="cpsel"><span>Show:</span>
          <select id="ff" value={cur(show)} onChange={(e) => go(show, e.target.value)}>
            {show.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
      )}
      <label className="cpsel"><span>Sort by:</span>
        <select id="sort" value={cur(sort)} onChange={(e) => go(sort, e.target.value)}>
          {sort.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </label>
    </div>
  );
}
