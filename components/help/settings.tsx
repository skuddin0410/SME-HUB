"use client";
import { Chip, WordList, useSettings } from "@/components/zip/settings-ui";

type Art = { id: string; title: string; topic: string; popular: boolean };
type Top = { id: string; title: string };

/** Team page for the Help home (Update 8): the popular-search buttons and the most asked questions. */
export function HelpSettingsBody({ articles, topics }: { articles: Art[]; topics: Top[] }) {
  const { get, edit } = useSettings();
  const picked: string[] = get("popular") ?? [];
  const marked = articles.filter((a) => a.popular).slice(0, 8);
  const shown = picked.length ? picked.map((id) => articles.find((a) => a.id === id)).filter((a): a is Art => !!a) : marked;
  const toggle = (id: string) =>
    edit((d) => {
      const cur: string[] = d.popular?.length ? d.popular : marked.map((a) => a.id);
      d.popular = cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 8 ? cur : [...cur, id];
    });
  const move = (i: number, by: number) =>
    edit((d) => {
      const cur: string[] = d.popular?.length ? [...d.popular] : marked.map((a) => a.id);
      const j = i + by;
      if (j < 0 || j >= cur.length) return;
      [cur[i], cur[j]] = [cur[j], cur[i]];
      d.popular = cur;
    });
  return (
    <div className="setgrid">
      <div className="card">
        <h2>Popular searches</h2>
        <p className="small muted">The buttons under the search box on Help home. Selecting one fills the search box and shows the results.</p>
        <WordList path="chips" id="hcchip" placeholder="For example: reset password" addLabel="Add a popular search" remove={(w) => `Remove ${w}`} />
      </div>
      <div className="card">
        <h2>Most asked questions</h2>
        <p className="small muted">Up to 8 articles, in this order. The first one shows open.{picked.length ? "" : " Until you choose, Help home shows the articles marked popular."}</p>
        <ol className="stack" style={{ gap: 6, margin: 0, paddingLeft: 20 }}>
          {shown.map((a, i) => (
            <li key={a.id}>
              <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <span className="grow">{a.title}</span>
                <button type="button" className="btn sm ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${a.title} up`}>Up</button>
                <button type="button" className="btn sm ghost" disabled={i === shown.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${a.title} down`}>Down</button>
              </span>
            </li>
          ))}
        </ol>
        {shown.length >= 8 && <p className="small muted">8 chosen. Remove one to add another.</p>}
        {topics.map((t) => (
          <div key={t.id} className="stack" style={{ gap: 6 }}>
            <b className="small">{t.title}</b>
            <div className="chips">
              {articles.filter((a) => a.topic === t.id).map((a) => (
                <Chip key={a.id} on={shown.some((x) => x.id === a.id)} onClick={() => toggle(a.id)}>{a.title}</Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
