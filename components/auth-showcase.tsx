"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, ChevronRight, Handshake, MessageCircleQuestion, Pause, Play, Users } from "lucide-react";

/**
 * Right-hand panel of the sign-in page: city stories that play like reels (design: docs/design/auth.html).
 * Photos are stock images for atmosphere. The copy describes what SMB Hub offers in each city and makes
 * no claims about named members, member counts, deals or events. Swap in real stories once members agree.
 */
const UNSPLASH = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

const CITIES = [
  {
    city: "Toronto",
    region: "Toronto, ON",
    person: "1573496359142-b8d87734a5a2",
    quote: "Find suppliers, buyers and advisors who run businesses across the GTA.",
    hub: "1517935706615-2717063c2225",
    hubTitle: "Toronto Business Hub",
    hubCaption: "Retail, supply chain and services owners trading what works",
    mini: "1522071820081-009f0129c71c",
  },
  {
    city: "Vancouver",
    region: "Vancouver, BC",
    person: "1506794778202-cad84cf45f1d",
    quote: "Meet BC founders in clean tech, food and trade, and find partners for export.",
    hub: "1559511260-66a654ae982a",
    hubTitle: "Vancouver Trade Hub",
    hubCaption: "Port, freight and CleanBC questions answered by local operators",
    mini: "1517245386807-bb43f82c33c4",
  },
  {
    city: "Montréal",
    region: "Montréal, QC",
    person: "1580489944761-15a19d654956",
    quote: "Talk with Québec entrepreneurs in English or French and grow across provinces.",
    hub: "1519178614-68673b201f36",
    hubTitle: "Montréal Design Hub",
    hubCaption: "Studios, makers and exporters sharing packaging and distribution tips",
    mini: "1521737711867-e3b97375f902",
  },
  {
    city: "Calgary",
    region: "Calgary, AB",
    person: "1507003211169-0a1dd7228f2d",
    quote: "Practical advice from operators who run payroll in Canada, and real introductions.",
    hub: "1581091226825-a6a2a5aee158",
    hubTitle: "Calgary Operations Hub",
    hubCaption: "Manufacturers and AgTech owners comparing freight and customs costs",
    mini: "1552664730-d307ca884978",
  },
] as const;

const STORY_MS = 6000;
const TICK_MS = 100;
const EMOJIS = ["👏", "🔥", "💡", "🍁", "❤️"];

export function AuthShowcase({ onJoin }: { onJoin: () => void }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [fading, setFading] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; emoji: string; left: number; delay: number }[]>([]);
  const burstId = useRef(0);
  const story = CITIES[index];
  const paused = hovering || stopped;

  const go = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => {
      setIndex(((next % CITIES.length) + CITIES.length) % CITIES.length);
      setProgress(0);
      setFading(false);
    }, 140);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setProgress((p) => p + (TICK_MS / STORY_MS) * 100), TICK_MS);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    if (progress >= 100) go(index + 1);
  }, [progress, index, go]);

  const clap = () => {
    const now = Array.from({ length: 4 }, (_, i) => ({
      id: ++burstId.current,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      left: Math.floor(Math.random() * 28),
      delay: i * 85,
    }));
    setBursts((b) => [...b, ...now]);
    setTimeout(() => setBursts((b) => b.filter((x) => !now.some((n) => n.id === x.id))), 1300);
  };

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="h-full flex flex-col gap-4 select-none"
    >
      {/* card 1: badge and city tabs */}
      <div className="bg-white border border-[#E6E3DC] rounded-3xl shadow-auth-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E6E3DC]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11.5px] font-semibold text-slate-800 whitespace-nowrap">Built for Canadian founders &amp; owners</span>
        </div>
        <div className="inline-flex items-center p-1 rounded-full bg-white border border-[#E6E3DC]" role="tablist" aria-label="City">
          {CITIES.map((c, i) => (
            <button
              key={c.city}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => go(i)}
              className={
                i === index
                  ? "px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-slate-900 text-white whitespace-nowrap transition-all"
                  : "px-2.5 py-1 rounded-full text-[11.5px] font-medium text-slate-600 hover:text-slate-950 whitespace-nowrap transition-all"
              }
            >
              {c.city}
            </button>
          ))}
        </div>
      </div>

      {/* cards 2-4: the reel, featured hub and city circle at fixed heights, so photos never stretch */}
      <div className="grid grid-cols-12 gap-4 shrink-0">
        {/* the reel */}
        <div className="col-span-12 sm:col-span-7 relative rounded-3xl overflow-hidden group cursor-pointer shadow-auth-card border border-[#E6E3DC] bg-stone-200 flex flex-col justify-between h-[480px] lg:h-[420px] xl:h-[480px]">
          <img
            src={UNSPLASH(story.person, 900)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center reel-photo-motion transition-opacity duration-300"
            style={{ opacity: fading ? 0.5 : 1 }}
          />
          <button type="button" onClick={() => go(index - 1)} aria-label="Previous city story" className="absolute inset-y-12 left-0 w-1/3 z-10 cursor-pointer focus:outline-none" />
          <button type="button" onClick={() => go(index + 1)} aria-label="Next city story" className="absolute inset-y-12 right-0 w-1/3 z-10 cursor-pointer focus:outline-none" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 via-black/15 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

          <div className="relative z-20 p-3.5 space-y-2.5">
            <div className="grid grid-cols-4 gap-1.5">
              {CITIES.map((c, i) => (
                <div key={c.city} className="h-1 rounded-full bg-white/35 overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-100" style={{ width: i < index ? "100%" : i === index ? `${Math.min(100, progress)}%` : "0%" }} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStopped((s) => !s)}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold tracking-wide hover:bg-black/60 transition-colors"
              >
                <span className={`flex items-end gap-0.5 h-3 ${paused ? "eq-paused" : ""}`} aria-hidden="true">
                  <span className="w-0.5 h-3 bg-emerald-400 rounded-full eq-bar-1" />
                  <span className="w-0.5 h-3 bg-emerald-400 rounded-full eq-bar-2" />
                  <span className="w-0.5 h-3 bg-emerald-400 rounded-full eq-bar-3" />
                  <span className="w-0.5 h-3 bg-emerald-400 rounded-full eq-bar-4" />
                  <span className="w-0.5 h-3 bg-emerald-400 rounded-full eq-bar-2" />
                </span>
                <span>{stopped ? "PAUSED • TAP TO PLAY" : "PLAYING • TAP TO PAUSE"}</span>
                {stopped ? <Play className="w-3 h-3 text-white/90" /> : <Pause className="w-3 h-3 text-white/90" />}
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next story"
                className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute right-4 bottom-24 w-12 h-32 overflow-visible z-20">
            {bursts.map((b) => (
              <span key={b.id} className="emoji-burst absolute bottom-0 text-lg select-none" style={{ left: b.left, animationDelay: `${b.delay}ms` }}>
                {b.emoji}
              </span>
            ))}
          </div>

          <div className="relative z-20 p-4 flex items-end justify-between gap-2.5">
            <div className="min-w-0 flex-1 text-white">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <img src={UNSPLASH(story.person, 140)} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white/90" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black/60" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-jakarta font-bold text-[14.5px] text-white truncate">{story.city} founders</h3>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-white/20 backdrop-blur-md text-white border border-white/25 shrink-0">
                      <BadgeCheck className="w-2.5 h-2.5 text-emerald-300" />
                      <span>Open circle</span>
                    </span>
                  </div>
                  <p className="text-[11.5px] text-white/85 truncate">Founders &amp; owners • {story.region}</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] font-medium text-white/95 line-clamp-2 leading-snug">&ldquo;{story.quote}&rdquo;</p>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={clap}
                aria-label="Applaud"
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-rose-500/90 active:scale-90 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-sm transition-all"
              >
                <span className="text-sm leading-none">👏</span>
              </button>
              <span className="text-[10.5px] font-bold text-white drop-shadow">Clap</span>
            </div>
          </div>
        </div>

        {/* featured hub and city circle */}
        <div className="col-span-12 sm:col-span-5 grid grid-rows-2 gap-4 h-[480px] lg:h-[420px] xl:h-[480px]">
          <Link href="/groups" className="relative rounded-3xl overflow-hidden group cursor-pointer border border-[#E6E3DC] shadow-auth-card flex flex-col justify-between p-3.5">
            <img src={UNSPLASH(story.hub, 800)} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
            <div className="relative z-10 flex items-center justify-between gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-white text-[9.5px] font-bold uppercase tracking-wider border border-white/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>FEATURED HUB</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/95 group-hover:bg-white text-slate-950 text-[10.5px] font-bold transition-all whitespace-nowrap">Explore ↗</span>
            </div>
            <div className="relative z-10 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {CITIES.filter((c) => c.city !== story.city)
                    .slice(0, 3)
                    .map((c) => (
                      <img key={c.city} src={UNSPLASH(c.person, 64)} alt="" className="w-5 h-5 rounded-full ring-1 ring-white object-cover" />
                    ))}
                </div>
                <span className="text-[11px] font-bold text-white truncate">{story.hubTitle}</span>
              </div>
              <p className="font-jakarta font-bold text-[12.5px] text-white/95 leading-snug line-clamp-2">{story.hubCaption}</p>
            </div>
          </Link>

          <div className="relative rounded-3xl overflow-hidden group border border-[#E6E3DC] shadow-auth-card flex flex-col justify-between p-3.5">
            <img src={UNSPLASH(story.mini, 700)} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />
            <div className="relative z-10 flex items-center justify-between gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-white text-[10px] font-semibold border border-white/15 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">City circle • Open to all</span>
              </span>
            </div>
            <div className="relative z-10 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="flex -space-x-1.5">
                    {CITIES.slice(0, 3).map((c) => (
                      <img key={c.city} src={UNSPLASH(c.person, 64)} alt="" className="w-5 h-5 rounded-full ring-1 ring-white object-cover" />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold text-white/90">Free to join</span>
                </div>
                <h4 className="font-jakarta font-bold text-[13px] text-white leading-tight truncate">{story.city} Founders Circle</h4>
              </div>
              <button
                type="button"
                onClick={onJoin}
                className="shrink-0 px-3 py-1.5 rounded-full bg-white hover:bg-blue-50 text-slate-950 text-[10.5px] font-bold transition-all whitespace-nowrap"
              >
                Join 👋
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* card 5: what members do here. Grows to meet the bottom of the sign-in card. */}
      <div className="flex-1 bg-white border border-[#E6E3DC] rounded-3xl shadow-auth-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl bg-slate-50 border border-slate-200/70 p-3.5 flex flex-col justify-center">
            <span className="w-8 h-8 rounded-xl bg-white border border-[#E6E3DC] flex items-center justify-center">
              <f.icon className={`w-4 h-4 ${f.tint}`} />
            </span>
            <h4 className="mt-2.5 font-jakarta font-bold text-[13px] text-slate-950">{f.title}</h4>
            <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: MessageCircleQuestion, tint: "text-blue-600", title: "Ask owners", body: "Questions answered by people who run businesses." },
  { icon: Handshake, tint: "text-emerald-600", title: "Find partners", body: "Suppliers, buyers and advisors across Canada." },
  { icon: Users, tint: "text-rose-600", title: "Join circles", body: "City and topic groups, free to join." },
] as const;
