/** The Settings and privacy section list: [id, label, icon]. Plan and billing (Update 34) is second; Advisors also get
 *  Connected apps and Free consultations (Update 36) before My data. */
export function settingsSections(advisor: boolean): [string, string, string][] {
  const s: [string, string, string][] = [
    ["account", "Account", "user"],
    ["billing", "Plan and billing", "crown"],
    ["privacy", "Profile privacy", "eye"],
    ["contact", "Messages and connections", "msg"],
    ["notif", "Notifications", "bell"],
    ["card", "Business card", "qr"],
    ["data", "My data", "db"],
    ["close", "Close or pause", "pause"],
  ];
  if (advisor) s.splice(s.length - 2, 0, ["apps", "Connected apps", "plug"], ["consult", "Free consultations", "cal"]);
  return s;
}
