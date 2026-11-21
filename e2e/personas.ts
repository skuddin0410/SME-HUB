// The people every check is run as (see the Test plan sheet). Signed-in personas are added as the
// phases that need them land; for now the public site is checked as a visitor.
export const SCREEN_WIDTHS = [390, 768, 1024, 1280, 1440] as const;

export const PUBLIC_PAGES = [
  "/auth/login",
  "/auth/sign-up",
  "/about",
  "/help",
  "/contact",
  "/membership-plans",
] as const;
