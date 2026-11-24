"use client";
import Link from "next/link";
import { useState } from "react";
import { Ic } from "@/components/zip/ic";
import { gst, loanPay, tlM, tlN, TXR, txLabel } from "@/lib/tools/data";

type Set = (k: string, v: string) => void;

function F({ id, label, v, set, k, pre, suf, help, text }: { id: string; label: string; v: string; set: Set; k: string; pre?: string; suf?: string; help?: string; text?: boolean }) {
  return (
    <label className="tlf" htmlFor={id}>
      <span>{label}</span>
      <span className="tlin">{pre && <i>{pre}</i>}<input id={id} inputMode={text ? undefined : "decimal"} type={text ? "text" : undefined} value={v} onChange={(e) => set(k, e.target.value)} />{suf && <i>{suf}</i>}</span>
      {help && <small>{help}</small>}
    </label>
  );
}
function Sel({ id, label, v, set, k, opts }: { id: string; label: string; v: string; set: Set; k: string; opts: [string, string][] }) {
  return (
    <label className="tlf" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={v} onChange={(e) => set(k, e.target.value)}>{opts.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select>
    </label>
  );
}
const Row = ({ l, v, b }: { l: string; v: string; b?: boolean }) => <div className={`tlr${b ? " b" : ""}`}><span>{l}</span><span>{v}</span></div>;
function useForm(init: Record<string, string>): [Record<string, string>, Set] {
  const [s, setS] = useState(init);
  return [s, (k, v) => setS((x) => ({ ...x, [k]: v }))];
}
function Calc({ inputs, result }: { inputs: React.ReactNode; result: React.ReactNode }) {
  return (
    <div className="tlcalc">
      <form className="card tlin2" onSubmit={(e) => e.preventDefault()}>{inputs}</form>
      <section className="tlres" aria-live="polite" aria-label="Result">{result}</section>
    </div>
  );
}

export function GstTool() {
  const [G, set] = useForm({ prov: "ON", amt: "1000", mode: "add" });
  const add = G.mode !== "remove";
  const x = gst(G.prov, tlN(G.amt), add ? "add" : "remove");
  const r = x.r;
  return (
    <>
      <Calc
        inputs={<>
          <Sel id="tg-p" label="Province or territory" k="prov" v={G.prov} set={set} opts={TXR.map((t) => [t[0], t[1]])} />
          <Sel id="tg-m" label="What do you want to do?" k="mode" v={G.mode} set={set} opts={[["add", "Add tax to a price"], ["remove", "Find the tax inside a total"]]} />
          <F id="tg-a" label={add ? "Price before tax" : "Total including tax"} k="amt" v={G.amt} set={set} pre="$" />
        </>}
        result={<>
          <div className="card tlbig"><p className="tlk">{add ? "Total with tax" : "Price before tax"}</p><p className="tlv">{tlM(add ? x.tot : x.base)}</p><p className="tls">{r[1]}: {txLabel(r[0])}{r[0] === "QC" ? " · QST is filed with Revenu Québec" : ""}</p></div>
          <div className="card tlbreak">
            <Row l="Price before tax" v={tlM(x.base)} />
            {r[4] === "HST" ? <Row l={`HST (${r[2] + r[3]}%)`} v={tlM(x.gst)} /> : <><Row l="GST (5%)" v={tlM(x.gst)} />{r[3] > 0 && <Row l={`${r[4]} (${r[3]}%)`} v={tlM(x.pv)} />}</>}
            <Row l="Total" v={tlM(x.tot)} b />
          </div>
          <div className="card tlnext"><b>Registered for GST/HST?</b><span className="small muted">Add your filing dates and we’ll remind you before each one.</span><Link className="btn sm" href={`/deadlines?prov=${r[0]}`}><Ic n="cal2" s={14} />Set GST/HST reminders</Link></div>
        </>}
      />
      <section className="card tltable">
        <h2>Rates by province and territory</h2>
        <div className="tlscroll">
          <table>
            <thead><tr><th scope="col">Province or territory</th><th scope="col">Sales tax</th><th scope="col" className="num">Total rate</th></tr></thead>
            <tbody>{TXR.map((t) => <tr key={t[0]} className={t[0] === G.prov ? "on" : undefined}><td>{t[1]}</td><td>{txLabel(t[0])}</td><td className="num">{+(t[2] + t[3]).toFixed(3)}%</td></tr>)}</tbody>
          </table>
        </div>
        <p className="small muted">Nova Scotia’s HST fell from 15% to 14% on April 1, 2025. Reviewed October 2026.</p>
      </section>
    </>
  );
}

export function LoanTool() {
  const [L, set] = useForm({ amt: "50000", rate: "7.5", yrs: "5", freq: "12", amt2: "50000", rate2: "9.25", yrs2: "3" });
  const f = tlN(L.freq) || 12;
  const fl = ({ "12": "month", "26": "2 weeks", "52": "week" } as Record<string, string>)[L.freq] ?? "month";
  const sc = (a: string, r: string, y: string) => { const P = tlN(a), pay = loanPay(P, tlN(r), tlN(y), f), tot = pay * tlN(y) * f; return { pay, int: tot - P, tot }; };
  const A = sc(L.amt, L.rate, L.yrs), B = sc(L.amt2, L.rate2, L.yrs2);
  const col = (n: string, s: typeof A) => (
    <div className="card tlbig"><p className="tlk">Option {n}: payment every {fl}</p><p className="tlv">{tlM(s.pay)}</p><div className="tlbreak flat"><Row l="Total interest" v={tlM(s.int, 0)} /><Row l="Total paid" v={tlM(s.tot, 0)} b /></div></div>
  );
  return (
    <Calc
      inputs={<>
        <fieldset className="tlfs"><legend>Option A</legend>
          <F id="tl-a" label="Loan amount" k="amt" v={L.amt} set={set} pre="$" /><F id="tl-r" label="Interest rate (yearly)" k="rate" v={L.rate} set={set} suf="%" /><F id="tl-y" label="Length" k="yrs" v={L.yrs} set={set} suf="years" />
        </fieldset>
        <fieldset className="tlfs"><legend>Option B (to compare)</legend>
          <F id="tl-a2" label="Loan amount" k="amt2" v={L.amt2} set={set} pre="$" /><F id="tl-r2" label="Interest rate (yearly)" k="rate2" v={L.rate2} set={set} suf="%" /><F id="tl-y2" label="Length" k="yrs2" v={L.yrs2} set={set} suf="years" />
        </fieldset>
        <Sel id="tl-f" label="Pay every" k="freq" v={L.freq} set={set} opts={[["12", "Month"], ["26", "2 weeks"], ["52", "Week"]]} />
      </>}
      result={<>
        <div className="tl2">{col("A", A)}{col("B", B)}</div>
        <div className="card tlnext"><b>Option {A.int <= B.int ? "A" : "B"} costs {tlM(Math.abs(A.int - B.int), 0)} less in interest.</b><span className="small muted">A shorter loan usually costs less overall but has higher payments. Check your cash flow before you choose.</span><Link className="btn sm ghost" href="/tools/cashflow">Check my cash flow</Link></div>
      </>}
    />
  );
}

export function PricingTool() {
  const [R, set] = useForm({ fixed: "8000", vc: "12", price: "30", inc: "10" });
  const Fx = tlN(R.fixed), V = tlN(R.vc), P = tlN(R.price), I = tlN(R.inc), cm = P - V;
  const beU = cm > 0 ? Math.ceil(Fx / cm) : 0, margin = P ? (cm / P) * 100 : 0, markup = V ? (cm / V) * 100 : 0, nv = V * (1 + I / 100), np = margin < 100 ? nv / (1 - margin / 100) : 0;
  return (
    <Calc
      inputs={<>
        <F id="tp-f" label="Fixed costs per month" k="fixed" v={R.fixed} set={set} pre="$" help="Rent, salaries, insurance, software" />
        <F id="tp-v" label="Cost to make or buy one unit" k="vc" v={R.vc} set={set} pre="$" />
        <F id="tp-p" label="Your selling price per unit" k="price" v={R.price} set={set} pre="$" />
        <F id="tp-i" label="If your unit cost goes up by" k="inc" v={R.inc} set={set} suf="%" />
      </>}
      result={cm <= 0 ? (
        <div className="card tlwarn"><b>Your price is below your unit cost.</b><p>You lose money on every sale. Raise the price above {tlM(V)}.</p></div>
      ) : <>
        <div className="card tlbig"><p className="tlk">Break-even each month</p><p className="tlv">{beU.toLocaleString("en-CA")} units</p><p className="tls">That’s {tlM(beU * P, 0)} in sales before you make a profit.</p></div>
        <div className="card tlbreak"><Row l="Profit on each unit" v={tlM(cm)} /><Row l="Margin (profit ÷ price)" v={`${margin.toFixed(1)}%`} /><Row l="Markup (profit ÷ cost)" v={`${markup.toFixed(1)}%`} /></div>
        <div className="card tlbig soft"><p className="tlk">If your cost rises {I}% to {tlM(nv)}</p><p className="tlv">{tlM(np)}</p><p className="tls">New price to keep the same {margin.toFixed(1)}% margin, a rise of {tlM(np - P)} per unit.</p></div>
      </>}
    />
  );
}

export function ImportTool() {
  const [M, set] = useForm({ cost: "20", fx: "1.37", units: "500", freight: "1200", duty: "6.5", broker: "250", tax: "5", margin: "40" });
  const c = tlN(M.cost), fx = tlN(M.fx), u = Math.max(1, tlN(M.units)), fr = tlN(M.freight), du = tlN(M.duty), br = tlN(M.broker), tx = tlN(M.tax), mg = tlN(M.margin);
  const goods = c * fx * u, duty = (goods * du) / 100, tax = ((goods + duty) * tx) / 100, land = goods + fr + duty + br, per = land / u, price = mg < 100 ? per / (1 - mg / 100) : 0;
  return (
    <Calc
      inputs={<>
        <F id="ti-c" label="Supplier price per unit" k="cost" v={M.cost} set={set} suf="US$" />
        <F id="ti-x" label="Exchange rate (CA$ per US$1)" k="fx" v={M.fx} set={set} help="Use your bank’s rate on the day you pay" />
        <F id="ti-u" label="Units in the shipment" k="units" v={M.units} set={set} />
        <F id="ti-f" label="Freight and insurance (total)" k="freight" v={M.freight} set={set} pre="$" />
        <F id="ti-d" label="Duty rate" k="duty" v={M.duty} set={set} suf="%" help="Look up your product code in the Canadian customs tariff" />
        <F id="ti-b" label="Customs broker and fees" k="broker" v={M.broker} set={set} pre="$" />
        <F id="ti-t" label="Sales tax paid at the border" k="tax" v={M.tax} set={set} suf="%" help="Usually GST. If you’re registered, you can normally claim it back" />
        <F id="ti-m" label="Target gross margin" k="margin" v={M.margin} set={set} suf="%" />
      </>}
      result={<>
        <div className="card tlbig"><p className="tlk">Landed cost per unit</p><p className="tlv">{tlM(per)}</p><p className="tls">Total landed cost {tlM(land, 0)} for {u.toLocaleString("en-CA")} units</p></div>
        <div className="card tlbreak">
          <Row l="Goods in Canadian dollars" v={tlM(goods, 0)} /><Row l="Freight and insurance" v={tlM(fr, 0)} /><Row l={`Duty (${du}%)`} v={tlM(duty, 0)} />
          <Row l="Broker and fees" v={tlM(br, 0)} /><Row l="Landed cost" v={tlM(land, 0)} b /><Row l="Border sales tax (cash you pay up front)" v={tlM(tax, 0)} />
        </div>
        <div className="card tlbig soft"><p className="tlk">Margin-safe selling price</p><p className="tlv">{tlM(price)}</p><p className="tls">Keeps a {mg}% gross margin before your own overheads, plus sales tax.</p></div>
      </>}
    />
  );
}

export function CashTool() {
  const [C, set] = useForm({ open: "15000", inw: "9000", outw: "8200", o1w: "3", o1a: "-6000", o1t: "GST/HST payment", o2w: "6", o2a: "-4200", o2t: "Payroll remittance", o3w: "9", o3a: "12000", o3t: "Large client payment" });
  let bal = tlN(C.open), low = bal, lowW = 0;
  const ones: Record<number, [number, string][]> = {};
  [1, 2, 3].forEach((i) => { const w = Math.round(tlN(C[`o${i}w`])); if (w >= 1 && w <= 13) (ones[w] ??= []).push([tlN(C[`o${i}a`]), C[`o${i}t`]]); });
  const rows: { w: number; inn: number; out: number; ex: number; lbl: string; bal: number }[] = [];
  for (let w = 1; w <= 13; w++) {
    const inn = tlN(C.inw), out = tlN(C.outw);
    let ex = 0; const lbl: string[] = [];
    (ones[w] ?? []).forEach(([a, t]) => { ex += a; lbl.push(t); });
    bal = bal + inn - out + ex;
    rows.push({ w, inn, out, ex, lbl: lbl.join(", "), bal });
    if (bal < low) { low = bal; lowW = w; }
  }
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.bal)));
  return (
    <Calc
      inputs={<>
        <F id="tc-o" label="Money in the bank today" k="open" v={C.open} set={set} pre="$" />
        <F id="tc-i" label="Money in each week" k="inw" v={C.inw} set={set} pre="$" help="Average sales you collect" />
        <F id="tc-x" label="Money out each week" k="outw" v={C.outw} set={set} pre="$" help="Rent, wages, suppliers, loan payments" />
        {[1, 2, 3].map((i) => (
          <fieldset key={i} className="tlfs tlone"><legend>One-off item {i}</legend>
            <F id={`tc-w${i}`} label="Week (1–13)" k={`o${i}w`} v={C[`o${i}w`]} set={set} />
            <F id={`tc-a${i}`} label="Amount (use − for money out)" k={`o${i}a`} v={C[`o${i}a`]} set={set} pre="$" />
            <F id={`tc-t${i}`} label="What is it?" k={`o${i}t`} v={C[`o${i}t`]} set={set} text />
          </fieldset>
        ))}
      </>}
      result={<>
        <div className={`card tlbig${low < 0 ? " bad" : ""}`}>
          <p className="tlk">{low < 0 ? `You run short in week ${lowW}` : "Lowest balance in the next 13 weeks"}</p>
          <p className="tlv">{tlM(low, 0)}</p>
          <p className="tls">{low < 0 ? "Plan now: move a payment, chase a client or arrange a line of credit." : `Week ${lowW || "—"}. Ending balance after 13 weeks: ${tlM(bal, 0)}.`}</p>
        </div>
        <div className="card tlbars" role="img" aria-label="Bank balance for each of the next 13 weeks">
          {rows.map((r) => <div key={r.w} className="tlbar"><span className={`tlbv${r.bal < 0 ? " neg" : ""}`} style={{ height: `${Math.max(4, Math.round((Math.abs(r.bal) / max) * 100))}%` }} /><small>{r.w}</small></div>)}
        </div>
        <div className="card tltable"><div className="tlscroll"><table>
          <thead><tr><th scope="col">Week</th><th scope="col" className="num">In</th><th scope="col" className="num">Out</th><th scope="col" className="num">One-off</th><th scope="col" className="num">Balance</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.w}><td>{r.w}{r.lbl && <> <span className="small muted">{r.lbl}</span></>}</td><td className="num">{tlM(r.inn, 0)}</td><td className="num">{tlM(-r.out, 0)}</td><td className="num">{r.ex ? tlM(r.ex, 0) : "—"}</td><td className={`num${r.bal < 0 ? " neg" : ""}`}>{tlM(r.bal, 0)}</td></tr>)}</tbody>
        </table></div></div>
        <div className="card tlnext"><b>Remittance dates matter.</b><span className="small muted">GST/HST and payroll payments are big one-off items. Add them to My deadlines so they never surprise you.</span><Link className="btn sm" href="/deadlines">My deadlines</Link></div>
      </>}
    />
  );
}
