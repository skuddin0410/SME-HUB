/**
 * Update 45: the 10 SME Hub policies, word for word as SK supplied them (only the "…continued" page-break lines removed).
 * Blocks: ["h", heading], ["p", text], ["pl", label, text], ["tbc", note]. Text in [ ] (20+ characters) is a detail still to fill in.
 * Generated from the design's pol.js; edit the wording here.
 */
export type PolBlock = ["h", string] | ["p", string] | ["pl", string, string] | ["tbc", string];
export type Policy = { id: string; slug: string; n: number; title: string; short: string; grp: "everyone" | "paying" | "selling" | "problem"; b: PolBlock[] };

export const POL_UPDATED = "27 November 2026";
export const POL_GROUPS: [Policy["grp"], string][] = [["everyone", "For every member"], ["paying", "When you pay for a plan"], ["selling", "When you sell, teach, host or advertise"], ["problem", "When something goes wrong"]];
export const POL_ICON: Record<string, string> = { terms: "doc", privacy: "lock", cookies: "doc" /* the zip has no eye icon, so it shows the page icon */, guidelines: "users", "membership-terms": "crown", "provider-terms": "brief", "advertising-policy": "tag", accessibility: "hand", "content-complaints": "flag", "email-preferences": "mail" };
/** Names inside the text that link to another policy (first mention only) */
export const POL_LINKS: [string, string][] = [["Community Guidelines", "guidelines"], ["Privacy Policy", "privacy"], ["Cookies and Tracking Notice", "cookies"], ["Membership Terms", "membership-terms"], ["General Terms & Conditions", "terms"], ["SMB Hub Discrimination Policy", "accessibility"]];
/** Old addresses that now show a new policy */
export const POL_OLD: Record<string, string> = { "discrimination-policy": "accessibility" };

export const POLICIES_V2: Policy[] = [
 {
  "id": "terms",
  "n": 1,
  "title": "Terms and conditions",
  "short": "The rules for using SME Hub: your account, your content, purchases and how disputes are handled.",
  "grp": "everyone",
  "b": [
   [
    "p",
    "Cmarketing Inc. operates the CanadianSME Small Business Hub (\"Hub\", \"we\", \"us\"). These terms apply to smehub.ca and to the community services we provide there. When you create an account, we ask you to agree to these terms and the Community Guidelines. Additional terms shown when you purchase, teach or host apply to that activity. The Privacy Policy explains our information practices and the choices available to you."
   ],
   [
    "h",
    "Accounts and business authority"
   ],
   [
    "p",
    "Create an account with accurate information and an email address you control. You must have reached the age of majority where you live to open a new account under these terms. If you manage a company page, buy a plan or make an offer on behalf of an organization, you confirm you have authority to do so. Keep your credentials private and tell support@smehub.ca promptly if someone gains access. Tell us if authority over a company page changes. We may verify a change with an authorized representative before transferring control."
   ],
   [
    "h",
    "What members may do"
   ],
   [
    "p",
    "You may participate in groups, look for business contacts, take courses and use resources for your own business. You may showcase your services through the features and placements available to your plan. Follow posted group rules. Do not copy the directory into a sales list, resell course materials, impersonate a member, bypass access controls or use another account to evade a restriction."
   ],
   [
    "h",
    "Your work and our permission to display it"
   ],
   [
    "p",
    "You retain your rights in material you submit. You give the Hub a non-exclusive, royalty-free licence to store, format, reproduce and display that material to the audience you select or the service identifies. We may allow providers performing those functions for us to do the same. Obtain permission for other people's work, images, logos and confidential information before posting. Use of your name, photo or post in a separate advertising campaign requires separate permission."
   ],
   [
    "p",
    "Removing a post ends future display by the Hub, subject to time needed for removal, restricted backup copies, legal preservation and material others have lawfully retained. A separate publication or recording agreement may apply to an interview or magazine feature. Hub branding, software and editorial materials belong to their respective owners. Ask permission before using a Hub logo to promote an offer."
   ],
   [
    "h",
    "Purchases and member transactions"
   ],
   [
    "p",
    "Review the seller, price, deliverables and cancellation terms before ordering. The Hub is responsible for services it sells. If an independent adviser or organizer is the seller, that seller is responsible for delivering the described service. A directory entry, sponsor label or Advisor badge identifies a relationship with the Hub. It does not certify professional credentials or guarantee a result."
   ],
   [
    "h",
    "Advice and availability"
   ],
   [
    "p",
    "Articles, discussions and educational sessions provide general information. Check dates, jurisdictions and original sources. Seek advice from a qualified professional familiar with your circumstances before relying on legal, financial or tax information. We do not promise that participation will generate leads, sales, funding or media coverage beyond the deliverables expressly included in your order."
   ],
   [
    "p",
    "We may interrupt a feature for maintenance, security or repairs. If a change materially reduces a paid service during the period you purchased, contact us to arrange delivery of the agreed benefit, an alternative you accept, or a refund for the undelivered portion."
   ],
   [
    "h",
    "Moderation and ending an account"
   ],
   [
    "p",
    "We may restrict content or an account to address abuse, fraud, risks to members or repeated breaches. The Community Guidelines explain how we assess reports and how to appeal by email. You may request account closure at support@smehub.ca. If a paid plan is active, we will stop future renewals when we process closure and confirm the effective date. You can also cancel the plan directly under the Membership Terms. The Privacy Policy explains what information may remain."
   ],
   [
    "h",
    "Responsibility and disputes"
   ],
   [
    "p",
    "Each party remains responsible for its own conduct. To the extent permitted by law, neither party is liable to the other for indirect business losses arising from ordinary use of the Hub. This limitation does not apply to fraud, deliberate misconduct or a liability the law does not allow the parties to exclude. These terms preserve applicable statutory rights and remedies."
   ],
   [
    "p",
    "Ontario law and applicable federal Canadian law govern these terms, subject to mandatory protections where you live. You may raise a dispute at support@smehub.ca or use a court or complaint process available to you by law. If a court finds one provision unenforceable, the remaining provisions continue where they can operate independently."
   ],
   [
    "h",
    "Changes and contact"
   ],
   [
    "p",
    "We will date revised terms, give reasonable advance notice of material changes where practicable, and obtain fresh agreement where required. A later version does not remove an entitlement already purchased. Contact Cmarketing Inc., 6345 Dixie Road, Unit 202, Mississauga, Ontario L5T 2E6, Canada, or support@smehub.ca."
   ]
  ],
  "slug": "terms"
 },
 {
  "id": "privacy",
  "n": 2,
  "title": "Privacy policy",
  "short": "What information we use, why, who can see it, and how to see, fix or delete it.",
  "grp": "everyone",
  "b": [
   [
    "p",
    "Cmarketing Inc. is responsible for personal information it handles through the Small Business Hub. Direct privacy questions to [confirmed privacy officer title and monitored email], or write to the Privacy Officer at 6345 Dixie Road, Unit 202, Mississauga, Ontario L5T 2E6, Canada. This policy covers visitors, members, applicants, buyers and people who contact us about content or an event."
   ],
   [
    "h",
    "Information we use and why"
   ],
   [
    "pl",
    "Account and profile",
    "We use your name, email, sign-in information and account status to register you, authenticate access and communicate about your account. You may add business details, location, a photo, interests, links and professional credentials. We use the fields you submit to display the profile or listing and help people find relevant businesses. Optional fields can be left blank."
   ],
   [
    "pl",
    "Community activity",
    "We process posts, story uploads, comments, group memberships, connections and messages to deliver them to the intended audience. A report may contain an excerpt of a conversation, a screenshot or information about someone who has no account. We use it to assess the concern, respond and keep a record of the decision."
   ],
   [
    "pl",
    "Purchases and learning",
    "We use order details, billing information, payment status, registrations and course activity to issue receipts, provide access, track progress where offered and resolve billing questions. Payment information is handled by [payment provider and description of which payment details the Hub receives or stores]."
   ],
   [
    "pl",
    "Events, support and preferences",
    "We use registration details to administer attendance and share necessary information with the identified host. We use accessibility requests to arrange support. Please tell us the adjustment you need and avoid including medical records. We use your support correspondence, privacy choices and marketing preferences to act on your requests."
   ],
   [
    "pl",
    "Technical and usage data",
    "Servers may record IP addresses, browser details, timestamps and error information to deliver pages, troubleshoot and detect abuse. Optional analytics and external media are described in our Cookies and Tracking Notice. Where features use personal information for a new purpose, we explain it and seek consent when required."
   ],
   [
    "h",
    "Who can see your information"
   ],
   [
    "p",
    "[Insert verified visibility defaults for personal profiles, company pages, posts, stories and group membership, including logged-out and search-engine visibility.] A public listing can be copied, indexed or shared. Review the audience before posting. A recipient can save a message or screenshot a story even after the original disappears. A private group limits the audience but cannot prevent a participant from making a copy."
   ],
   [
    "p",
    "We use private messages to deliver conversations. Authorized personnel may review relevant material to investigate a report, resolve a technical issue or meet a legal obligation. For a complaint, we share what is reasonably needed to consider it fairly and protect those involved. A course instructor or event organizer receives the details identified at registration for delivery of that activity."
   ],
   [
    "h",
    "Providers, partners and transfers"
   ],
   [
    "p",
    "Providers we engage for hosting, delivery of email, payments, support or other essential functions may process information on our behalf. We remain accountable for information in our control and require appropriate protections. [Identify material providers, processing countries and the contact for questions about foreign processing.] Information processed abroad may be accessible to authorities under local law."
   ],
   [
    "p",
    "A sponsor may receive attendance totals or other aggregated results. Sharing identifiable leads for a sponsor's own marketing requires a separately presented choice identifying that sponsor, the fields shared and the purpose. A promotional opt-in for one CanadianSME publication does not enrol you in every related brand. We may disclose information where the law permits or requires it, including in a qualifying business transfer subject to appropriate safeguards."
   ],
   [
    "h",
    "Choices and consequences"
   ],
   [
    "p",
    "You may decline optional marketing, profile enrichment or partner sharing. Some information is necessary to provide a service. For example, we need a working email to manage an account and the information needed to process a paid order. We explain material risks and choices at the point of collection. You can request withdrawal of consent, subject to legal or contractual restrictions and reasonable notice. We will explain the effect on the service involved."
   ],
   [
    "h",
    "Retention and safeguards"
   ],
   [
    "p",
    "We keep information for the purpose described and for applicable accounting, dispute-resolution and legal requirements. [Insert approved periods or precise criteria for closed accounts, messages and stories, course and transaction records, moderation evidence, security logs and backups.] When those purposes end, we delete or de-identify the information. We may retain a limited suppression record so we continue to respect an unsubscribe request."
   ],
   [
    "p",
    "We use administrative, physical and technical safeguards appropriate to the sensitivity of the information. Access is limited to people who need it for their work. If personal information is compromised, we assess the risk, take steps to contain it, keep required records and notify affected people and regulators when required. Report a suspected privacy incident privately to the privacy contact above."
   ],
   [
    "h",
    "Access, correction, deletion and complaints"
   ],
   [
    "p",
    "Write to the privacy contact with the email associated with your account, the information or decision involved and the action you want. You can ask what information we hold, how it was used, to whom it was disclosed, or for access, correction or deletion. You may also ask about a portable copy or removal from search results where the applicable law provides those rights. You can contact us after closing an account. Please do not send identity documents unless we arrange a suitable verification method."
   ],
   [
    "p",
    "We may verify identity using information proportionate to the request. We respond within the applicable legal deadline. For an access request governed by PIPEDA, the normal period is 30 calendar days. If a lawful extension or exception applies, we explain it as required. If you disagree with our response, ask the privacy officer to reconsider. You may also contact the Office of the Privacy Commissioner of Canada at priv.gc.ca or the privacy regulator in your province."
   ],
   [
    "h",
    "Age, external services and policy updates"
   ],
   [
    "p",
    "New member accounts are intended for adults who have reached the age of majority where they live. If you believe a child's personal information has been submitted, contact us so we can investigate. External sites and independent sellers explain their own data practices. We date this policy and highlight material changes. We seek a new choice where a change requires fresh consent."
   ]
  ],
  "slug": "privacy-policy"
 },
 {
  "id": "cookies",
  "n": 3,
  "title": "Cookies and tracking notice",
  "short": "The cookies and similar tools on SME Hub, and how to change your choices.",
  "grp": "everyone",
  "b": [
   [
    "p",
    "Cookies store small pieces of information in your browser. Similar tools include local storage, pixels and identifiers sent when an external video or other embedded content loads. The following categories explain the choices you may encounter on the Hub."
   ],
   [
    "h",
    "Necessary functions"
   ],
   [
    "p",
    "Sign-in sessions, security controls and a record of privacy preferences help the website work. Blocking them in your browser can prevent sign-in, checkout or saving a choice. Session information should never be shared in a public support post."
   ],
   [
    "h",
    "Optional tools"
   ],
   [
    "p",
    "Analytics can help us understand how visitors reach a page and where they encounter problems. External podcast players, magazine readers and video hosts may receive device information when their content loads. If we use advertising or conversion trackers, the notice identifies their providers, purposes and choices before activation where required."
   ],
   [
    "h",
    "Technologies on this site"
   ],
   [
    "tbc",
    "Insert the verified inventory here. For each tool give its name and provider, what data it receives, purpose, duration, whether it is necessary or optional, and how to disable it. Include checkout, embedded players and any email tracking disclosed in marketing messages."
   ],
   [
    "h",
    "Change your choices"
   ],
   [
    "p",
    "Select Cookie settings at the bottom of any page to accept or decline each optional category, and come back to change it at any time. You may also remove stored data through your browser. Clearing it can reset your preferences. If an optional player is blocked, you may be able to open the content directly at the provider. Questions about tracking can be sent to the privacy contact in our Privacy Policy."
   ]
  ],
  "slug": "cookies"
 },
 {
  "id": "membership-terms",
  "n": 4,
  "title": "Membership, cancellation and refund terms",
  "short": "How paid plans renew, how to cancel, and when you can get a refund.",
  "grp": "paying",
  "b": [
   [
    "h",
    "Before you pay"
   ],
   [
    "p",
    "The Hub offers free and paid plans. Compare the features and limits of the plan you choose. Your order summary will identify the seller, currency, price, mandatory fees, applicable tax, total, billing period, start date, renewal arrangement and how to cancel. Review the summary and correct errors before confirming. We send you a copy of the order and the terms that apply. A free membership carries no subscription charge."
   ],
   [
    "h",
    "Renewal and plan changes"
   ],
   [
    "p",
    "A plan renews only on the schedule disclosed and agreed to at checkout. A monthly subscription renews monthly and an annual subscription renews annually if automatic renewal is selected. We will communicate changes to renewal pricing before charging the new amount and send any required renewal reminders. Plan upgrades or downgrades normally take effect at the next billing cycle. We will show and ask you to approve any immediate adjustment before charging it."
   ],
   [
    "h",
    "How to cancel"
   ],
   [
    "p",
    "Cancel in your account's membership settings or email support@smehub.ca with the account email and plan name. To stop the next renewal, submit the request before the renewal date. Keep the confirmation. We will use the time we received your request if we process an emailed cancellation later. Cancellation stops future renewals. You retain paid access through the period you have paid for unless you request account closure or a restriction applies under the Community Guidelines."
   ],
   [
    "h",
    "Refunds and billing problems"
   ],
   [
    "p",
    "For a voluntary cancellation after a paid period starts, the fee for that period is ordinarily non-refundable. If we charged you twice, billed you after timely cancellation or cannot deliver a paid benefit, contact support with the receipt or order reference. We will investigate and correct an incorrect charge. For an undelivered benefit, we will offer delivery, a substitute you accept or a refund for the undelivered portion. Any cancellation or refund rights granted by applicable law take priority."
   ],
   [
    "h",
    "Courses, tickets and media benefits"
   ],
   [
    "p",
    "Before buying a course or event ticket, check the seller, access period, cancellation deadline, refund terms and any recording or rescheduling arrangements. Contact the seller listed on the receipt. Contact Hub support if you cannot reach the seller or the listing appears misleading. For benefits sold by the Hub, we remain your contact. An advertised value for an interview, booth discount or advertorial is a description of the benefit. The order must identify the actual deliverable and redemption terms."
   ]
  ],
  "slug": "membership-terms"
 },
 {
  "id": "provider-terms",
  "n": 5,
  "title": "Advisor, course and event provider terms",
  "short": "What Advisors, instructors and event hosts agree to when they list, teach or sell.",
  "grp": "selling",
  "b": [
   [
    "p",
    "These terms apply when you publish an Advisor listing, offer a course, host an event or manage a paid activity through the Hub. You must be authorized to act for the named business and provide accurate qualifications and a working contact. Keep credentials and any required licences current. A Hub badge describes your account status. Do not use it to imply government licensing, independent accreditation or endorsement."
   ],
   [
    "h",
    "Describe and deliver the offer"
   ],
   [
    "p",
    "Name the seller or organizer on every paid listing. State the subject, intended audience, instructor, dates and time zone, price and currency, required materials, accessibility arrangements, duration of access, refund terms and contact for support. Disclose any sales presentation or sponsor involvement. Correct inaccurate listings promptly and tell enrolled participants about material changes. Do not substitute a materially different product without the buyer's agreement."
   ],
   [
    "p",
    "Supply the materials, instruction or event described. Keep the permissions needed for slides, music, participant contributions, images and guest speakers. Explain whether a certificate records attendance or an assessed qualification. For regulated services, arrange any client engagement separately and clarify scope, fees and confidentiality before collecting sensitive information."
   ],
   [
    "h",
    "Taking payments and resolving problems"
   ],
   [
    "p",
    "The seller identified before purchase handles delivery, tax documentation, cancellations, refunds and buyer enquiries, subject to the Hub's own obligations. Before a provider takes payment through the Hub, the provider and Hub must agree in writing on the merchant of record, fees, payouts, taxes, chargebacks and what happens if an activity is cancelled. A membership alone does not authorize collecting funds on someone else's behalf."
   ],
   [
    "h",
    "Attendee information and recordings"
   ],
   [
    "p",
    "Use registration details only to deliver the activity and respond to related requests. Explain ahead of time whether a session will be recorded, what will be captured, who will receive it and for how long. Offer a way to participate without appearing in a promotional recording where practicable. Obtain separate permission to use a participant's identifiable image, voice, quotation or contact details for advertising. Seek accommodation details privately and share them only with people arranging the support."
   ],
   [
    "h",
    "Paid media and editorial deliverables"
   ],
   [
    "p",
    "Your written order sets the number of interviews, articles, placements or discounts, submission limits, redemption conditions and schedule. Identify paid placements clearly. The Hub may request edits for factual accuracy, rights or suitability. If it cannot deliver a purchased placement, the Membership Terms explain the available remedies."
   ]
  ],
  "slug": "provider-terms"
 },
 {
  "id": "advertising-policy",
  "n": 6,
  "title": "Advertising, sponsorship and reviews",
  "short": "How paid placements are labelled, and the rules for claims and reviews.",
  "grp": "selling",
  "b": [
   [
    "p",
    "Members should be able to tell who paid for a placement and why a recommendation appears. These rules apply to directory features, articles, newsletters, podcasts, stories, course listings, event pages and posts from staff, partners and members."
   ],
   [
    "h",
    "Label a commercial relationship"
   ],
   [
    "p",
    "Use clear wording such as \"Advertisement\", \"Sponsored by [business name]\" or \"I earn a commission if you buy through this link.\" Place the disclosure beside the headline or recommendation, before the reader acts. For a podcast, make the relationship clear in the recording and accompanying description. Label each sponsored story so someone viewing it on its own sees the disclosure."
   ],
   [
    "p",
    "Identify a material relationship, including payment, free services, gifts, referral fees, employment or a personal connection that could affect how a reader assesses the recommendation. If placement in a directory is paid, mark that placement. A sponsor may describe its product accurately and identify its role. It may not imply an independent award, guarantee or favourable review it did not receive."
   ],
   [
    "h",
    "Claims and reviews"
   ],
   [
    "p",
    "Give a factual basis for material claims about results, comparisons, savings and eligibility. Distinguish an estimate from an achieved result. Reviews should be based on genuine experience. Do not buy positive reviews, invent customers, use generated testimonials as evidence or offer a benefit conditional on a favourable rating. A business may reply to criticism and request correction of a specific factual error."
   ],
   [
    "h",
    "What to do if a disclosure is missing"
   ],
   [
    "p",
    "Send the link, placement or recording timestamp to support@smehub.ca. Identify the relationship or claim in question and include any supporting source. We may add a label, seek substantiation, correct the placement or remove it. Sponsors and advertisers are subject to the Community Guidelines, including the restrictions on unsolicited messages and harvesting member data."
   ]
  ],
  "slug": "advertising-policy"
 },
 {
  "id": "accessibility",
  "n": 7,
  "title": "Accessibility and non-discrimination",
  "short": "How to get help taking part, and how we handle unfair treatment.",
  "grp": "everyone",
  "b": [
   [
    "p",
    "You can request help signing up, navigating the directory, reading content, taking a course, attending an event or using a reporting channel. Email support@smehub.ca or call 416-655-0205. Give the page or event name, the barrier you encountered, your preferred format and how we can contact you. You may ask someone else to submit a request on your behalf."
   ],
   [
    "h",
    "Accessible participation"
   ],
   [
    "p",
    "We will discuss suitable arrangements with you. Examples include a text version of an image-only notice, help completing a form, a document in an accessible format or information about captions and access at a venue. We will explain the available options, any limitations and who will follow up. Please share only the details needed to arrange support."
   ],
   [
    "h",
    "Equal treatment and speaking up"
   ],
   [
    "p",
    "Everyone using or delivering Hub services is expected to treat people fairly. Discrimination includes excluding someone from a business opportunity or event because of a protected characteristic, as well as harassment, slurs or targeting in messages or public posts. Members can organize groups that support entrepreneurs from underrepresented communities. The Community Guidelines give more examples."
   ],
   [
    "p",
    "If a Hub representative is involved, write to info@canadiansme.ca or call 416-655-0205 and identify the conflict. You can report an issue you experienced or witnessed without confronting the person involved. We assign a reviewer outside the incident, consider what can restore access and prohibit retaliation. Ask us for an accessible format or communication support at any stage."
   ]
  ],
  "slug": "accessibility"
 },
 {
  "id": "content-complaints",
  "n": 8,
  "title": "Content complaints, copyright and corrections",
  "short": "How to report content, claim copyright, ask for a correction or appeal.",
  "grp": "problem",
  "b": [
   [
    "p",
    "Anyone may report an issue, including someone without an account. This process covers member posts, stories, group content, listings, advertisements, course materials, event recordings and the Hub's own articles."
   ],
   [
    "h",
    "What to send"
   ],
   [
    "p",
    "Email support@smehub.ca with the page link, account or event name, approximate date, and a brief explanation. Identify the exact passage, image, claim or behaviour and the action you are requesting. For a correction, include a reliable source. For a privacy concern, describe what was exposed without repeating the sensitive data. For harmful imagery, send the location only. Avoid downloading or forwarding it."
   ],
   [
    "p",
    "If you believe material infringes a copyright or trademark, identify the original work or mark, where it can be found, the disputed use and your relationship to the rights holder. Include a way to reach you, an explanation of your good-faith concern and relevant information about licences or permissions. Provide only what is needed. This is the Hub's editorial and moderation channel. Applicable statutory notice procedures remain available."
   ],
   [
    "h",
    "How we review a report"
   ],
   [
    "p",
    "We may temporarily restrict access to a credible threat, exposed personal information, apparent scam or exploitative material while we assess it. We may ask the contributor or rights holder for clarification. We consider evidence, context and applicable rights, including lawful quotation and criticism. An unpopular opinion or an honest negative experience can stay visible."
   ],
   [
    "p",
    "We may uphold the content, add a disclosure, correct an error, redact personal details, limit distribution or remove it. For a significant error in a Hub article, we identify the correction and its date where practicable. We share outcome details where appropriate and protect personal information during the review."
   ],
   [
    "h",
    "Asking for another review"
   ],
   [
    "p",
    "Email support@smehub.ca with the subject \"Community appeal\". Identify the decision and explain which evidence, permission or context we should reconsider. You may use this route after losing account access. Knowingly false reports and retaliation are prohibited. An honest report that cannot be substantiated is welcome."
   ]
  ],
  "slug": "content-complaints"
 },
 {
  "id": "email-preferences",
  "n": 9,
  "title": "Email and marketing preferences",
  "short": "Which emails we send, which are optional, and how to unsubscribe.",
  "grp": "everyone",
  "b": [
   [
    "p",
    "We use email to activate accounts, send receipts, notify buyers about purchases, deliver requested event information and respond to support requests. We also offer optional newsletters, promotions and partner communications. Each optional sign-up identifies the sender and the kind of messages you agree to receive."
   ],
   [
    "h",
    "Your choices"
   ],
   [
    "p",
    "You may join the Hub or purchase a membership without subscribing to optional promotional email. Use the unsubscribe link in a marketing email or write to support@smehub.ca. We process marketing unsubscribe requests without charge and within 10 business days. Essential messages about your account or order may continue. We do not use a receipt or security alert as a substitute for a marketing campaign."
   ],
   [
    "p",
    "Signing up for one publication does not enrol you in every CanadianSME list. When a partner wishes to contact you for its own marketing, we identify the partner and request a separate choice before transferring the agreed details. A partner that receives your consent is responsible for its own unsubscribe requests."
   ],
   [
    "h",
    "Member messages and event contacts"
   ],
   [
    "p",
    "A connection, group membership, directory entry, badge scan or event attendance does not by itself give a member permission to add someone to a mailing list. Ask before sending a private pitch. If a member invites one proposal, use that invitation for the requested proposal. Do not sell, export or scrape Hub contact lists. Report unwanted outreach to support@smehub.ca with the sender, approximate date and a short description."
   ]
  ],
  "slug": "email-preferences"
 },
 {
  "id": "guidelines",
  "n": 10,
  "title": "Community guidelines",
  "short": "How we treat each other on SME Hub, and how reports and appeals work.",
  "grp": "everyone",
  "b": [
   [
    "p",
    "Canadian entrepreneurs come to the Hub to compare experiences, ask for advice and meet people they may one day do business with. You should be able to ask your first question about pricing, describe a disappointing supplier experience or decline a sales call and still feel welcome here."
   ],
   [
    "p",
    "These guidelines apply to members, advisers, partners, sponsors, speakers, staff and moderators. They cover profiles, business listings, groups, reviews, course discussions, direct messages and Hub-hosted events, including online chats and breakout rooms. Group hosts may set additional rules that are consistent with these guidelines."
   ],
   [
    "h",
    "1. Share experience people can use"
   ],
   [
    "p",
    "Give your question a clear title and include the details that affect the answer. For example, \"How did Ontario retailers with fewer than ten employees handle their first holiday hiring season?\" gives members a useful starting point. When answering, explain what you tried, what happened and what might be different for another business."
   ],
   [
    "p",
    "Welcome basic questions. Explain unfamiliar terms and give feedback the author can act on. Keep discussions relevant to the group. When sharing a resource, explain why it helps and link to the original. If you find an error in your post, correct it where readers will see the correction."
   ],
   [
    "h",
    "2. Discrimination, harassment and equal participation"
   ],
   [
    "p",
    "Members may challenge an idea, criticize a service or discuss how a public policy affects their business. Address the specific claim or experience. Personal insults, slurs, threats, sexual harassment, stalking, repeated unwanted contact and attempts to mobilize others against a member have no place here."
   ],
   [
    "p",
    "Treat people fairly regardless of race, colour, Indigenous identity, national origin, religion, sex, age, disability, sexual orientation, gender identity or expression, or other protected characteristics. Do not exclude people from opportunities on discriminatory grounds or ridicule someone's accent, use of assistive technology or level of business experience."
   ],
   [
    "p",
    "Help others participate. Describe essential information when posting an image-only event notice. At a workshop, respect requests to use the microphone or repeat a question. Members may raise an accessibility or discrimination concern privately using the contacts below."
   ],
   [
    "p",
    "These rules apply to decisions as well as words. A host who excludes a speaker because of their disability, a listing that rejects applicants because of their religion, or a member who directs racist messages at an exhibitor may violate this policy. A group or event designed to support an underrepresented community is welcome. Members may also describe discrimination they experienced or quote the minimum needed to report it."
   ],
   [
    "p",
    "If a Hub representative is involved, you may report directly to info@canadiansme.ca and identify the conflict. You do not have to raise the issue with that person. The Hub will assign someone outside the incident to review the concern and consider steps to restore access or prevent a recurrence."
   ],
   [
    "h",
    "3. Represent yourself and your business accurately"
   ],
   [
    "p",
    "Use accurate information about your role, organization, qualifications and authority to speak for others. Keep directory listings current. Do not impersonate another member, a government representative, a funding agency or Hub staff. A member profile, paid listing or sponsorship does not give anyone permission to claim the Hub recommends their services."
   ],
   [
    "p",
    "When posting a job, opportunity or event, identify the organizer, explain what participants are being asked to do and disclose fees or material conditions. Do not advertise a sales presentation as a job interview or a paid service as a free government program."
   ],
   [
    "h",
    "4. Network with permission"
   ],
   [
    "p",
    "Introduce your business in your profile or directory listing. Share commercial announcements only in spaces or threads where the Hub or group host expressly permits them. Mention your service in response to a relevant request only when the group rules allow it. Explain your connection and answer the question in the thread."
   ],
   [
    "p",
    "For example, if a retailer asks for inventory software recommendations, you may explain which requirement your product meets and what it costs in a group that permits recommendations. Posting the same pitch in several groups, tagging unrelated members or replying only with a booking link is spam."
   ],
   [
    "p",
    "Ask before sending a private message. An invitation to send one quote covers that conversation only. Do not add the recipient to a mailing list, send repeated follow-ups after a refusal or export directory contacts into a sales database. These rules also apply to sponsors and exhibitors. External crowdfunding campaign links are prohibited. Members may still discuss financing options and lessons learned."
   ],
   [
    "h",
    "5. Keep recommendations and reviews honest"
   ],
   [
    "p",
    "Review services, events and products you have personally used. Explain what was agreed, what happened and how the business responded. A business may reply with factual corrections or offer to resolve an issue privately. Neither party may publish confidential records or encourage others to target the reviewer or business."
   ],
   [
    "p",
    "Disclose employment, ownership, gifts, referral commissions and other relationships that could influence a recommendation. Put the disclosure beside the recommendation so readers see it before acting. Do not invent testimonials, buy favourable ratings, arrange review swaps or threaten a negative review to obtain a benefit."
   ],
   [
    "h",
    "6. Protect privacy, confidential work and creative rights"
   ],
   [
    "p",
    "Keep personal phone numbers and email addresses out of public posts. Use Hub messaging for agreed follow-up. Before sharing a screenshot, remove names, account identifiers, order numbers and details that could identify a customer or employee. Never request passwords, verification codes, payment-card details or identity documents in a community discussion."
   ],
   [
    "p",
    "Get permission before forwarding a private conversation, naming a client in a case study or recording a breakout discussion. Access to a private group does not give you permission to republish its posts. Share only materials you own or have the right to distribute. Link to an author's article rather than uploading a paid copy. Obtain permission before reusing event slides, course materials, artwork or a member's logo."
   ],
   [
    "h",
    "7. Verify advice and use AI responsibly"
   ],
   [
    "p",
    "Distinguish first-hand experience from opinion. When sharing a grant, tax deadline or regulatory update, identify the jurisdiction, date and original source. Avoid promises of guaranteed approvals, returns or business results. Community discussions provide general information. Consult a qualified adviser for decisions that depend on your business's circumstances."
   ],
   [
    "p",
    "You are responsible for material you post with AI assistance. Check names, figures, quotations and links. Disclose AI use when readers could mistake generated material for a real customer, interview or firsthand result. Do not submit another member's confidential information to an AI service without permission or use automation to flood discussions with generic replies."
   ],
   [
    "h",
    "8. Keep transactions and events safe"
   ],
   [
    "p",
    "Do not distribute malicious files, create fake sign-in pages, seek unauthorized access, collect member data through scraping or use the Hub to arrange fraud, violence or illegal sales. Report suspicious links privately without reposting them. If someone claiming to represent the Hub asks you to change invoice payment details, verify the request separately through a known Hub contact."
   ],
   [
    "p",
    "At Hub events, follow host instructions, respect personal space and ask before photographing or recording an individual member. Do not share private meeting links or attendee lists without permission. If someone makes you feel unsafe at an event, you may go directly to the host or a staff member. In an immediate emergency, contact local emergency services."
   ],
   [
    "h",
    "9. Harmful, misleading or unauthorized website content"
   ],
   [
    "p",
    "These standards cover member posts, reviews, business listings, advertisements, sponsored content and material published by the Hub itself. We may remove threats, hateful or sexually exploitative material, private information shared without permission, fraudulent offers, fabricated allegations presented as fact, and material posted without the necessary rights. Examples include a fake government grant application that collects banking details and a review that publishes a customer's home address."
   ],
   [
    "p",
    "A critical review or an unpopular opinion can remain on the site. If you dispute a factual claim, identify the exact statement and explain what is inaccurate. For example, a supplier can challenge a claim about the date of delivery by providing a redacted delivery record. A negative opinion about the quality of service, on its own, is not grounds for removal."
   ],
   [
    "p",
    "To request a correction or removal, email support@smehub.ca with the page link, the passage or image at issue, the reason for your request and any supporting source. If the issue concerns ownership, identify the original work and your relationship to it. For sensitive or exploitative imagery, send the location and a brief description only. Please do not download or forward the material."
   ],
   [
    "p",
    "We may temporarily hide material that exposes someone to harm while we review it. For a disputed factual claim, we may check the source and invite a response from the author. Depending on what we find, we may leave the material in place, add context, correct it, redact identifying details or remove it. For a significant error in a Hub article, we will identify what changed and date the correction on the article where practical. The appeal process below is available if you believe we missed relevant information."
   ],
   [
    "h",
    "10. Report a concern"
   ],
   [
    "p",
    "Email support@smehub.ca with the subject \"Community concern\". You can report conduct you experienced or witnessed, including a private message, a business listing, a moderator's conduct or an incident at a Hub event. For a discrimination concern, you may also contact info@canadiansme.ca or call 416-655-0205."
   ],
   [
    "p",
    "Include the link or event name, approximate date, account involved and a short description. If you have a relevant screenshot, redact unrelated personal information. You may report without a screenshot or without first confronting the person involved. Tell us if contacting you in a particular way would create a risk."
   ],
   [
    "p",
    "We handle reports discreetly and share details only as needed to assess the concern, respond or meet applicable obligations. Do not retaliate against anyone who raises a concern or assists a review. An honest report that we cannot substantiate is welcome. Knowingly false reports or coordinated attempts to silence another member may lead to action."
   ],
   [
    "h",
    "11. How moderation and appeals work"
   ],
   [
    "p",
    "The Hub team considers the content in context, the seriousness of the conduct, harm to members and any pattern of earlier violations. We may ask for clarification, request a correction, remove a post or listing, restrict participation, remove someone from an event, or suspend or close an account. A credible threat, fraud or exposure of sensitive information may require immediate action without a warning. Do not evade a restriction through another account or by asking someone else to post for you."
   ],
   [
    "p",
    "Where practical, we explain the rule involved and what the member can do next. We may limit the details we share to protect the people involved. If you believe we made a mistake, email support@smehub.ca with the subject \"Community appeal\". Identify the decision, explain what you believe we missed and include any relevant context. You can use email even if you cannot sign in. We may uphold, change or reverse the decision after review."
   ],
   [
    "p",
    "These guidelines work alongside the Hub's General Terms & Conditions and SMB Hub Discrimination Policy. Updates will appear on this page. Questions about participating or applying these guidelines in your group are welcome at support@smehub.ca."
   ]
  ],
  "slug": "community-guidelines"
 }
];

export const polById = (id: string) => POLICIES_V2.find((p) => p.id === id) ?? null;
export const polBySlug = (slug: string) => POLICIES_V2.find((p) => p.slug === (POL_OLD[slug] ? polById(POL_OLD[slug])!.slug : slug)) ?? null;
export const polHref = (id: string) => `/policies/${polById(id)?.slug ?? id}`;
