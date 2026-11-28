/** Update 33: the Settings and privacy quick settings. Shared by the page and the server. */
export type PresetKey = "open" | "balanced" | "private";
export const PRESETS: Record<PresetKey, Record<string, string>> = {
  open: { nick: "public", founded: "public", team: "public", email: "members", phone: "members", web: "public", social_links: "public", history: "public" },
  balanced: { nick: "members", founded: "members", team: "members", email: "conn", phone: "conn", web: "public", social_links: "public", history: "members" },
  private: { nick: "conn", founded: "conn", team: "conn", email: "only", phone: "only", web: "conn", social_links: "conn", history: "conn" },
};
export const PRESET_LABEL: Record<PresetKey, [string, string]> = {
  open: ["Open", "Most of your profile is public. Phone and email go to members only."],
  balanced: ["Balanced", "Business details are public. Phone and email go only to people you accept."],
  private: ["Private", "Only people you accept see most of your profile."],
};
export const VIS_SHORT: Record<string, string> = { public: "Public", members: "Members", conn: "Connections", only: "Only me" };
export const VIS_LONG: Record<string, string> = { public: "Public", members: "Members", conn: "My connections", only: "Only me" };

export type MemberSettings = {
  language: "en" | "fr";
  show_online: boolean;
  in_directory: boolean;
  indexable: boolean;
  allow_tags: boolean;
  who_message: "anyone" | "conn";
  who_request: "everyone" | "shared";
  digest: "daily" | "weekly" | "off";
  alert_messages: boolean;
  alert_requests: boolean;
  alert_leads: boolean;
  alert_deadlines: boolean;
  alert_news: boolean;
  alert_events: boolean;
  /** Update 45: marketing email is opt-in, and each list is separate */
  alert_mag: boolean;
  alert_partner: boolean;
  paused_at: string | null;
  close_at: string | null;
};
export const DEFAULT_SETTINGS: MemberSettings = {
  language: "en",
  show_online: true,
  in_directory: true,
  indexable: false,
  allow_tags: true,
  who_message: "anyone",
  who_request: "everyone",
  digest: "weekly",
  alert_messages: true,
  alert_requests: true,
  alert_leads: true,
  alert_deadlines: true,
  alert_news: false,
  alert_events: true,
  alert_mag: false,
  alert_partner: false,
  paused_at: null,
  close_at: null,
};
