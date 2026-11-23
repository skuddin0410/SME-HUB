# SME Hub emails and sign-in pages

6 sign-in and password pages and 86 emails (updated Nov 22, 2026). Preview: “SME Hub emails and sign-in pages” artifact. Files: SMB_Hub_Emails_and_Signin_Pages.zip.

## Sign-in and password pages

|Page|What it does|Emails it triggers|
|---|---|---|
|Sign up|Join form, Google/LinkedIn, password strength, unticked newsletter consent (CASL)|Confirm your email, Welcome|
|Confirm email|6-digit code, paste support, resend after 30 s|Welcome|
|Log in|Wrong-password message, 15-minute pause after 5 tries, email code on new devices|Sign-in code, Too many sign-in attempts, New sign-in|
|Forgot password|Same message whether or not the account exists|Reset your password, Reset requested (no account)|
|Choose a new password|Rules checklist, confirm, log out other devices, expired-link state|Password changed|
|Change password (logged in)|Current password, sessions, sign-in methods|Password changed|

## Account and security

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|Welcome|Right after a new member creates their account|SME Hub &lt;hello@smehub.ca&gt;|Welcome to SME Hub, {{first_name}}|Account (always sent)|
|Confirm your email|When a member signs up or adds a new email address|SME Hub &lt;hello@smehub.ca&gt;|Confirm your email address|Account (always sent)|
|Reset your password|When a member selects “Forgot password”|SME Hub Security &lt;security@smehub.ca&gt;|Reset your SME Hub password|Security (always sent)|
|Password changed|Right after a member’s password is changed|SME Hub Security &lt;security@smehub.ca&gt;|Your SME Hub password was changed|Security (always sent)|
|New sign-in|When an account is signed in from a new device or browser|SME Hub Security &lt;security@smehub.ca&gt;|New sign-in to your SME Hub account|Security (always sent)|
|Email address changed|Sent to the old address when a member changes their email|SME Hub Security &lt;security@smehub.ca&gt;|Your SME Hub email address was changed|Security (always sent)|
|Your data is ready|When a requested data download is ready|SME Hub &lt;hello@smehub.ca&gt;|Your SME Hub data is ready to download|Account (always sent)|
|Account closed|When a member closes their account|SME Hub &lt;hello@smehub.ca&gt;|Your SME Hub account has been closed|Account (always sent)|
|Sign-in code|When a member logs in from a new device (two-step check)|SME Hub Security &lt;security@smehub.ca&gt;|Your SME Hub sign-in code: {{signin_code}}|Security (always sent)|
|Confirm new email address|Sent to the new address when a member changes their email|SME Hub Security &lt;security@smehub.ca&gt;|Confirm your new email address|Security (always sent)|
|Reset requested, no account|When someone asks to reset a password for an email that has no SME Hub account|SME Hub Security &lt;security@smehub.ca&gt;|SME Hub password reset request|Security (always sent)|
|Too many sign-in attempts|After 5 wrong passwords in a row|SME Hub Security &lt;security@smehub.ca&gt;|We paused sign-ins to your SME Hub account|Security (always sent)|
|Account permanently deleted|30 days after an account is closed, once data is erased|SME Hub &lt;hello@smehub.ca&gt;|Your SME Hub data has been deleted|Account (always sent)|

## Connections and messages

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|Connection request|When someone sends the member a connection request|SME Hub &lt;hello@smehub.ca&gt;|{{sender_name}} wants to connect with you|Notification (member can turn off)|
|Connection accepted|When someone accepts the member’s request|SME Hub &lt;hello@smehub.ca&gt;|{{accepted_name}} accepted your connection request|Notification (member can turn off)|
|New message|When a member gets a message and hasn’t read it within 15 minutes|SME Hub &lt;hello@smehub.ca&gt;|New message from {{sender_name}}|Notification (member can turn off)|
|Introduction request|When someone asks the member to introduce them to a connection|SME Hub &lt;hello@smehub.ca&gt;|{{requester_name}} asked you for an introduction to {{target_name}}|Notification (member can turn off)|
|You’ve been introduced|When a connection introduces the member to someone|SME Hub &lt;hello@smehub.ca&gt;|{{introducer_name}} introduced you to {{intro_with}}|Notification (member can turn off)|
|New recommendation|When someone writes a recommendation for the member|SME Hub &lt;hello@smehub.ca&gt;|{{rec_name}} recommended you|Notification (member can turn off)|
|Recommendation request|When someone asks the member to recommend them|SME Hub &lt;hello@smehub.ca&gt;|{{asker_name}} asked you for a recommendation|Notification (member can turn off)|
|Comment on your post|When someone comments on, replies to or mentions the member (grouped, at most once an hour)|SME Hub &lt;hello@smehub.ca&gt;|{{commenter_name}} commented on your post|Notification (member can turn off)|
|Invitation from a member|When a member invites someone who isn’t on SME Hub yet (one email only)|SME Hub &lt;hello@smehub.ca&gt;|{{inviter_name}} invited you to join SME Hub|Invitation (one-time, to non-members)|

## Activity and milestones

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|You were mentioned|When someone mentions the member in a post or comment (grouped, at most once an hour)|SME Hub &lt;hello@smehub.ca&gt;|{{mentioner_name}} mentioned you|Notification (member can turn off)|
|Reply to your comment|When someone replies to the member’s comment (grouped, at most once an hour)|SME Hub &lt;hello@smehub.ca&gt;|{{replier_name}} replied to your comment|Notification (member can turn off)|
|New follower|When someone follows the member (grouped into one email a day)|SME Hub &lt;hello@smehub.ca&gt;|{{follower_name}} is now following you|Notification (member can turn off)|
|Your post is popular|When a member’s post gets well above its usual reach (once per post)|SME Hub &lt;hello@smehub.ca&gt;|Your post is taking off|Notification (member can turn off)|
|Poll results|When a poll the member created or voted in closes|SME Hub &lt;hello@smehub.ca&gt;|Poll results: {{poll_q}}|Notification (member can turn off)|
|Badge earned|When a member earns a community badge|SME Hub &lt;hello@smehub.ca&gt;|You earned the {{badge_name}} badge|Notification (member can turn off)|
|Connection milestone|When a member reaches 10, 50, 100 or 500 connections|SME Hub &lt;hello@smehub.ca&gt;|You’ve made {{conn_count}} connections on SME Hub|Notification (member can turn off)|
|Hub anniversary|On the anniversary of the day a member joined|SME Hub &lt;hello@smehub.ca&gt;|Happy SME Hub anniversary, {{first_name}}!|Notification (member can turn off)|
|Chosen for the Member Spotlight|When the Hub team chooses a member’s Spotlight application|SME Hub &lt;hello@smehub.ca&gt;|You’re in the next CanadianSME Member Spotlight|Account (always sent)|

## Digests

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|Your week on SME Hub|Every Monday at 8 am local time (members can switch to monthly or off)|SME Hub &lt;hello@smehub.ca&gt;|Your week: {{views}} profile views and 3 people worth meeting|Digest (member can turn off)|
|People to meet today|Daily at 8 am for members who turned on daily suggestions|SME Hub &lt;hello@smehub.ca&gt;|3 people worth meeting today|Digest (member can turn off)|
|What you missed|When a member hasn’t visited for 30 days (once per 60 days at most)|SME Hub &lt;hello@smehub.ca&gt;|{{first_name}}, here’s what you missed on SME Hub|Digest (member can turn off)|
|Profile reminder: add your photo|Day 2 after joining, if the member has no profile photo (stops once the profile is ready)|SME Hub &lt;hello@smehub.ca&gt;|Add your photo, {{first_name}}. It takes 10 seconds.|Digest (member can turn off)|
|Profile reminder: add your business|Day 5 after joining, if the member has no business page (stops once the profile is ready)|SME Hub &lt;hello@smehub.ca&gt;|Your business isn’t in the Directory yet|Digest (member can turn off)|
|Profile reminder: what people saw|Day 12 after joining, if the profile is still not ready (the last profile reminder)|SME Hub &lt;hello@smehub.ca&gt;|{{viewer_count}} people viewed your profile. Here’s what they saw.|Digest (member can turn off)|
|Welcome series: day 3|3 days after joining (skipped if the member already did these steps)|SME Hub &lt;hello@smehub.ca&gt;|3 ways owners get value from SME Hub in their first week|Digest (member can turn off)|
|Welcome series: day 7|7 days after joining|SME Hub &lt;hello@smehub.ca&gt;|Your first week on SME Hub|Digest (member can turn off)|

## Groups, events and advisors

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|Group request approved|When a private group approves the member’s request to join|SME Hub &lt;hello@smehub.ca&gt;|You’re in: {{group_name}}|Notification (member can turn off)|
|Public group approved|When the Hub team approves a member’s request for a public group|SME Hub Community Team &lt;community@smehub.ca&gt;|Your group “{{req_group_name}}” is approved|Notification (member can turn off)|
|Event registration|When a member RSVPs to an event|SME Hub &lt;hello@smehub.ca&gt;|You’re registered: {{event_name}}|Notification (member can turn off)|
|Event reminder|24 hours and 1 hour before an event|SME Hub &lt;hello@smehub.ca&gt;|Tomorrow: {{event_name}}|Notification (member can turn off)|
|Advisor call booked|When a member books a free intro call with an SME Advisor (a matching version goes to the advisor)|SME Hub &lt;hello@smehub.ca&gt;|Your call with {{advisor_name}} is booked|Notification (member can turn off)|
|Group invitation|When a group member or organiser invites the member to a group|SME Hub &lt;hello@smehub.ca&gt;|{{inviter_name}} invited you to {{ginv_group}}|Notification (member can turn off)|
|Event changed|When the host changes the time, place or link of an event the member registered for|SME Hub &lt;hello@smehub.ca&gt;|Change to {{event_name}}|Notification (member can turn off)|
|New call booked (for the advisor)|When a member books a free intro call with an SME Advisor (sent to the advisor)|SME Hub &lt;hello@smehub.ca&gt;|New intro call: {{member_name}}, {{call_when}}|Notification (member can turn off)|
|Group digest|Weekly (or daily, if the member chooses) for groups the member belongs to|SME Hub &lt;hello@smehub.ca&gt;|{{gd_count}} new posts in {{gd_group}}|Digest (member can turn off)|
|Join request (for organisers)|When someone asks to join a private group the member organises|SME Hub &lt;hello@smehub.ca&gt;|{{join_req_name}} wants to join {{nm_group}}|Notification (member can turn off)|
|New members (for organisers)|Weekly summary for organisers of public groups|SME Hub &lt;hello@smehub.ca&gt;|{{nm_count}} new members joined {{nm_group}}|Notification (member can turn off)|
|Event cancelled|When the host cancels an event the member registered for|SME Hub &lt;hello@smehub.ca&gt;|Cancelled: {{event_name}}|Notification (member can turn off)|
|Event recording ready|When the recording of an event the member registered for is available|SME Hub &lt;hello@smehub.ca&gt;|Recording: {{event_name}}|Notification (member can turn off)|

## Courses

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|Course enrolment|When a member enrols in a free course or after a course purchase|SME Hub &lt;hello@smehub.ca&gt;|You’re enrolled: {{course_title}}|Notification (member can turn off)|
|New lesson open|When a lesson set to open a few days after enrolment becomes available|SME Hub &lt;hello@smehub.ca&gt;|A new lesson is open: {{drip_lesson}}|Notification (member can turn off)|
|Pick up where you left off|When an enrolled learner hasn’t opened an unfinished course for 7 days (at most twice per course)|SME Hub &lt;hello@smehub.ca&gt;|Pick up where you left off: {{course_title}}|Notification (member can turn off)|
|Assignment feedback ready|When an instructor grades a learner’s assignment|SME Hub &lt;hello@smehub.ca&gt;|Feedback on “{{asg_title}}”: {{asg_marks}}/{{asg_total}}|Notification (member can turn off)|
|Course completed|When a learner completes every lesson in a course|SME Hub &lt;hello@smehub.ca&gt;|You completed {{course_title}}|Notification (member can turn off)|
|New assignment to grade (instructors)|To a course’s instructors when a learner submits an assignment (grouped into one email a day)|SME Hub &lt;hello@smehub.ca&gt;|{{learner_name}} submitted “{{asg_title}}”|Notification (member can turn off)|
|Your course is live (instructors)|To instructors when the Hub team publishes their course|SME Hub &lt;hello@smehub.ca&gt;|Your course is live: {{pub_course}}|Notification (member can turn off)|

## Business pages

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|Business page submitted|When a member submits a new business page for review|SME Hub Business &lt;business@smehub.ca&gt;|We’re reviewing {{business_name}}|Business (owner can turn off)|
|Business page is live|When the team approves a business page|SME Hub Business &lt;business@smehub.ca&gt;|{{business_name}} is live on SME Hub|Business (owner can turn off)|
|Business page needs changes|When the team asks for changes before approving a page|SME Hub Business &lt;business@smehub.ca&gt;|{{business_name}} needs a few changes|Business (owner can turn off)|
|Business claim approved|When the team approves a member’s claim of an existing listing|SME Hub Business &lt;business@smehub.ca&gt;|Your claim for {{claim_business}} was approved|Business (owner can turn off)|
|New quote request|When a member messages a business or requests a quote (sent to the owner and Inbox roles)|SME Hub Business &lt;business@smehub.ca&gt;|New quote request for {{business_name}}|Business (owner can turn off)|
|New review|When a member reviews the business|SME Hub Business &lt;business@smehub.ca&gt;|{{business_name}} has a new {{review_stars}}-star review|Business (owner can turn off)|
|Business team invitation|When a business owner adds the member to their team|SME Hub Business &lt;business@smehub.ca&gt;|{{inviter_name}} invited you to help manage {{team_business}}|Notification (member can turn off)|
|Monthly business summary|First weekday of each month, to owners and managers|SME Hub Business &lt;business@smehub.ca&gt;|{{business_name}} in {{biz_month}}: {{biz_views}} page views|Business (owner can turn off)|
|New business follower|When someone follows the business (grouped into one email a day)|SME Hub Business &lt;business@smehub.ca&gt;|{{bfollower_name}} followed {{business_name}}|Business (owner can turn off)|
|Customer replied on a review|When a reviewer replies to the business’s response to their review|SME Hub Business &lt;business@smehub.ca&gt;|{{reviewer_name}} replied on their review of {{business_name}}|Business (owner can turn off)|

## Content and safety

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|Blog post published|When a member’s blog post is approved and published|SME Hub Community Team &lt;community@smehub.ca&gt;|Your blog post is live|Notification (member can turn off)|
|Report update|When the team finishes reviewing something the member reported|SME Hub Community Team &lt;community@smehub.ca&gt;|Update on your report|Notification (member can turn off)|
|Content removed|When the team removes a member’s content (a stronger version is used for account suspensions)|SME Hub Community Team &lt;community@smehub.ca&gt;|We removed one of your posts|Account (always sent)|
|Account suspended|When the Hub team suspends an account|SME Hub Community Team &lt;community@smehub.ca&gt;|Your SME Hub account is suspended|Account (always sent)|

## Billing

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|Plan upgraded and receipt|When a member upgrades or a yearly plan renews|SME Hub Billing &lt;billing@smehub.ca&gt;|Welcome to SME Hub {{plan_name}}: your receipt|Billing (always sent)|
|Payment failed|When a renewal payment is declined|SME Hub Billing &lt;billing@smehub.ca&gt;|Your payment didn’t go through|Billing (always sent)|
|Renewal reminder|14 days before a yearly plan renews|SME Hub Billing &lt;billing@smehub.ca&gt;|Your {{plan_name}} plan renews on {{renew_date}}|Billing (always sent)|
|Plan cancelled|When a member cancels a paid plan|SME Hub Billing &lt;billing@smehub.ca&gt;|Your {{plan_name}} plan has been cancelled|Billing (always sent)|
|Moved to Free plan|When a paid plan ends after failed payments or cancellation|SME Hub Billing &lt;billing@smehub.ca&gt;|Your account is now on the Free plan|Billing (always sent)|
|Card expiring|30 days before the card on file expires (paid plans only)|SME Hub Billing &lt;billing@smehub.ca&gt;|Your card on file expires soon|Billing (always sent)|
|Offer ending soon|2 days before a member’s Offer post expires|SME Hub &lt;hello@smehub.ca&gt;|Your offer ends on {{offer_ends}}|Notification (member can turn off)|
|Course purchase receipt|Right after a member buys a paid course|SME Hub Billing &lt;billing@smehub.ca&gt;|Your receipt: {{paid_course}}|Billing (always sent)|

## Hub team (internal)

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|Moderation queue alert|To the Hub team when 10 or more reports are waiting, or the oldest is over 24 hours|SME Hub Community Team &lt;community@smehub.ca&gt;|{{queue_count}} reports are waiting in Moderation|Hub team alert (internal)|
|Weekly community health|Every Monday at 7 am ET, to the Hub team|SME Hub Community Team &lt;community@smehub.ca&gt;|SME Hub this week: {{week_new}} new members, {{week_reply_rate}} of questions answered|Hub team alert (internal)|
|Publish request (Hub team)|When an instructor asks the Hub team to publish a course|SME Hub Community Team &lt;community@smehub.ca&gt;|{{ask_instructor}} asked to publish “{{pub_course}}”|Hub team alert (internal)|

## Legal and privacy

|Email|When it is sent|Sender|Subject|Type|
|---|---|---|---|---|
|Terms or privacy policy updated|At least 30 days before updated terms or privacy policy take effect|SME Hub &lt;hello@smehub.ca&gt;|We’re updating our Terms and Privacy Policy|Legal notice (always sent)|
|Security incident notice|Only if a breach creates a real risk of significant harm (required by PIPEDA); content is confirmed with legal counsel before sending|SME Hub Security &lt;security@smehub.ca&gt;|Important: a security incident involving your SME Hub information|Legal notice (always sent)|

