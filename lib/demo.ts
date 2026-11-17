// PLACEHOLDER IMAGES. Members without a photo get a stock portrait and a stock cover so the
// hub can be judged with real-looking content. Set DEMO_IMAGES to false before launch:
// avatars fall back to initials and covers to the plain blue gradient.
export const DEMO_IMAGES = true;

export const demoAvatar = (id: string) => `https://i.pravatar.cc/200?u=${encodeURIComponent(id)}`;
export const demoCover = (id: string) => `https://picsum.photos/seed/${encodeURIComponent(id)}/900/300`;

export const KINDS = {
  update: { label: "Update", prompt: "Share an update with other owners", chip: "bg-slate-100 text-slate-700" },
  question: { label: "Question", prompt: "What do you need help with?", chip: "bg-blue-50 text-blue-700" },
  win: { label: "Win", prompt: "What went well? Others can learn from it", chip: "bg-amber-50 text-amber-800" },
  offer: { label: "Offer", prompt: "What can you offer other members?", chip: "bg-emerald-50 text-emerald-700" },
  hiring: { label: "Hiring", prompt: "Who are you looking for?", chip: "bg-violet-50 text-violet-700" },
} as const;
export type Kind = keyof typeof KINDS;
