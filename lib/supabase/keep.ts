/**
 * "Keep me logged in on this device". Ticked (the default): the session cookie lasts 30 days.
 * Unticked: a browser-session cookie that goes when the browser closes. A small marker cookie
 * remembers the choice so that refreshing the session later keeps to it.
 */
export const KEEP_COOKIE = "sme_keep";
export const KEEP_SECONDS = 30 * 24 * 60 * 60;

type Opts = { maxAge?: number; expires?: Date; [k: string]: unknown };

export function withKeep(name: string, options: Opts | undefined, keep: boolean): Opts {
  const o: Opts = { ...(options ?? {}) };
  if (name === KEEP_COOKIE) return o;
  // a cookie being removed stays a removal
  if (o.maxAge === 0 || (o.expires && o.expires.getTime() <= Date.now())) return o;
  if (keep) {
    o.maxAge = KEEP_SECONDS;
    delete o.expires;
  } else {
    delete o.maxAge;
    delete o.expires;
  }
  return o;
}
