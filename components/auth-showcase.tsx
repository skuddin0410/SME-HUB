"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

/**
 * Right-hand panel of the sign-in page: the twilight Toronto skyline with city cards.
 * Copy describes what SMB Hub offers; it makes no claims about member numbers or results.
 * Swap in real figures and real, approved member quotes once we have them.
 */
const CITIES = {
  Toronto: {
    initials: "TO",
    name: "Toronto Circle",
    role: "Founders & owners • Toronto, ON",
    quote: "Ask for a supplier, a co-packer or a tax advisor and get answers from people who run businesses in the GTA.",
    tag: "#TorontoFounders • Local network",
  },
  Vancouver: {
    initials: "VA",
    name: "Vancouver Circle",
    role: "Founders & owners • Vancouver, BC",
    quote: "Meet BC founders in clean tech, food and manufacturing, and find partners for export and growth.",
    tag: "#VancouverFounders • Export growth",
  },
  "Montréal": {
    initials: "MT",
    name: "Montréal Circle",
    role: "Founders & owners • Montréal, QC",
    quote: "Talk with Québec entrepreneurs in English or French and expand from one province to the next.",
    tag: "#MontrealFounders • Bilingual",
  },
  Calgary: {
    initials: "CA",
    name: "Calgary Circle",
    role: "Founders & owners • Calgary, AB",
    quote: "Practical advice from operators who run payroll in Canada, and introductions that lead to real work.",
    tag: "#CalgaryFounders • Operator circle",
  },
} as const;
type City = keyof typeof CITIES;

export function AuthShowcase() {
  const [city, setCity] = useState<City>("Toronto");
  const data = CITIES[city];

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-elevated bg-slate-950 min-h-[520px] sm:min-h-[580px] flex flex-col justify-between p-5 sm:p-8">
      <Skyline />

      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-tr from-blue-500/20 via-indigo-400/10 to-transparent blur-2xl" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/75 border border-white/15 backdrop-blur-[14px] text-white text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">For Canadian founders & business owners</span>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900/75 border border-white/15 backdrop-blur-[14px]" role="tablist" aria-label="City">
          {(Object.keys(CITIES) as City[]).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={c === city}
              onClick={() => setCity(c)}
              className={
                c === city
                  ? "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-slate-900 transition-all"
                  : "px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white transition-all"
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 space-y-4 mt-16 sm:mt-24">
        <div className="max-w-md rounded-2xl bg-slate-900/80 border border-white/15 backdrop-blur-[14px] p-4 text-white shadow-glass auth-float-slow">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-jakarta font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-white/20">
                {data.initials}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-white">{data.name}</h3>
                  <span className="px-1.5 rounded text-[10px] font-semibold bg-blue-500/25 text-blue-300 border border-blue-400/30">Open group</span>
                </div>
                <p className="text-xs text-slate-300">{data.role}</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">Free</span>
          </div>

          <p className="mt-3 text-xs sm:text-[13px] text-slate-200 leading-relaxed">{data.quote}</p>

          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span className="text-amber-300 font-medium">{data.tag}</span>
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> Direct messages
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-white/40 dark:border-slate-700/80 backdrop-blur-[14px] p-4 shadow-glass auth-float-delayed">
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                FEDERAL &amp; PROVINCIAL GRANTS
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">Grants &amp; Funding Programs</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Federal and provincial programs, discussed by the owners who apply for them.</p>
          </div>

          <div className="rounded-2xl bg-slate-900/85 border border-white/15 backdrop-blur-[14px] p-4 text-white shadow-glass">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-teal-300">COAST-TO-COAST REACH</span>
              <span className="text-[11px] font-mono text-slate-400">10 PROV • 3 TERR</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-jakarta font-bold text-xl text-white">13</span>
              <span className="text-[11px] text-slate-300">provinces and territories, one network</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Business listings • Groups • Direct messages</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The design's twilight waterfront: sky, towers, dome, CN Tower and Lake Ontario. */
function Skyline() {
  return (
    <svg className="absolute inset-0 w-full h-full object-cover" viewBox="0 0 900 680" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="skyTwilight" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#090D1C" />
          <stop offset="45%" stopColor="#172554" />
          <stop offset="72%" stopColor="#312E81" />
          <stop offset="88%" stopColor="#9A3412" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="waterSurface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#0F172A" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#050811" />
        </linearGradient>
        <radialGradient id="horizonGlow" cx="72%" cy="66%" r="55%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
          <stop offset="45%" stopColor="#EC4899" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="towerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="900" height="470" fill="url(#skyTwilight)" />
      <rect width="900" height="470" fill="url(#horizonGlow)" />

      <g fill="#FFFFFF" opacity="0.65">
        <circle cx="140" cy="70" r="1.3" />
        <circle cx="290" cy="48" r="1.1" />
        <circle cx="430" cy="95" r="1.5" />
        <circle cx="540" cy="52" r="1" />
        <circle cx="810" cy="85" r="1.4" />
        <circle cx="210" cy="145" r="0.9" />
        <circle cx="620" cy="130" r="1.2" />
      </g>

      <g fill="#0B1120" opacity="0.72">
        <rect x="80" y="340" width="44" height="130" rx="2" />
        <rect x="132" y="310" width="52" height="160" rx="2" />
        <rect x="195" y="355" width="38" height="115" rx="2" />
        <rect x="330" y="325" width="48" height="145" rx="2" />
        <rect x="390" y="295" width="56" height="175" rx="2" />
        <rect x="460" y="335" width="42" height="135" rx="2" />
        <rect x="515" y="280" width="60" height="190" rx="2" />
        <rect x="590" y="315" width="46" height="155" rx="2" />
        <rect x="735" y="330" width="50" height="140" rx="2" />
        <rect x="795" y="350" width="58" height="120" rx="2" />
      </g>

      <g fill="#070B14">
        <rect x="245" y="290" width="44" height="180" rx="2" />
        <rect x="425" y="265" width="54" height="205" rx="2" />
        <rect x="550" y="255" width="50" height="215" rx="2" />
        <rect x="615" y="305" width="45" height="165" rx="2" />
      </g>

      <g fill="#FBBF24" opacity="0.55">
        <rect x="255" y="305" width="4" height="6" />
        <rect x="267" y="305" width="4" height="6" />
        <rect x="255" y="320" width="4" height="6" />
        <rect x="275" y="335" width="4" height="6" />
        <rect x="438" y="282" width="5" height="7" />
        <rect x="452" y="282" width="5" height="7" />
        <rect x="465" y="298" width="5" height="7" />
        <rect x="438" y="315" width="5" height="7" />
        <rect x="562" y="272" width="5" height="7" />
        <rect x="578" y="272" width="5" height="7" />
        <rect x="562" y="292" width="5" height="7" />
        <rect x="578" y="312" width="5" height="7" />
      </g>

      <path d="M475 470 C475 415, 575 415, 575 470 Z" fill="#1E293B" />
      <path d="M482 470 C482 424, 568 424, 568 470 Z" fill="none" stroke="#60A5FA" strokeWidth="2.5" opacity="0.85" />

      <circle cx="690" cy="212" r="46" fill="url(#towerGlow)" />
      <line x1="690" y1="68" x2="690" y2="195" stroke="#CBD5E1" strokeWidth="2.2" />
      <polygon points="682,470 687,225 693,225 698,470" fill="#0F172A" />
      <polygon points="686,225 689,195 691,195 694,225" fill="#1E293B" />
      <ellipse cx="690" cy="212" rx="22" ry="7" fill="#1E293B" stroke="#93C5FD" strokeWidth="1.5" />
      <rect x="672" y="209" width="36" height="4" rx="2" fill="#60A5FA" />
      <ellipse cx="690" cy="152" rx="8" ry="3.5" fill="#93C5FD" />

      <rect x="0" y="470" width="900" height="210" fill="url(#waterSurface)" />
      <line x1="0" y1="470" x2="900" y2="470" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.45" />

      <g strokeLinecap="round" opacity="0.45">
        <line x1="684" y1="485" x2="696" y2="485" stroke="#60A5FA" strokeWidth="2" />
        <line x1="680" y1="505" x2="700" y2="505" stroke="#60A5FA" strokeWidth="1.8" />
        <line x1="683" y1="528" x2="697" y2="528" stroke="#93C5FD" strokeWidth="1.4" />
        <line x1="505" y1="488" x2="545" y2="488" stroke="#818CF8" strokeWidth="2" />
        <line x1="512" y1="508" x2="538" y2="508" stroke="#818CF8" strokeWidth="1.5" />
        <line x1="435" y1="492" x2="465" y2="492" stroke="#FBBF24" strokeWidth="1.6" />
        <line x1="560" y1="496" x2="585" y2="496" stroke="#FBBF24" strokeWidth="1.6" />
      </g>
    </svg>
  );
}
