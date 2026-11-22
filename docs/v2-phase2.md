# V2 Phase 2: profiles and network

What members get, and where it lives. All rules are in the database (`0016`, `0017`), so any future app follows them.

| Feature | Where | Notes |
|---|---|---|
| Profile fields: type, helps with, looking for, availability, social links | `/profile/edit`, shown on `/members/[id]` | Data in `profile_details`. Social links must be https. Advisor and team types are set by the team. |
| Field visibility | `/settings` (Privacy) | Public, all members, my connections, only me, per field. Enforced by `field_visible()`; hidden fields are never sent to the browser. |
| Follows | Follow button on a profile | Follower count obeys the "Follower count" visibility. |
| Connections and blocks | Existing buttons, plus `/settings` (Blocked members) | One stored row per pair. Blocking works both ways and ends the connection and follows. |
| Recommendations | Profile page | Connections only, 20 to 1,000 characters, one per pair. The author edits the words; the person recommended can only hide or show it. "Ask for a recommendation" sends a request. |
| Warm introductions | Profile page, answered on `/network` | Ask a mutual connection to introduce you. 5 a day. Accepting sends a pending connection request. |
| Who viewed my profile | `/profile/views`, link on the profile card | 30-day chart. Free plan sees 2 names, paid plans see all. Private browsing hides you and your own list. |
| Profile strength | Profile card | `lib/profile-extra.ts`, ten steps, unit tested. |
| Member directory | `/members` | `search_members()`: name, headline, city, type, province, helps with, availability. Ignores accents and case. |
| Privacy and account | `/settings` | Data download (JSON), delete account. No secret key in the website. |

## Not in this phase

- **Directory map.** Needs a maps provider. Waiting on your choice (Mapbox suggested).
- **Notification settings.** Notifications are built in Phase 8; their settings arrive with them.
- **Deleting a business owner's account.** Their listings go with them for now; the rule for shared ownership is decided in Phase 10.

## Checks

- Database: `bash supabase/tests/run.sh` (177 checks), covering visibility, blocks, one-row connections, recommendations, intros, profile views, search and deletion.
- Browser: `e2e/network.spec.ts` plus the accessibility and screen-size checks for every new page.
- Unit: `tests/unit/profile-extra.test.ts`.
