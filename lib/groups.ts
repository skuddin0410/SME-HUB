/** Shared group types and small helpers (no server code, safe in client components). */
export type GroupSettings = {
  create_private: "paid" | "all" | "off";
  create_public: "approval" | "all" | "off";
  priv_join: "request" | "invite";
  layout: "grid" | "list";
  header: "side" | "top";
  card: { cat: boolean; desc: boolean; count: boolean; act: boolean; host: boolean };
  head: { type: boolean; priv: boolean; desc: boolean; faces: boolean; act: boolean };
  def_cover: string;
  msg_all: boolean;
  archive: boolean;
  types: string[];
};

export const GROUP_COVERS = ["nodes", "bars", "awning", "laptop", "ship", "solar", "truck", "bakery"] as const;
export type GroupCoverKey = (typeof GROUP_COVERS)[number];

export const JOIN_MODES = [
  { value: "open", label: "Open: anyone can join" },
  { value: "request", label: "By request: a moderator approves" },
  { value: "invite", label: "Invitation only" },
] as const;

export const GROUP_SORTS = [
  { value: "name", label: "Name" },
  { value: "members", label: "Most members" },
  { value: "new", label: "Newest" },
] as const;

export const GROUP_FALLBACK: GroupSettings = {
  create_private: "paid",
  create_public: "approval",
  priv_join: "request",
  layout: "grid",
  header: "side",
  card: { cat: true, desc: true, count: true, act: true, host: true },
  head: { type: true, priv: true, desc: true, faces: true, act: true },
  def_cover: "nodes",
  msg_all: true,
  archive: true,
  types: ["Topic", "Industry", "Community", "City or region", "Private circle"],
};
