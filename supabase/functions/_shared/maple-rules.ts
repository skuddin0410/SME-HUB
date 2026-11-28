// Maple step 1, "Hub data, no AI": questions the Hub can answer from its own pages and rules.
// Plain TypeScript with no imports, shared by the maple-ask Edge Function (Deno) and the Hub's server (Next.js),
// so both give the same answer. The wording is the design's (Update 46, ml.js mlAnswer).
// People and posts are filled in by the Hub's server from what members made visible ("need").

/** A button under an answer: open a Hub page, ask the community, or start the profile builder. */
export type MapleAct = [label: string, kind: "nav" | "ask" | "profile", arg: string];
export type MapleSource = [title: string, url: string];
export type MapleNeed = {
  /** SME Advisors matched to these words (in their "can help with" list and headline) */
  advisors?: { n: number; kw?: string[] };
  /** members the search found, optionally only those whose "can help with" matches */
  members?: { n: number; match?: string };
  /** community replies the search found */
  posts?: number;
};
export type MapleAnswer = {
  /** paragraphs; **bold** is allowed */
  t: string[];
  acts?: MapleAct[];
  src?: MapleSource[];
  /** a tax, legal or money topic: people are shown as "SME Advisors who can help" */
  pro?: boolean;
  chips?: string[];
  /** approved by the Hub team: the date it was checked (or true) */
  lib?: string | true;
  /** out of questions: show "See plans" */
  limit?: boolean;
  need?: MapleNeed;
  /** "people" answers: the Hub server writes the first paragraph once it knows who it found */
  kind?: "people" | "posts";
  /** filled in by the Hub server */
  people?: MaplePerson[];
  posts?: MaplePost[];
};
export type MaplePerson = { id: string; name: string; avatar: string | null; sub: string; advisor: boolean };
export type MaplePost = { id: string; name: string; avatar: string | null; authorId: string; reply: boolean; role: string; text: string };

/** What Maple may know about the member (only when they allow it in Settings). */
export type MapleCtx = { first: string; city: string; industry: string; ontario: boolean; isNew: boolean };
/** What the Hub's search found for the question (counts only). */
export type MapleFound = { posts: number; members: number };

export const MAPLE_SUGGEST = ["Are there grants for my business?", "When is my next GST/HST payment due?", "Find a bookkeeper who can help me", "How should I price a new service?"];
export const MAPLE_TRY = [...MAPLE_SUGGEST, "What events are coming up?", "How do I post a job?"];

export const MAPLE_SRC: Record<string, MapleSource> = {
  grants: ["Business grants and financing, Government of Canada", "https://www.canada.ca/en/services/business/grants.html"],
  gst: ["GST/HST for businesses, Canada Revenue Agency", "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html"],
  start: ["Starting a business, Government of Canada", "https://www.canada.ca/en/services/business/start.html"],
  scam: ["Recognize scams and fraud, Canadian Anti-Fraud Centre", "https://antifraudcentre-centreantifraude.ca/"],
};
/** When the sources above were last checked (shown as "checked Nov 2026"). */
export const MAPLE_SRC_CHECKED = "Nov 2026";

/** Hub pages the answers link to. */
export const MAPLE_HREF = {
  grants: "/grants",
  deadlines: "/deadlines",
  tools: "/tools",
  advisors: "/smb-advisor",
  jobs: "/jobs",
  postjob: "/jobs/post",
  myjobs: "/jobs/mine",
  events: "/events",
  helpEvents: "/help/events",
  helpSafe: "/help/how-we-keep-you-safe",
  contact: "/contact",
  people: "/members",
  plans: "/membership-plans",
  feed: "/feed",
};

/** The "I don't know" answer: never guess. */
export function mapleUnknown(q: string): MapleAnswer {
  return {
    t: ["I don’t have a solid answer for that yet, and I’d rather not guess. Two good next steps:"],
    acts: [["Ask the community", "ask", q], ["Find an SME Advisor", "nav", MAPLE_HREF.advisors]],
  };
}

/** Out of questions for now (the monthly allowance or the daily cap). */
export function mapleLimit(q: string, limit: number | null, daily: boolean): MapleAnswer {
  return daily || limit === null
    ? { t: ["You’ve reached today’s limit of questions to Maple. You can ask again tomorrow.", "You can still ask the community any time."], acts: [["Ask the community", "ask", q]] }
    : { t: [`You’ve used all ${limit} questions for this month. They reset on the 1st.`, "Plus members get 100 questions a month. You can still ask the community any time."], limit: true, acts: [["Ask the community", "ask", q]] };
}

/** Step 1. Null when the Hub can't answer it on its own (then the library, then the AI). */
export function mapleHubAnswer(q: string, ctx: MapleCtx, found: MapleFound): MapleAnswer | null {
  const t = q.toLowerCase();
  const city = ctx.city.split(",")[0].trim();
  if (/^(hi|hello|hey|bonjour|good (morning|afternoon|evening))\b/.test(t)) {
    return { t: [`Hi ${ctx.first || "there"}! I can answer business questions, find people who can help, and point you to grants, deadlines, events and jobs. What are you working on?`], chips: MAPLE_SUGGEST };
  }
  if (/scam|phish|fraud|fake (invoice|email|account)|suspicious/.test(t)) {
    return {
      t: ["If something looks off, don’t click links or send money. SME Hub staff will never ask for your password, a sign-in code or your card number.", "Use **Report** on the message or post, or block the person. Then tell the Canadian Anti-Fraud Centre if you lost money or shared details."],
      src: [MAPLE_SRC.scam],
      acts: [["How we keep SME Hub safe", "nav", MAPLE_HREF.helpSafe], ["Report a problem", "nav", MAPLE_HREF.contact]],
    };
  }
  if (/grant|fund|funding|loan|financ|subsid|bdc|tax credit|money for/.test(t)) {
    return {
      t: [
        "Canadian small businesses can get grants, loans and tax credits from the federal government, provinces and groups like BDC. What you qualify for depends on your province, industry, size and what the money is for.",
        `**Grant Finder** checks the programs against your profile${city ? ` (${city}, ${ctx.industry ? ctx.industry.toLowerCase() : "your industry"})` : ""} and shows the deadline and the official page for each one.`,
      ],
      src: [MAPLE_SRC.grants],
      acts: [["Open Grant Finder", "nav", MAPLE_HREF.grants], ["Talk to an SME Advisor", "nav", MAPLE_HREF.advisors]],
    };
  }
  if (/(gst|hst)/.test(t) && /regist|number|sign up|account|need to charge|start charging|threshold/.test(t)) {
    return {
      t: [
        "You must register for GST/HST once your taxable sales go over **$30,000** in any four quarters in a row (the small supplier limit). You can also register earlier by choice, which lets you claim back the GST/HST you pay on business costs.",
        "You register with the Canada Revenue Agency online through Business Registration Online, or by phone. Once registered, you charge GST/HST and file returns. Your filing dates then show in **My deadlines**.",
      ],
      src: [MAPLE_SRC.gst],
      acts: [["Open My deadlines", "nav", MAPLE_HREF.deadlines], ["GST/HST calculator", "nav", MAPLE_HREF.tools]],
      need: { advisors: { n: 1, kw: ["book", "account", "tax"] } },
      pro: true,
    };
  }
  if (/gst|hst|qst|cra\b|remit|payroll|tax/.test(t)) {
    const a: MapleAnswer = /deadline|due|when|file|filing|pay\b|payment/.test(t)
      ? {
          t: [
            "It depends on how often you file. Most **monthly and quarterly** filers file and pay within **one month** after each period ends. **Annual** filers usually have three months after their fiscal year ends. Sole proprietors with a December 31 year-end file by **June 15** but must pay by **April 30**.",
            "Your own dates, with reminders, are in **My deadlines**.",
          ],
          src: [MAPLE_SRC.gst],
          acts: [["Open My deadlines", "nav", MAPLE_HREF.deadlines], ["GST/HST calculator", "nav", MAPLE_HREF.tools]],
        }
      : {
          t: ["That’s a tax question, and the right answer depends on your business. Here is the general picture from the Canada Revenue Agency. For your own situation, an accountant or bookkeeper is the safest next step."],
          src: [MAPLE_SRC.gst],
          acts: [["Open My deadlines", "nav", MAPLE_HREF.deadlines]],
        };
    return { ...a, pro: true, need: { advisors: { n: 2, kw: ["book", "account", "tax", "cash"] } } };
  }
  if (/lease|contract|lawyer|legal|lawsuit|\bsue\b|incorporat|trademark|liabil/.test(t)) {
    return {
      t: [
        "This depends on the details of your situation, so I won’t guess. A lawyer or an SME Advisor can look at it properly. Many SME Advisors offer a **free first consultation** you can book here.",
        "Before you talk to someone, write down the dates, the amounts and what was agreed. It makes the call much shorter.",
      ],
      pro: true,
      need: { advisors: { n: 2, kw: ["law", "legal", "lease", "contract"] } },
      acts: [["Find an SME Advisor", "nav", MAPLE_HREF.advisors], ["Ask the community", "ask", q]],
    };
  }
  if (/\bjob|hire|hiring|staff|employee|candidate|resume|work for/.test(t)) {
    if (/post|hire|hiring|staff|employee|candidate/.test(t)) {
      return {
        t: [
          "You can post a job on **SME Hub Jobs**. Free members can have 1 job open at a time; Plus members can post as many as they like, plus 1 featured job a month.",
          `Show the pay range, say what the job is in plain words, and answer applicants quickly. Good candidates go first.${ctx.ontario ? " In Ontario, employers with 25 or more people must show a pay range and say if they use AI in hiring. The form checks this for you." : ""}`,
        ],
        acts: [["Post a job", "nav", MAPLE_HREF.postjob], ["My job posts", "nav", MAPLE_HREF.myjobs]],
      };
    }
    return { t: ["**SME Hub Jobs** lists jobs at Canadian small businesses, with the pay on every job. You can filter by city, type of work and remote or on-site."], acts: [["See jobs", "nav", MAPLE_HREF.jobs]] };
  }
  if (/event|webinar|workshop|meetup|summit|conference|show\b/.test(t)) {
    return {
      t: ["Here’s where to find upcoming events for small business owners, online and in person. Save one and I’ll remind you the day before and an hour before."],
      acts: [["See upcoming events", "nav", MAPLE_HREF.events], ["Hosting an event", "nav", MAPLE_HREF.helpEvents]],
    };
  }
  if (/price|pricing|margin|markup|landed cost|cash ?flow|break.?even|calculat|loan payment/.test(t)) {
    return {
      t: [
        "Start with your **full cost**: materials, your time at a fair hourly rate, and a share of overhead like rent and software. Add the margin you need, then check what similar businesses charge and where you want to sit.",
        "**Business tools** has calculators for pricing, cash flow, loans, landed cost and GST/HST.",
      ],
      acts: [["Open Business tools", "nav", MAPLE_HREF.tools]],
      need: { posts: 1, members: { n: 2, match: "pric|cost|cash|book|account" } },
    };
  }
  if (/profile|\bbio\b|introduc|headline|get found|more customers|visib/.test(t)) {
    return {
      t: [
        "Members find you by what you offer and where you are, so those two count most. Add a clear headline, your city, 3 things you can help with, and a photo.",
        "I can draft your introduction from your website or a few quick answers. You check it before anything is saved.",
      ],
      acts: [["Help me with my profile", "profile", ""], ["See my profile", "nav", "@me"]],
    };
  }
  if (/(find|need|looking for|recommend|who can|anyone know|someone to)\b/.test(t) || found.members > 0) {
    // the first paragraph depends on who the Hub finds ("people")
    return { t: [], kind: "people", need: { members: { n: 3 }, advisors: { n: 2 }, posts: 1 }, acts: [["Search all members", "nav", MAPLE_HREF.people], ["Ask the community", "ask", q]] };
  }
  if (found.posts > 0) {
    return {
      t: ["Members have talked about this. Here’s the most useful reply I found. Want more views? Ask the community and I’ll point it to people who can help."],
      kind: "posts",
      need: { posts: 2 },
      acts: [["Ask the community", "ask", q]],
    };
  }
  return null;
}

/** Splits a library or AI answer into short paragraphs, as the design does for library answers. */
export function mapleParagraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .flatMap((block) =>
      block
        .split(/(?<=\.)\s+(?=[A-ZÀ-Ý])/)
        .reduce<string[]>((a, s) => {
          if (a.length && a[a.length - 1].length < 140) a[a.length - 1] += ` ${s}`;
          else a.push(s);
          return a;
        }, []),
    )
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Buttons for a library answer, from its question (as in the design). */
export function mapleLibraryActs(question: string): MapleAct[] {
  if (/deadline|due|return/i.test(question)) return [["Open My deadlines", "nav", MAPLE_HREF.deadlines]];
  if (/GST|HST|TPS|TVH/.test(question)) return [["GST/HST calculator", "nav", MAPLE_HREF.tools]];
  return [];
}

export const mapleIsFrench = (q: string) => /\b(le|la|les|des|est|une|pour|comment|quand|entreprise|taxe)\b/i.test(q);
