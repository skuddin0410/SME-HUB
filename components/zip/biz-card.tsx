import { Ic } from "@/components/zip/ic";
import { CARD_STYLES, bizLine, cardBg, cardLink, initials, type CardData } from "@/lib/business-card";

/**
 * Update 31: the card itself, 300 x 420 (the same layout as the downloaded image). Classic, Midnight, Maple or
 * Minimal; the QR code always stays dark on a light square so it scans in every style.
 */
export function BizCardView({ d, qr, cls }: { d: CardData; qr?: string | null; cls?: string }) {
  const t = CARD_STYLES[d.style];
  const line = bizLine(d);
  const det: [string, string][] = [];
  if (d.phone) det.push(["phone", d.phone]);
  if (d.email) det.push(["mail", d.email]);
  if (d.website) det.push(["globe", d.website.replace(/^https?:\/\//, "")]);
  // long names shrink to fit one line, down to 16px, then wrap
  const fs = Math.max(16, Math.min(24, Math.floor(268 / Math.max(1, d.name.length * 0.55))));
  return (
    <div className={`bcx${cls ? ` ${cls}` : ""}`} style={{ background: cardBg(t), color: t.ink }} role="img" aria-label={`Business card for ${d.name}, ${t.n} style`}>
      {t.stripe && <i className="bcstripe" style={{ background: t.acc }} />}
      <div className="bctop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={t.logo} alt="" width={70} height={18} />
        <b style={{ color: t.acc }}>MEMBER</b>
      </div>
      {d.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="bcph" src={d.avatar} alt="" width={68} height={68} style={{ borderColor: t.ring }} />
      ) : (
        <span className="bcini" style={{ background: t.acc === "#111111" ? "#111111" : "#B3241A", borderColor: t.ring }}>{initials(d.name)}</span>
      )}
      <div className="bcn" style={{ fontSize: fs }}>{d.name}</div>
      {d.title && <div className="bct" style={{ color: t.sub }}>{d.title}</div>}
      {line && <div className="bcb">{line}</div>}
      {det.length > 0 && (
        <div className="bcd" style={{ color: t.sub }}>
          {det.map(([i, v]) => (
            <span key={i}><Ic n={i} s={12} />{v}</span>
          ))}
        </div>
      )}
      {qr !== null && (
        <>
          <div className="bcq" style={{ background: t.qrbg }} dangerouslySetInnerHTML={{ __html: qr ?? "" }} />
          <div className="bcu" style={{ color: t.sub }}>{cardLink(d.handle)}</div>
        </>
      )}
    </div>
  );
}
