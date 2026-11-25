/** Loading shapes in the page's own layout. They only suggest the page; nothing here reads data. */
const Sk = ({ w, h, r, style }: { w?: number | string; h?: number; r?: boolean; style?: React.CSSProperties }) => (
  <span className={`zsk${r ? " r" : ""}`} aria-hidden="true" style={{ width: w ?? "100%", height: h ?? 12, ...style }} />
);

const Busy = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="sk" role="status" aria-busy="true" aria-label={label}>
    <span className="sr">{label}</span>
    {children}
  </div>
);

export function SkPost() {
  return (
    <div className="card skcard sk">
      <div className="row"><Sk w={44} h={44} r /><div className="stack grow" style={{ gap: 8 }}><Sk w={160} /><Sk w={100} /></div></div>
      <Sk /><Sk w="82%" /><Sk w="55%" />
    </div>
  );
}

/** The feed column: composer plus a few posts. */
export function SkFeed() {
  return (
    <Busy label="Loading the feed">
      <div className="card sk"><div className="row"><Sk w={44} h={44} r /><Sk h={44} style={{ borderRadius: 14, flex: 1 }} /></div></div>
      <div className="stack" style={{ gap: 16, marginTop: 16 }}>{[0, 1, 2].map((i) => <SkPost key={i} />)}</div>
    </Busy>
  );
}

/** A full page: heading, a search row and a grid of cards. */
export function SkPage({ cards = 6 }: { cards?: number }) {
  return (
    <div className="zip skroot">
      <div className="wrap sk" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <Busy label="Loading the page">
          <div className="stack" style={{ gap: 10, marginBottom: 22 }}><Sk w={140} /><Sk w={260} h={28} /><Sk w="min(520px,90%)" /></div>
          <Sk h={44} style={{ borderRadius: 999, marginBottom: 20, maxWidth: 520 }} />
          <div className="htgrid">{Array.from({ length: cards }, (_, i) => (
            <div className="card skcard sk" key={i}><Sk w="60%" h={18} /><Sk w="40%" /><div className="row"><Sk w={84} h={32} style={{ borderRadius: 10 }} /><Sk w={84} h={32} style={{ borderRadius: 10 }} /></div></div>
          ))}</div>
        </Busy>
      </div>
    </div>
  );
}

/** A profile: cover, avatar and name, then two cards. */
export function SkProfile() {
  return (
    <div className="zip skroot">
      <div className="wrap sk" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <Busy label="Loading the profile">
          <div className="card sk" style={{ padding: 0, overflow: "hidden" }}>
            <Sk h={150} style={{ borderRadius: 0 }} />
            <div className="stack" style={{ gap: 10, padding: 20 }}><Sk w={88} h={88} r style={{ marginTop: -56 }} /><Sk w={220} h={22} /><Sk w={300} /><div className="row"><Sk w={110} h={36} style={{ borderRadius: 10 }} /><Sk w={110} h={36} style={{ borderRadius: 10 }} /></div></div>
          </div>
          <div className="stack" style={{ gap: 16, marginTop: 16 }}>{[0, 1].map((i) => <div className="card skcard sk" key={i}><Sk w={120} h={18} /><Sk /><Sk w="90%" /><Sk w="60%" /></div>)}</div>
        </Busy>
      </div>
    </div>
  );
}

/** A side column: two or three cards, shown while the column's own data loads (the page itself does not wait for it). */
export function SkRail({ cards = 2 }: { cards?: number }) {
  return (
    <div className="stack sk" style={{ gap: 16 }} aria-hidden="true">
      {Array.from({ length: cards }, (_, i) => <div className="card skcard sk" key={i}><Sk w="50%" h={16} /><Sk /><Sk w="80%" /><Sk w={96} h={30} style={{ borderRadius: 10 }} /></div>)}
    </div>
  );
}
