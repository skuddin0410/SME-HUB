# V2 Phase 1: new look and site frame

- **Dark mode.** Handoff tokens live in `app/globals.css` (`.dark`). Most pages use fixed light colours, so one block at the bottom of that file remaps them in dark mode; new components should use the theme tokens (`bg-card`, `text-foreground`, `border-border`). The choice is kept on the device (`lib/theme.ts`); a script in `<head>` sets it before first paint, so there is no white flash.
- **Header.** Home, Network, Business Directory in the capsule; About, Explore, Help, theme toggle, Team icon (staff only), bell, Me, Upgrade. Below 1024px the menus fold into the burger menu and search becomes an icon.
- **Columns.** Left: quick links and recent articles. Right: the profile card (not on the left, unlike LinkedIn). Visitors see the join card on the left and the Founding Member offer on the right.
- **Messaging dock** (`components/messaging-dock.tsx`): bottom-right on every page for signed-in members on desktop; hidden on /messages.
- **Your first week** (`components/first-week.tsx`): shown to members in their first 30 days. "Set up your profile" and "Connect with 3 owners" tick from real data. The other two say "Coming soon" until Phase 3 (matchmaking).
- **Browser tests** now include a signed-in member (`e2e/member.spec.ts`, using the mock in `e2e/mock-supabase.mjs`).
- **Accessibility** (`e2e/a11y.spec.ts`, `e2e/keyboard.spec.ts`): axe finds no serious or critical problems on 10 pages, light and dark, visitor and member. Pale grey text was darkened to meet 4.5:1. A "Skip to content" link is the first Tab stop; icon-only header controls have labels.
