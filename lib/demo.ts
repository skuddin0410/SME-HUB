// PLACEHOLDER IMAGES. Members without a photo get a stock portrait and a stock cover so the
// hub can be judged with real-looking content. Set DEMO_IMAGES to false before launch:
// avatars fall back to initials and covers to the plain blue gradient.
export const DEMO_IMAGES = true;

/**
 * Fixed portraits for the sample members only (accounts on demo.invalid). Real members without a
 * photo get their initials: a random stranger's face in someone's own header looks like their photo
 * was replaced, and pravatar's ?u= lookup could change the face over time. ?img=N is a fixed picture.
 */
const SAMPLE_PORTRAITS: Record<string, number> = {
  "93978524-f266-41e8-8ecf-c27e48e29664": 12, // Kwame Asante
  "ce12503e-8ae8-4979-ba84-3695bcd441ca": 47, // Chloe Tremblay
  "34e49c44-262a-4fe8-a5e2-fb1167615f2f": 15, // Arjun Mehta
  "c692d5c9-b93b-4140-a608-cfc035330f9d": 45, // Sara Haddad
  "7084150a-347b-4f9b-907d-fadca083632a": 59, // Luc Bouchard
  "522aa7b4-d449-4d9e-8d43-5b474e1d61a8": 49, // Mei Tanaka
  "5f370475-d294-4826-9833-a16e51f31ddf": 68, // Daniel Okafor
  "eb9c78f6-7d0d-4426-b281-19148ff08f59": 44, // Priya Raman
};
export const demoAvatar = (id: string): string | null =>
  SAMPLE_PORTRAITS[id] ? `https://i.pravatar.cc/300?img=${SAMPLE_PORTRAITS[id]}` : null;
export const demoCover = (id: string) => `https://picsum.photos/seed/${encodeURIComponent(id)}/900/300`;

export const KINDS = {
  update: { label: "Update", prompt: "Share an update with other owners", chip: "bg-slate-100 text-slate-700" },
  question: { label: "Question", prompt: "What do you need help with?", chip: "bg-blue-50 text-blue-700" },
  win: { label: "Win", prompt: "What went well? Others can learn from it", chip: "bg-amber-50 text-amber-800" },
  offer: { label: "Offer", prompt: "What can you offer other members?", chip: "bg-emerald-50 text-emerald-700" },
  hiring: { label: "Hiring", prompt: "Who are you looking for?", chip: "bg-violet-50 text-violet-700" },
  intro: { label: "Intro", prompt: "Introduce yourself and what you can help with", chip: "bg-sky-50 text-sky-700" },
} as const;
export type Kind = keyof typeof KINDS;

export const MEMBER_LABEL = { owner: "Business Owner", plus: "SMB Plus", elite: "SMB Elite", advisor: "SME Advisor" } as const;
