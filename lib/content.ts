// Reference content for the pages behind the About and Explore menus. Every page here lives on this
// site. The organisations listed on a page are outside bodies, so their own website links leave the hub.
// Wording is our own summary of what the current smehub.ca pages cover.

export type Org = { name: string; about: string; url: string };

const BDC: Org = { name: "Business Development Bank of Canada (BDC)", about: "Loans and advice for owners who want to grow. It has backed Canadian businesses for more than 75 years.", url: "https://www.bdc.ca/en" };
const FUTURPRENEUR: Org = { name: "Futurpreneur Canada", about: "Start-up loans, a volunteer mentor and planning tools for founders aged 18 to 39.", url: "https://www.futurpreneur.ca/en/" };
const ACOA: Org = { name: "Atlantic Canada Opportunities Agency (ACOA)", about: "Federal funding and support for Atlantic businesses and communities.", url: "https://www.acoa-apeca.gc.ca/" };

/* ---------- Resources for founders ---------- */

export type ResourcePage = { slug: string; label: string; title: string; intro: string; offers: string[]; orgs: Org[] };

export const RESOURCE_PAGES: ResourcePage[] = [
  {
    slug: "indigenous-entrepreneurs",
    label: "Indigenous entrepreneurs",
    title: "Resources for Indigenous entrepreneurs",
    intro: "Funding, training and community for First Nations, Inuit and Métis business owners, gathered in one place.",
    offers: ["Start-up guides", "Funding and lenders", "Mentors and advisors", "Events", "Partner offers"],
    orgs: [
      BDC,
      FUTURPRENEUR,
      { name: "Indigenous ACE (I-ACE)", about: "Teaches people how to start and run a business, built on Indigenous values and community economic development.", url: "https://www.iamace.ca/" },
      { name: "Canadian Centre for Aboriginal Entrepreneurship (CCAE)", about: "Self-employment training with 25 years of work behind it, across Canada and the Caribbean.", url: "https://ccae.ca/" },
      { name: "Pow Wow Pitch", about: "A grassroots community of Indigenous entrepreneurs: pitch competitions, mentors and learning.", url: "https://www.powwowpitch.org/" },
      { name: "National Aboriginal Capital Corporations Association (NACCA)", about: "A network of more than 50 Indigenous Financial Institutions that lend to Indigenous businesses.", url: "https://nacca.ca/become-an-entrepreneur/" },
      { name: "Small Business BC", about: "A non-profit that helps British Columbia businesses directly or points them to the right service.", url: "https://smallbusinessbc.ca/" },
    ],
  },
  {
    slug: "women-entrepreneurs",
    label: "Women entrepreneurs",
    title: "Resources for women entrepreneurs",
    intro: "Training, funding, mentors and networks for women who own or are starting a business in Canada.",
    offers: ["Training", "Funding guidance", "Mentorship", "Networking", "Research"],
    orgs: [
      BDC,
      { name: "The Forum", about: "A charity that trains, mentors and connects women founders across the country.", url: "https://www.theforum.ca/" },
      { name: "Women Business Enterprises Canada (WBE Canada)", about: "Certifies women-owned companies and helps them win supplier contracts at home and abroad.", url: "https://wbecanada.ca/" },
      { name: "Coralus", about: "A community that tries out new ways of funding and running a business. Members choose how involved to be.", url: "https://coralus.world/" },
      { name: "Women In Leadership Foundation", about: "Mentorship programs for women professionals, running since 2001.", url: "https://www.womeninleadership.ca/mentorship" },
      { name: "Women Entrepreneurship Knowledge Hub (WEKH)", about: "Research on women's entrepreneurship, linking regional hubs and more than 250 partner organisations.", url: "https://wekh.ca/seeitbeit/" },
      { name: "Women of Influence+", about: "Tells the stories of women leaders and counts social impact as part of business success.", url: "https://www.womenofinfluence.ca/" },
      { name: "Scotiabank Women Initiative", about: "Tools and services from Scotiabank for women and non-binary clients building a business or career.", url: "https://www.scotiabank.com/women-initiative/ca/en/about-us.html" },
      { name: "WeBC", about: "Loans, training and peer networks for women business owners in British Columbia.", url: "https://we-bc.ca/about-us/" },
    ],
  },
  {
    slug: "black-entrepreneurs",
    label: "Black entrepreneurs",
    title: "Resources for Black entrepreneurs",
    intro: "Funding, mentors, training and visibility for Black-owned businesses across Canada.",
    offers: ["Education", "Funding guidance", "Mentorship", "Networking", "Visibility"],
    orgs: [
      { name: "Black Business Initiative", about: "Set up in Nova Scotia in 1996 to help Black-owned businesses grow and create jobs.", url: "https://www.bbi.ca/supporting-black-canadian-communities-sbcci/" },
      { name: "Black Opportunity Fund", about: "Directs money to the organisations and people who support Black communities across Canada.", url: "https://blackopportunityfund.ca/about/" },
      { name: "Tribe Network: Black Start-Up Project", about: "Connects Black entrepreneurs in Atlantic Canada with start-up and growth services.", url: "https://www.tribenetwork.ca/black-startup-project/" },
      { name: "Black Business Association of BC", about: "Leadership training, courses and resources for owners and managers.", url: "https://www.blackbusinessbc.ca/" },
      { name: "BKR Capital", about: "Venture funding for Black-led technology companies, and training for young Black investment managers.", url: "https://www.bkrcapital.ca/" },
      { name: "DMZ Black Innovation Programs", about: "Support for Black-owned tech start-ups, aimed at the gap in early funding and role models.", url: "https://dmz.torontomu.ca/bip/" },
      { name: "Innovate Calgary", about: "The University of Calgary's business incubator, open to all founders, with more than 30 years of work.", url: "https://innovatecalgary.com/" },
    ],
  },
  {
    slug: "immigrant-entrepreneurs",
    label: "Immigrant entrepreneurs",
    title: "Resources for immigrant entrepreneurs",
    intro: "Help for newcomers building a business in Canada: training, contacts, funding guidance and support with language and culture.",
    offers: ["Training", "Funding guidance", "Mentorship", "Networking", "Language and culture"],
    orgs: [
      { name: "TRIEC", about: "Works in the Greater Toronto Area so skilled immigrants find work that matches their qualifications.", url: "https://triec.ca/" },
      { name: "Hire Immigrants", about: "A national collection of hiring practices that help employers and newcomers work well together.", url: "https://hireimmigrants.ca/" },
      { name: "Hire Immigrants Ottawa", about: "Brings Ottawa employers and immigrant agencies together to recruit skilled newcomers. Running since 2006.", url: "https://www.hireimmigrantsottawa.ca/about-us/inititative/" },
      { name: "ACCES Employment", about: "One-to-one job search help in Toronto, with a personal plan and job matching.", url: "https://accesemployment.ca/learn-about-us/talk-to-us/toronto" },
    ],
  },
  {
    slug: "lgbtq",
    label: "Resources for LGBTQ+",
    title: "Resources for LGBTQ+ entrepreneurs",
    intro: "Chambers of commerce and founder networks that back LGBTQ+-owned businesses in Canada.",
    offers: ["Chambers of commerce", "Founder networks", "Supplier certification", "Student and career links"],
    orgs: [
      { name: "Canada's 2SLGBTQI+ Chamber of Commerce (CGLCC)", about: "The national chamber for 2SLGBTQI+-owned businesses and the companies that buy from them.", url: "https://www.cglcc.ca/" },
      { name: "Start Proud", about: "Connects 2SLGBTQA+ students with employers and recognises community leaders.", url: "https://startproud.org/" },
      { name: "Manitoba LGBT* Chamber of Commerce", about: "A network of LGBT-owned and allied businesses, professionals and business students in Manitoba.", url: "https://mb-lgbt.biz/" },
      { name: "Alberta LGBTQ+ Chamber of Commerce", about: "Supports LGBT-owned and allied businesses across Alberta.", url: "https://www.ab-lgbt.com/" },
      { name: "Chambre de commerce LGBT du Québec", about: "Speaks for LGBT business owners in Quebec to business and government.", url: "https://www.cclgbtq.org/" },
      { name: "StartOut", about: "A network for LGBTQ+ founders working toward fairer access to funding.", url: "https://startout.org/" },
    ],
  },
];

/* ---------- Business guides by province and territory ---------- */

export type Guide = { slug: string; name: string; summary: string; sectors: string[]; strengths: string[]; orgs: Org[] };

export const GUIDES: Guide[] = [
  {
    slug: "alberta", name: "Alberta",
    summary: "Energy built Alberta's economy, and farming, technology and manufacturing now sit beside it. Founders get a strong transport network and a busy scene of accelerators and incubators.",
    sectors: ["Energy", "Agriculture", "Technology", "Manufacturing", "Food processing", "Chemicals", "Wood products"],
    strengths: ["Transport links to western and US markets", "Skilled workforce", "Government incentives", "Accelerators and incubators"],
    orgs: [
      BDC, FUTURPRENEUR,
      { name: "Alberta Innovates", about: "The province's largest research and innovation agency, from first funding to commercial launch.", url: "https://albertainnovates.ca/" },
      { name: "Business Link", about: "Advisors who give one-to-one help with starting and running a business in Alberta.", url: "http://www.businesslink.ca/" },
      { name: "Alberta Women Entrepreneurs (AWE)", about: "Education and mentorship for women starting or growing a business, since 1995.", url: "https://www.awebusiness.com/" },
      { name: "Startup Edmonton", about: "Events that bring Edmonton's founders, investors and creatives together. Founded in 2009.", url: "http://edmontonunlimited.com/about-us/startup-edmonton-history" },
      { name: "Alberta Business Family Institute", about: "Research-based education for family-owned businesses, from the University of Alberta's business school.", url: "https://www.ualberta.ca/business/centres/family-business/about/index.html" },
      { name: "Alberta small business resources", about: "The provincial government's information for people starting or expanding a business.", url: "https://www.alberta.ca/small-business-resources.aspx" },
    ],
  },
  {
    slug: "british-columbia", name: "British Columbia",
    summary: "British Columbia is Canada's gateway to the Pacific. Its economy runs from technology and film to tourism, manufacturing and clean energy, with a tech sector that keeps growing.",
    sectors: ["Technology", "Film and television", "Tourism", "Manufacturing", "Sustainable energy"],
    strengths: ["Pacific trade gateway", "Transport infrastructure", "Well-educated workforce", "Government incentives"],
    orgs: [
      BDC, FUTURPRENEUR,
      { name: "Innovate BC", about: "The provincial agency building an innovation economy that reaches every region of B.C.", url: "https://www.innovatebc.ca/" },
      { name: "WeBC", about: "Loans, training and peer networks for women business owners, for about 30 years.", url: "https://we-bc.ca/about-us/" },
      { name: "Small Business BC", about: "A non-profit that helps B.C. businesses directly or points them to the right service.", url: "https://smallbusinessbc.ca/" },
    ],
  },
  {
    slug: "manitoba", name: "Manitoba",
    summary: "Manitoba sits in the middle of the country, which makes it a natural hub for rail, road and air freight. Costs for living and running a business are lower than in most provinces.",
    sectors: ["Agriculture", "Manufacturing", "Mining", "Energy", "Healthcare"],
    strengths: ["Central trade and transport hub", "Lower operating costs", "Grants and tax credits", "Incubators and accelerators"],
    orgs: [
      { name: "Women's Enterprise Centre of Manitoba", about: "One-to-one help for women across the province who are starting or growing a business.", url: "https://wecm.ca/" },
      { name: "Manitoba Marketing Network", about: "Volunteer advisors who have helped more than 5,500 small businesses since 1985.", url: "https://manitobamarketingnetwork.ca/" },
      { name: "Manitoba Chambers of Commerce", about: "The umbrella group for about 71 local chambers and close to 10,000 businesses. Founded in 1931.", url: "http://www.mbchamber.mb.ca/" },
      { name: "World Trade Centre Winnipeg", about: "Business information and trade connections for Manitoba entrepreneurs.", url: "http://www.wtcwinnipeg.com/" },
      { name: "SAFE Work Manitoba", about: "Injury-prevention training, safety programs and consulting from the Workers Compensation Board.", url: "https://www.safemanitoba.com/" },
    ],
  },
  {
    slug: "new-brunswick", name: "New Brunswick",
    summary: "New Brunswick pairs traditional industries with newer ones such as cybersecurity and digital health. A bilingual workforce and Atlantic ports open the door to English, French, European and US markets.",
    sectors: ["Agriculture", "Forestry", "Seafood", "Cybersecurity", "Digital health", "Energy technology"],
    strengths: ["Bilingual workforce", "Atlantic ports", "Provincial tax incentives and grants", "Accelerators and co-working spaces"],
    orgs: [
      ACOA, BDC, FUTURPRENEUR,
      { name: "Opportunities New Brunswick (ONB)", about: "The provincial body that helps businesses invest, expand and reach new markets.", url: "https://onbcanada.ca/" },
      { name: "Planet Hatch", about: "Programs and workspace for early-stage companies.", url: "https://www.planethatch.com/" },
      { name: "New Brunswick Business Council", about: "Business leaders working on the province's long-term growth.", url: "https://nbbc-cenb.ca/en/" },
    ],
  },
  {
    slug: "newfoundland-and-labrador", name: "Newfoundland and Labrador",
    summary: "Natural resources drive the economy here, from offshore oil and gas to mining, fishing and hydro power. A young technology sector is growing around the Genesis Centre in St. John's.",
    sectors: ["Offshore oil and gas", "Mining", "Fishing", "Forestry", "Hydroelectric energy", "Tourism"],
    strengths: ["Atlantic shipping routes to Europe", "Graduates from local universities and colleges", "Tax incentives and grants", "Growing tech sector"],
    orgs: [
      ACOA, BDC, FUTURPRENEUR,
      { name: "Genesis Centre", about: "An innovation hub and incubator that takes technology founders from first idea to scale.", url: "https://www.genesiscentre.ca/" },
      { name: "NLOWE", about: "Programs and services for women in business at every stage.", url: "https://www.nlowe.org/" },
    ],
  },
  {
    slug: "northwest-territories", name: "Northwest Territories",
    summary: "Diamonds, gold, oil and gas anchor the economy, and tourism, arts, film and technology are growing. The territory has a long tradition of self-employment and direct access to Northern and Arctic markets.",
    sectors: ["Diamonds and gold", "Oil and gas", "Tourism", "Arts and crafts", "Film", "Information technology"],
    strengths: ["Northern and Arctic markets", "Tradition of self-employment", "Tax incentives and grants", "EntrepreNorth incubator"],
    orgs: [
      BDC, FUTURPRENEUR,
      { name: "Business Development and Investment Corporation (BDIC)", about: "The territory's business development body, supporting Northern entrepreneurs since 2005.", url: "https://www.bdic.ca/" },
      { name: "CanNor", about: "The federal agency for economic development in the three territories.", url: "https://www.cannor.gc.ca/" },
    ],
  },
  {
    slug: "nova-scotia", name: "Nova Scotia",
    summary: "Nova Scotia's economy covers technology, ocean industries, farming, fisheries and tourism, and the province is a leader in sustainable energy. Living costs are affordable and universities supply a steady stream of graduates.",
    sectors: ["Technology", "Ocean industries", "Agriculture", "Fisheries", "Tourism", "Sustainable energy"],
    strengths: ["Reach into North American and European markets", "University and college graduates", "Grants and incentives", "Affordable cost of living"],
    orgs: [
      ACOA, BDC, FUTURPRENEUR,
      { name: "Invest Nova Scotia", about: "Start-up funding, incubation, export help and investment attraction from the province.", url: "https://www.investnovascotia.ca/" },
      { name: "CEED", about: "The Centre for Entrepreneurship Education and Development: programs that build business skills in people and communities.", url: "https://www.ceed.ca/" },
    ],
  },
  {
    slug: "nunavut", name: "Nunavut",
    summary: "Nunavut offers openings in mining, fisheries, tourism and the arts, with a young and growing population keen to start ventures of their own. Territorial grants and funding are there to help new businesses get going.",
    sectors: ["Mining and exploration", "Fisheries", "Tourism", "Hunting and trapping", "Arts and crafts"],
    strengths: ["Young, growing population", "Territorial grants and funding", "Tourism and cultural potential"],
    orgs: [
      BDC, FUTURPRENEUR,
      { name: "Kitikmeot Community Futures (KCFI)", about: "Loans and advice for small businesses in the Kitikmeot region.", url: "https://kcfi.ca/" },
      { name: "Baffin Business Development Corporation", about: "Funding and advice for small businesses in the Qikiqtaaluk region.", url: "https://www.baffinbdc.ca/" },
      { name: "Nunavut Economic Developers Association", about: "Training and networking for the economic development officers in each community.", url: "https://nunavuteda.com/" },
      { name: "CanNor", about: "The federal agency for economic development in the three territories.", url: "https://www.cannor.gc.ca/" },
    ],
  },
  {
    slug: "ontario", name: "Ontario",
    summary: "Ontario is Canada's largest market, with a deep pool of skilled workers and quick access to buyers in Canada and the United States. Innovation hubs such as MaRS and Communitech support technology founders.",
    sectors: ["Technology", "Financial services", "Manufacturing", "Life sciences", "Retail and services"],
    strengths: ["Largest provincial market", "Highly skilled workforce", "Tax incentives, grants and funding programs", "Simple online business registration", "Innovation hubs: MaRS and Communitech"],
    orgs: [
      BDC, FUTURPRENEUR,
      { name: "Digital Main Street", about: "Helps main-street businesses move online and use digital tools.", url: "https://digitalmainstreet.ca/" },
      { name: "Mentor Works", about: "Finds the government grants a small business qualifies for.", url: "https://www.mentorworks.ca/" },
      { name: "Ontario Centre of Innovation", about: "Turns research from Ontario colleges, universities and hospitals into commercial products.", url: "https://www.oc-innovation.ca/" },
      { name: "Enterprise Toronto", about: "The City of Toronto's small business centre, with a step-by-step guide to starting up.", url: "https://www.toronto.ca/business-economy/new-businesses-startups/" },
      { name: "Ministry of Economic Development, Job Creation and Trade", about: "The provincial ministry behind programs that help businesses start, grow, trade and hire.", url: "https://www.ontario.ca/page/ministry-economic-development-job-creation-trade" },
      { name: "Ontario Business Central", about: "A service that registers or incorporates your business.", url: "https://www.ontariobusinesscentral.ca/" },
    ],
  },
  {
    slug: "prince-edward-island", name: "Prince Edward Island",
    summary: "The Island's economy has grown well beyond farming and tourism into aerospace, bioscience and information technology. Graduates from UPEI and Holland College feed a skilled local workforce.",
    sectors: ["Agriculture", "Tourism", "Aerospace", "Bioscience", "Information technology", "Renewable energy"],
    strengths: ["East-coast access to North American and European markets", "UPEI and Holland College graduates"],
    orgs: [
      ACOA,
      { name: "Innovation PEI", about: "The province's lead economic development agency: funding and advice for key sectors.", url: "https://innovationpei.com/" },
      { name: "Startup Zone", about: "Workspace, resources and coaching for new and growing companies.", url: "https://startupzone.ca/" },
      { name: "CBDC", about: "Community Business Development Corporations: loans and advice to start, expand or modernise a small business.", url: "https://www.cbdc.ca/en/" },
      { name: "PEI Business Women's Association", about: "A province-wide network for women entrepreneurs and professionals.", url: "https://peibwa.org/" },
      { name: "Rural Action Centres", about: "Local offices in West Prince, Kings County and the Evangeline Region with several services under one roof.", url: "https://ruralactioncentres.ca/" },
      { name: "Skills Canada PEI", about: "A charity that steers young people toward skilled trades and technology careers.", url: "http://skillscanada.pe.ca/" },
    ],
  },
  {
    slug: "quebec", name: "Quebec",
    summary: "Quebec has a broad, resilient economy with real depth in aerospace, life sciences, clean technology and multimedia. Its transport network and natural resources make it a strong base for trade across North America.",
    sectors: ["Information technology", "Aerospace", "Life sciences", "Clean technology", "Multimedia"],
    strengths: ["Major transport network", "Natural resource base", "Diverse, resilient economy"],
    orgs: [
      BDC, FUTURPRENEUR,
      { name: "Investissement Québec", about: "The province's financing partner for Quebec and foreign businesses.", url: "https://www.investquebec.com/quebec/fr" },
      { name: "Entrepreneuriat Québec", about: "Shares teaching methods and resources for entrepreneurship education. Started in 1994.", url: "https://www.entrepreneuriat-quebec.com/en/" },
    ],
  },
  {
    slug: "saskatchewan", name: "Saskatchewan",
    summary: "Agriculture and mining lead Saskatchewan's economy, with oil and gas, technology and manufacturing alongside. Good transport links carry its exports to markets across Canada and around the world.",
    sectors: ["Agriculture", "Mining", "Oil and gas", "Technology", "Manufacturing"],
    strengths: ["Export-ready transport links", "Government funding and subsidies", "Skilled workforce", "High quality of life"],
    orgs: [
      BDC, FUTURPRENEUR,
      { name: "Square One", about: "Saskatchewan's business resource centre: advice for owners at any stage.", url: "http://www.squareonesask.ca/" },
      { name: "Saskatchewan Trade and Export Partnership (STEP)", about: "Helps Saskatchewan exporters find international sales.", url: "https://www.sasktrade.com/" },
      { name: "Saskatchewan Economic Development Association", about: "Helps communities build their local and regional economies.", url: "https://seda.ca/" },
    ],
  },
  {
    slug: "yukon", name: "Yukon",
    summary: "Yukon's economy is diversifying beyond mining into tourism and cultural crafts. About three-quarters of residents live in Whitehorse, and Alaska and the Pacific Northwest are close neighbours.",
    sectors: ["Mining", "Tourism", "Cultural crafts"],
    strengths: ["Close to Alaska and the Pacific Northwest", "Government grants and funding programs", "Capable local workforce"],
    orgs: [
      { name: "CanNor", about: "The federal agency for economic development in the three territories.", url: "https://www.cannor.gc.ca/" },
      { name: "Däna Näye Ventures", about: "A First Nation-controlled lender offering business development and financial services across Yukon and northern B.C.", url: "https://dananaye.com/" },
      BDC, FUTURPRENEUR,
    ],
  },
];

/* ---------- Policies ---------- */

export type Policy = { slug: string; label: string; title: string; intro: string; sections: { heading: string; text?: string; points?: string[] }[] };

export const POLICIES: Policy[] = [
  {
    slug: "community-guidelines",
    label: "Community guidelines",
    title: "Community guidelines",
    intro: "SMB Hub works when members treat each other with respect and share what they know. These guidelines apply to posts, comments, groups, messages and business listings.",
    sections: [
      { heading: "What we value", points: [
        "Respect. Disagree with ideas, never attack people.",
        "Collaboration. Share knowledge and contacts generously.",
        "Professionalism. Keep it relevant and free of offensive language.",
        "Integrity. Be honest about who you are and what your business does.",
        "Growth. Stay open to feedback and help others improve.",
      ] },
      { heading: "Please do", points: [
        "Welcome newcomers, including people with less experience or funding than you.",
        "Post with a purpose: to inform, to ask or to share a lesson.",
        "Write clearly. Tone is hard to read online.",
        "Give feedback that helps the other person improve.",
        "Celebrate other members' wins and support them when times are hard.",
        "Review the advisors, events and resources you have used.",
      ] },
      { heading: "Please don't", points: [
        "Spam, including the same comment pasted across groups or unsolicited sales messages.",
        "Harass, bully, intimidate or stalk anyone.",
        "Post hate speech about race, religion, gender, sexual orientation, disability or any similar trait.",
        "Pretend to be someone else or misstate who you work for.",
        "Share another person's personal or confidential information without consent.",
        "Post personal email addresses or phone numbers. Use messaging instead.",
        "Share copyrighted material you have no right to share.",
        "Post external crowdfunding links. They will be removed.",
        "Promote illegal activity, violence or terrorism.",
        "Try to break the site: no hacking, viruses or harmful files.",
      ] },
      { heading: "How we enforce this", text: "Our team may review content. Depending on how serious the problem is, we may remove a post, send a warning, suspend an account or remove a member for good. This list is not complete, and we may act on other behaviour that harms the community." },
      { heading: "Report a problem", text: "Use Report in the menu on any post, or email support@smehub.ca with a link or screenshot. Reports are reviewed by our team." },
      { heading: "Changes", text: "We may update these guidelines. Continuing to use SMB Hub means you accept the current version." },
    ],
  },
  {
    slug: "discrimination-policy",
    label: "Discrimination policy",
    title: "Discrimination policy",
    intro: "SMB Hub is an inclusive community. Every member, staff member and volunteer is entitled to fair treatment, online and at our events and workshops.",
    sections: [
      { heading: "Our position", points: [
        "We do not allow discrimination based on any protected characteristic.",
        "Discrimination includes unfair or hostile treatment, withholding an opportunity or benefit, and creating an intimidating environment.",
        "Everyone who takes part in SMB Hub is responsible for following this policy.",
      ] },
      { heading: "Raising a concern", text: "Tell our team. Concerns are handled in confidence. Where we find the policy was broken, we may take disciplinary action, up to ending a membership." },
      { heading: "Prevention and education", text: "We share education and resources on diversity and inclusion, and encourage members, staff and volunteers to take part in training." },
      { heading: "Review", text: "We review this policy regularly and tell members promptly when it changes." },
      { heading: "Contact", text: "Questions about this policy: call 416 655 0205 or email support@smehub.ca." },
    ],
  },
  {
    slug: "terms",
    label: "Terms and conditions",
    title: "Terms and conditions",
    intro: "A plain-language summary of the terms for using SMB Hub, operated by Cmarketing Inc., Mississauga, Ontario. By using the site you accept these terms and our privacy policy.",
    sections: [
      { heading: "Using the site", points: [
        "Follow the law when you use SMB Hub and when you buy anything through it.",
        "No harassment, discrimination, spam, malware or hacking.",
        "Do not misstate who you are, and do not try to enter another member's account or a restricted area.",
        "We can end anyone's access at any time, without notice.",
      ] },
      { heading: "Your content", points: [
        "You are responsible for everything you post: text, images, audio and video.",
        "Only post what you have the right to share.",
        "Feedback you send us is voluntary, and we may use it freely.",
      ] },
      { heading: "Our content", points: [
        "The text, graphics, logos, images and software on the site belong to Cmarketing Inc. or its suppliers.",
        "You may use the site for personal, non-commercial purposes.",
        "Copying, redistributing or adapting our content needs written permission.",
      ] },
      { heading: "Information, not advice", points: [
        "Content on SMB Hub is general information and education. It is not legal, financial or tax advice.",
        "We do not guarantee accuracy. Speak to a qualified professional before making a decision.",
        "We do not control or endorse third-party websites or content that members or pages link to.",
      ] },
      { heading: "No warranty, limited liability", points: [
        "The site is provided as it is and as available. We do not promise it will be uninterrupted or free of errors.",
        "As far as the law allows, Cmarketing Inc., its staff and partners are not liable for losses from using the site, including lost profits or data.",
        "You agree to cover claims and legal costs that arise from your use of the site or a breach of these terms.",
        "We are not responsible for delays caused by events outside our control.",
      ] },
      { heading: "The legal details", points: [
        "These terms are governed by the laws of the place where Cmarketing Inc. is established, and disputes go to the courts there.",
        "If one term is found invalid, the rest still apply. Not enforcing a term once does not waive it.",
        "You cannot transfer these terms to someone else without our written consent. We can.",
        "Using the site does not make you our partner, employee or agent.",
        "You agree to receive notices from us by email or on the site.",
      ] },
      { heading: "Changes", text: "We may change these terms at any time. Continuing to use the site means you accept the current version." },
      { heading: "Contact", text: "Questions about these terms: info@canadiansme.ca or 416 655 0205." },
    ],
  },
];

/* ---------- Blog, news and podcast ---------- */

export type Story = { slug: string; title: string; image?: string };
const UP = "https://smehub.ca/wp-content/uploads";

export const BLOG: Story[] = [
  { slug: "be-seen-be-found-be-chosen-how-socialeyes-communications-is-evolving-the-digital-agency-model", title: "Be Seen. Be Found. Be Chosen: How SocialEyes Communications Is Evolving the Digital Agency Model", image: `${UP}/2026/09/Be-Seen.-Be-Found.-Be-Chosen-How-SocialEyes-Communications-Is-Evolving-the-Digital-Agency-Model.jpg.webp` },
  { slug: "what-bvx-2026-revealed-about-canadas-next-generation-of-tech", title: "What BVX 2026 Revealed About Canada's Next Generation of Tech", image: `${UP}/2026/09/5.webp` },
  { slug: "the-toronto-company-flying-drones-inside-warehouses-and-over-irish-farms", title: "The Toronto Company Flying Drones Inside Warehouses and Over Irish Farms", image: `${UP}/2026/09/The-Toronto-Company-Flying-Drones-Inside-Warehouses-and-Over-Irish-Farms.webp` },
  { slug: "the-table-that-costs-nothing", title: "The Table That Costs Nothing", image: `${UP}/2026/09/Business-Strategy.webp` },
  { slug: "teclara-brings-big-company-security-to-the-firms-that-can-least-afford-a-breach", title: "Teclara Brings Big-Company Security to the Firms That Can Least Afford a Breach", image: `${UP}/2026/09/Cybersecurity-for-Small-Businesses.webp` },
  { slug: "why-more-ontario-businesses-are-treating-compliance-as-part-of-their-security-stack-not-an-afterthought", title: "Why More Ontario Businesses Are Treating Compliance as Part of Their Security Stack, Not an Afterthought", image: `${UP}/2026/09/Cybersecurity-for-Small-Businesses-1.webp` },
  { slug: "top-5-tech-ai-tools-for-canadian-smbs", title: "Top 5 Tech AI Tools for Canadian SMBs", image: `${UP}/2025/11/OCTOBER-2025-feature-images-2.jpg` },
  { slug: "top-canadian-banks-for-small-businesses-in-2025-a-comparison-of-costs-features-tech", title: "Top Canadian Banks for Small Businesses in 2025: A Comparison of Costs, Features and Tech", image: `${UP}/2025/11/Top-Canadian-Banks-for-Small-Businesses-in-2025-A-Comparison-of-Costs-Features-Tech-1.jpg` },
  { slug: "innovation-in-cloud-services-and-seamless-integration-business-cloud", title: "Innovation in Cloud Services and Seamless Integration", image: `${UP}/2025/11/OCTOBER-2025-feature-images-3-1.jpg` },
  { slug: "championing-diversity-how-women-led-businesses-are-driving-innovation-in-canadas-economy", title: "Championing Diversity: How Women-Led Businesses Are Driving Innovation in Canada's Economy", image: `${UP}/2025/11/OCTOBER-2025-feature-images-4-1.jpg` },
  { slug: "empowering-women-entrepreneurs-top-resources-to-kickstart-your-canadian-business-journey", title: "Empowering Women Entrepreneurs: Top Resources to Kickstart Your Canadian Business Journey", image: `${UP}/2025/11/OCTOBER-2025-feature-images-5.jpg` },
  { slug: "celebrating-culture-through-play-with-joeydolls", title: "Celebrating Culture Through Play with Joeydolls", image: `${UP}/2025/11/Samantha-Ong.jpg` },
];

// Three items on the current site carry a picture that belongs to a different story; those are left without one.
export const NEWS: Story[] = [
  { slug: "asus-recognized-as-one-of-americas-best-employers-for-company-culture-in-forbes-2026-ranking", title: "ASUS Recognized as One of America's Best Employers for Company Culture in Forbes' 2026 Ranking", image: `${UP}/2026/04/ASUS-Recognized-as-one-of-Americas-Best-Employers-for-Company-Culture-in-Forbes-2026-Ranking.jpg` },
  { slug: "ai-mistakes-accountants-are-fixing-this-tax-season", title: "AI Mistakes Accountants Are Fixing This Tax Season" },
  { slug: "the-government-of-canada-is-investing-in-innovation-in-french-and-bilingual-digital-health", title: "The Government of Canada Is Investing in Innovation in French and Bilingual Digital Health", image: `${UP}/2026/04/The-Government-of-Canada-is-investing-in-innovation-in-French-and-bilingual-digital-health.jpg` },
  { slug: "project-costing-gaps-leave-it-leaders-unable-to-prove-value-or-defend-spend-finds-info-tech-research-group", title: "Project Costing Gaps Leave IT Leaders Unable to Prove Value or Defend Spend, Finds Info-Tech Research Group", image: `${UP}/2026/04/Project-Costing-Gaps-Leave-IT-Leaders-Unable-to-Prove-Value-or-Defend-Spend-Finds-Info-Tech-Research-Group.jpg` },
  { slug: "global-brand-storytelling-agency-invnt-joins-nth-degree-to-form-an-unmatched-live-events-platform", title: "Global Brand Storytelling Agency INVNT Joins Nth Degree to Form a Live Events Platform", image: `${UP}/2026/04/Global-Brand-Storytelling-Agency-INVNT®-Joins-Nth-Degree-to-Form-an-Unmatched-Live-Events-Platform.jpg` },
  { slug: "acera-insurance-and-navacord-join-vancouver-whitecaps-fc-as-official-insurance-broker-and-employee-benefits-consulting-partner", title: "Acera Insurance and Navacord Join Vancouver Whitecaps FC as Official Insurance Broker and Employee Benefits Consulting Partner", image: `${UP}/2026/04/Acera-Insurance-And-Navacord-Join-Vancouver-Whitecaps-Fc-As-Official-Insurance-Broker-And-Employee-Benefits-Consulting-Partner.jpg` },
  { slug: "hon-hai-technology-group-foxconn-names-michael-chiang-rotating-ceo-boosting-leadership-governance", title: "Hon Hai Technology Group (Foxconn) Names Michael Chiang Rotating CEO" },
  { slug: "markel-insurance-appoints-james-shankland-as-head-of-ocean-cargo-u-s", title: "Markel Insurance Appoints James Shankland as Head of Ocean Cargo, U.S.", image: `${UP}/2026/04/Markel-Insurance-appoints-James-Shankland-as-Head-of-Ocean-Cargo-US.jpg` },
  { slug: "ibm-announces-strategic-collaboration-with-arm-to-shape-the-future-of-enterprise-computing", title: "IBM Announces Strategic Collaboration with Arm to Shape the Future of Enterprise Computing" },
  { slug: "sonny-kalsi-appointed-president-and-ceo-of-slc-management", title: "Sonny Kalsi Appointed President and CEO of SLC Management", image: `${UP}/2026/04/Sonny-Kalsi-appointed-President-and-CEO-of-SLC-Management.jpg` },
  { slug: "bmo-launches-2026-bmo-celebrating-women-grant-program-to-accelerate-women-owned-businesses", title: "BMO Launches 2026 BMO Celebrating Women Grant Program to Accelerate Women-Owned Businesses", image: `${UP}/2026/04/BMO-Launches-2026-BMO-Celebrating-Women-Grant-Program-to-Accelerate-Women-Owned-Businesses.jpg` },
  { slug: "kpmg-canada-appoints-ali-jaffery-as-chief-economist", title: "KPMG Canada Appoints Ali Jaffery as Chief Economist", image: `${UP}/2026/04/KPMG-Canada-appoints-Ali-Jaffery-as-Chief-Economist-.jpg` },
];

export const PODCAST: Story[] = [
  { slug: "90-days-to-ai-roi-how-gradient-ascent-delivers-measurable-results", title: "90 Days to AI ROI: How Gradient Ascent Delivers Measurable Results", image: `${UP}/2026/02/Monish-Gandhi.jpg` },
  { slug: "sukhpal-kaur-on-building-digital-visibility-roi-for-small-businesses", title: "Sukhpal Kaur on Building Digital Visibility and ROI for Small Businesses", image: `${UP}/2026/02/Sukhpal-Kaur.jpg` },
  { slug: "workforce-planning-vs-panic-hiring-how-to-secure-your-factorys-future", title: "Workforce Planning vs. Panic Hiring: How to Secure Your Factory's Future", image: `${UP}/2026/02/Craig-Martin.jpg` },
  { slug: "zoho-canada-unveils-new-payroll-pos-and-ai-tools-to-transform-smb-operations", title: "Zoho Canada Unveils New Payroll, POS and AI Tools to Transform SMB Operations", image: `${UP}/2026/02/Chandrashekar-LSP.jpg` },
  { slug: "how-network-apis-are-turning-5g-into-a-business-asset", title: "How Network APIs Are Turning 5G into a Business Asset", image: `${UP}/2026/02/Charles-Nagy.jpg` },
  { slug: "how-businesses-can-prepare-for-ai-driven-changes-in-marketing", title: "How Businesses Can Prepare for AI-Driven Changes in Marketing", image: `${UP}/2026/02/Warren-Thompson.jpg` },
  { slug: "death-of-the-waiting-room-is-ai-finally-killing-the-lineup", title: "Death of the Waiting Room: Is AI Finally Killing the Lineup?", image: `${UP}/2026/02/Shannon-Vander-Meulen.jpg` },
  { slug: "jordan-mair-on-branding-creativity-ai-in-modern-marketing", title: "Jordan Mair on Branding, Creativity and AI in Modern Marketing", image: `${UP}/2025/12/Jordan-Mair.jpg` },
  { slug: "chris-mclellan-on-human-ai-collaboration-smarter-marketing-for-smes", title: "Chris McLellan on Human-AI Collaboration and Smarter Marketing for SMEs", image: `${UP}/2025/12/Chris-McLellan.jpg` },
  { slug: "edward-johnson-on-making-ai-practical-for-canadian-businesses", title: "Edward Johnson on Making AI Practical for Canadian Businesses", image: `${UP}/2025/12/Edward-Johnson.jpg` },
  { slug: "speed-cost-and-excuse-why-ai", title: "Speed, Cost and Excuse: Why AI?", image: `${UP}/2025/12/Latif-Rahimi-3-1.jpg` },
  { slug: "from-ad-spend-to-profit-performance-marketing-for-smes", title: "From Ad Spend to Profit: Performance Marketing for SMEs", image: `${UP}/2025/11/Sanjay-Mayar.jpg` },
];

export const SECTIONS = {
  blog: { path: "/blog", name: "Blog", one: "Article", intro: "Stories, guides and profiles for Canadian small business owners.", items: BLOG },
  news: { path: "/news", name: "News", one: "News", intro: "Business announcements and appointments from across Canada.", items: NEWS },
  podcast: { path: "/podcast", name: "Small Business Podcast", one: "Episode", intro: "Conversations with founders and experts on AI, marketing, hiring and growth.", items: PODCAST },
} as const;
export type SectionKey = keyof typeof SECTIONS;

export const COURSES = [
  { title: "Cyber Threat Awareness: From Online Risks to Personal Protection", instructor: "Terry Cutler", price: "Free", lessons: 3, category: "Cybercrime", about: "Learn to recognise the online threats aimed at you and your business, and how to protect yourself." },
];

export const MAGAZINE = {
  issue: "July 2026",
  cover: `${UP}/2026/07/CanadianSME-Small-Business-Magazine-July-2026.jpeg`,
  reader: "https://e.issuu.com/embed.html?d=canadiansme_small_business_magazine_july_2026&u=canadiansme",
};
