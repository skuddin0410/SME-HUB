/** Made in Canada Pavilion: sections and the six Canadian claims, worded as in the handoff. */
export const PSEC: [string, string][] = [["all", "All exhibitors"], ["make", "Manufacturers and makers"], ["serv", "Canadian-owned services"], ["soft", "Software and AI tools"]];
export const CLAIMS: Record<string, [string, string, 0 | 1]> = {
  poc: ["Product of Canada", "At least 98% of the direct cost of making it was spent in Canada.", 0],
  mic: ["Made in Canada", "At least 51% of the direct cost was spent in Canada, and the last major production step happened here. Sellers should add a note such as “with imported parts”.", 0],
  aic: ["Assembled in Canada", "Put together in Canada, mostly from imported parts.", 0],
  own: ["Canadian-owned", "The business is majority owned by Canadians.", 0],
  bic: ["Built in Canada", "The software was designed and developed by a team in Canada.", 1],
  data: ["Data stored in Canada", "Customer data is kept on servers located in Canada.", 1],
};
export const SCENES = ["awning", "ship", "truck", "bakery", "bars", "laptop", "nodes", "solar"] as const;
export const SECTION_SCENE: Record<string, string> = { make: "awning", serv: "truck", soft: "laptop" };

export type PavListing = {
  id: string; name: string; by: string; sec: "make" | "serv" | "soft"; what: string; city: string; province: string; scene: string;
  claims: string[]; note: string; ai: boolean; featured: boolean; status: "pending" | "published" | "removed";
  owner: { id: string; name: string; avatar: string | null; role: string }; mine: boolean; reports: number;
};
