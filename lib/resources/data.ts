/** Update 15: the community resource centres (CMD in the zip), checked against official sources on 24 November 2026. */
export type Centre = { k: string; slug: string; n: string; short: string; img: string; icon: string; mag: string; sub: string;
  f: [string, string, string][]; h: string; a: [string, string][]; s: [string, string, string, string][]; w: string[];
  g: [string, [string, string, string][]][]; src: string[] };
export const CMREV = "Reviewed November 2026";
/** "What to watch" items every centre shares. */
export const CMW: string[] = [
 "BDC and EDC may merge. The federal government has announced it intends to merge the two. BDC says nothing changes for clients today, but watch for new names and programs.",
 "Use the free Government of Canada Business Benefits Finder and the SME Hub Grant Finder together: one covers government programs, the other adds what our team has checked."
];
export const CMD: Centre[] = [
 {
  "k": "women",
  "n": "Women entrepreneurs",
  "short": "Women",
  "img": "women",
  "icon": "users",
  "mag": "She & Success",
  "sub": "Funding, networks and advice for the women who own and lead Canadian businesses.",
  "f": [
   [
    "Women-owned SMEs",
    "17.8%",
    "of Canadian SMEs were majority-owned by women in 2023"
   ],
   [
    "Federal strategy",
    "$7B+",
    "Women Entrepreneurship Strategy, launched 2018"
   ],
   [
    "Microloans",
    "Up to $50,000",
    "Women Entrepreneurship Loan Fund"
   ],
   [
    "Women supported",
    "500,000+",
    "by the strategy since 2018"
   ]
  ],
  "h": "Starting and growing a women-owned business in Canada",
  "a": [
   [
    "",
    "Only about one in six Canadian small and medium-sized businesses is majority-owned by women. Canada’s Women Entrepreneurship Strategy (WES) was created in 2018 to change that, with loans, training, mentorship and research."
   ],
   [
    "What changed in 2026",
    "In June 2026 the federal government renewed the strategy with $173.7 million over five years: $59 million for the Women Entrepreneurship Loan Fund, $100 million for the WES Ecosystem Fund and $7 million for the Women Entrepreneurship Knowledge Hub. Loan Fund partners have already made more than 1,600 loans."
   ],
   [
    "Where the money comes from",
    "Microloans of up to $50,000 come through not-for-profit lenders such as the Women’s Enterprise Organizations of Canada (WEOC). For larger growth, BDC’s Thrive Platform for Women invests in women-led businesses, and its Thrive Entrepreneurship Through Acquisition Fund helps women buy an existing business."
   ]
  ],
  "s": [
   [
    "Write a simple plan and register",
    "Choose sole proprietor or corporation, register with your province, and get a CRA business number. Our province guides walk you through it.",
    "Province guides",
    "#guides"
   ],
   [
    "Talk to a women’s enterprise organization",
    "Members of WEOC across Canada offer free or low-cost advice, training and loans. They are the fastest way into the local network.",
    "Women’s Enterprise Organizations of Canada",
    "https://www.bdc.ca/en/financing/partners"
   ],
   [
    "Apply for a microloan of up to $50,000",
    "The Women Entrepreneurship Loan Fund is delivered by partner organizations. Each sets its own terms, so compare two or three.",
    "Women Entrepreneurship Loan Fund",
    "https://ised-isde.canada.ca/site/ised/en/programs-and-initiatives/women-entrepreneurship-strategy"
   ],
   [
    "Get certified as women-owned",
    "Certification helps you win contracts with large companies and governments that buy from diverse suppliers.",
    "WBE Canada",
    "https://www.wbecanada.ca"
   ],
   [
    "Plan your next stage of growth",
    "For venture investment or to buy a business, look at BDC’s Thrive Platform and its acquisition fund.",
    "BDC Thrive Platform for Women",
    "https://bdc.ca/en/bdc-capital/venture-capital/funds/thrive-platform"
   ],
   [
    "Join women owners on SME Hub",
    "Ask questions, find a mentor and share wins in the women entrepreneurs group.",
    "Groups on SME Hub",
    "#groups"
   ]
  ],
  "w": [
   "The WES Ecosystem Fund call for proposals closed on November 9, 2026. Watch for new programs from the organizations that win funding.",
   "Some founders say the renewed strategy does not do enough on AI and technology. Expect more training on AI for women-owned businesses."
  ],
  "g": [
   [
    "Funding and programs",
    [
     [
      "Women Entrepreneurship Strategy",
      "The federal hub for every WES program",
      "https://ised-isde.canada.ca/site/ised/en/programs-and-initiatives/women-entrepreneurship-strategy"
     ],
     [
      "BDC for women entrepreneurs",
      "Loans, advice and the $500M Thrive Platform",
      "https://www.bdc.ca/en/i-am/woman-entrepreneur"
     ],
     [
      "Thrive Entrepreneurship Through Acquisition Fund",
      "Capital and guidance to buy a business",
      "https://bdc.ca/en/bdc-capital/venture-capital/funds/thrive-platform/thrive-entrepreneurship-through-acquisition-fund"
     ]
    ]
   ],
   [
    "Networks and certification",
    [
     [
      "WEOC lending partners",
      "Loans and advice across Canada (outside Quebec)",
      "https://www.bdc.ca/en/financing/partners"
     ],
     [
      "WBE Canada",
      "Certification for women-owned suppliers",
      "https://www.wbecanada.ca"
     ],
     [
      "Women Entrepreneurship Knowledge Hub",
      "Research and data on women in business",
      "https://ised-isde.canada.ca/site/ised/en/programs-and-initiatives/women-entrepreneurship-strategy"
     ]
    ]
   ]
  ],
  "src": [
   "ISED, SMEs at a glance: Ownership demographics (2023 data)",
   "ISED, Women Entrepreneurship Strategy, June 2026 renewal",
   "BDC, Thrive Platform for Women"
  ],
  "slug": "women-entrepreneurs"
 },
 {
  "k": "black",
  "n": "Black entrepreneurs",
  "short": "Black",
  "img": "black",
  "icon": "users",
  "mag": "Black Business Magazine",
  "sub": "Loans, advisors and research built with and for Black business owners across Canada.",
  "f": [
   [
    "Black-owned businesses",
    "144,980",
    "2.4% of all businesses in Canada (2020)"
   ],
   [
    "Loans",
    "Up to $250,000",
    "Black Entrepreneurship Loan Fund"
   ],
   [
    "Entrepreneurs supported",
    "24,000+",
    "by the Black Entrepreneurship Program"
   ],
   [
    "Renewed funding",
    "$189M",
    "program extended through 2030"
   ]
  ],
  "h": "Starting and growing a Black-owned business in Canada",
  "a": [
   [
    "",
    "Black-owned businesses are growing in number, yet they are often smaller and find it harder to get financing. Statistics Canada counted about 144,980 Black-owned businesses in 2020, and close to two in three are owned by immigrants."
   ],
   [
    "The Black Entrepreneurship Program",
    "The federal Black Entrepreneurship Program (BEP) has three parts. The Loan Fund lends up to $250,000 and is run by the Federation of African Canadian Economics (FACE) with BDC. The Ecosystem Fund pays Black-led non-profits to give advice, training and mentorship. The Knowledge Hub, at Carleton University, researches what works."
   ],
   [
    "Results so far",
    "The program has supported more than 24,000 Black entrepreneurs, and the Loan Fund has approved over $70 million across more than 800 loans. In 2025 it was renewed with $189 million through 2030."
   ]
  ],
  "s": [
   [
    "Register and set up your books",
    "Register with your province, get a CRA business number and open a business bank account. Clean books make every loan easier.",
    "Province guides",
    "#guides"
   ],
   [
    "Apply to the Black Entrepreneurship Loan Fund",
    "Loans of up to $250,000 to start, grow or keep a business going, through FACE and partner organizations.",
    "Black Entrepreneurship Program",
    "https://www.ised-isde.canada.ca/site/ised/en/programs-and-initiatives/black-entrepreneurship-program"
   ],
   [
    "Find a Black-led support organization near you",
    "Ecosystem Fund organizations in every region offer advice, training and networking, often free.",
    "Ecosystem Fund in your region",
    "https://www.ised-isde.canada.ca/site/ised/en/programs-and-initiatives/black-entrepreneurship-program"
   ],
   [
    "Use the research",
    "The Black Entrepreneurship Knowledge Hub publishes data and an ecosystem map of organizations across Canada.",
    "Black Entrepreneurship Knowledge Hub",
    "https://ised-isde.canada.ca/site/ised/en/node/432"
   ],
   [
    "Look at supplier diversity programs",
    "Large companies and governments set aside spending for diverse suppliers. Certification puts you on their lists.",
    "BDC partner organizations",
    "https://bdc.ca/en/i-am/woman-entrepreneur/partners"
   ],
   [
    "Join Black owners on SME Hub",
    "Meet other owners, find customers and ask for introductions.",
    "Groups on SME Hub",
    "#groups"
   ]
  ],
  "w": [
   "Ecosystem Fund calls run through the regional development agencies (FedDev Ontario, PrairiesCan, PacifiCan, CED Quebec and others), each with its own dates.",
   "The Knowledge Hub’s partnership with Carleton University was renewed in May 2026, so expect new research on financing gaps."
  ],
  "g": [
   [
    "Funding and programs",
    [
     [
      "Black Entrepreneurship Program",
      "Loan Fund, Ecosystem Fund and Knowledge Hub",
      "https://www.ised-isde.canada.ca/site/ised/en/programs-and-initiatives/black-entrepreneurship-program"
     ],
     [
      "BEP Ecosystem Fund, Prairies",
      "Program details from PrairiesCan",
      "https://www.canada.ca/en/prairies-economic-development/services/funding/black-entrepreneurship-program-ecosystem-fund/information.html"
     ],
     [
      "BEP Ecosystem Fund, B.C.",
      "$3.8M for B.C. organizations",
      "https://www.canada.ca/en/pacific-economic-development/services/funding/black-entrepreneurship-program.html"
     ]
    ]
   ],
   [
    "Research and data",
    [
     [
      "Black Entrepreneurship Knowledge Hub",
      "Research, data and the ecosystem map",
      "https://ised-isde.canada.ca/site/ised/en/node/432"
     ],
     [
      "Black-owned businesses in Canada",
      "Statistics Canada profile",
      "https://www150.statcan.gc.ca/n1/pub/11-627-m/11-627-m2023052-eng.htm"
     ]
    ]
   ]
  ],
  "src": [
   "Statistics Canada, Black-owned businesses in Canada, 2020",
   "ISED, Black Entrepreneurship Program",
   "Government of Canada news release, February 2026"
  ],
  "slug": "black-entrepreneurs"
 },
 {
  "k": "indigenous",
  "n": "Indigenous entrepreneurs",
  "short": "Indigenous",
  "img": "indigenous",
  "icon": "flag",
  "mag": "Indigenous SME Business Magazine",
  "sub": "First Nations, Inuit and Métis business owners: capital, contracts and community support.",
  "f": [
   [
    "Indigenous-owned SMEs",
    "1.5%",
    "of all SMEs in 2023"
   ],
   [
    "Indigenous lenders",
    "50+",
    "Indigenous Financial Institutions across Canada"
   ],
   [
    "Business loans",
    "54,500+",
    "made by Indigenous Financial Institutions"
   ],
   [
    "Federal contracts",
    "5% minimum",
    "of contract value goes to Indigenous businesses"
   ]
  ],
  "h": "Starting and growing an Indigenous business in Canada",
  "a": [
   [
    "",
    "Indigenous-owned businesses made up about 1.5% of Canadian SMEs in 2023, and they have more diverse ownership than average, with more women, young owners and 2SLGBTQ+ owners."
   ],
   [
    "Capital from Indigenous lenders",
    "More than 50 Indigenous Financial Institutions (IFIs) lend to First Nations, Inuit and Métis businesses, supported by the National Aboriginal Capital Corporations Association (NACCA). In 2024–25 they made $176 million in new loans, their highest ever. Through the Aboriginal Entrepreneurship Program, IFIs and Métis Capital Corporations can also offer non-repayable contributions alongside loans."
   ],
   [
    "Selling to government",
    "Federal departments must award at least 5% of the total value of their contracts to Indigenous businesses. To bid on contracts set aside for Indigenous businesses, you must be listed in the Indigenous Business Directory or on a Modern Treaty business list."
   ]
  ],
  "s": [
   [
    "Register your business",
    "Register with your province or territory, or with your Nation where that applies, and get a CRA business number.",
    "Province guides",
    "#guides"
   ],
   [
    "Visit your local Indigenous Financial Institution",
    "Your IFI can offer loans, non-repayable contributions and business advice in one place.",
    "Find your IFI (NACCA)",
    "https://www.nacca.ca"
   ],
   [
    "Ask about the Aboriginal Entrepreneurship Program",
    "Funding for start-up and growth costs, delivered through IFIs and Métis Capital Corporations.",
    "Aboriginal Entrepreneurship Program",
    "https://isc.gc.ca/eng/1375201178602/1610797286236"
   ],
   [
    "Register in the Indigenous Business Directory",
    "Needed to bid on federal contracts set aside for Indigenous businesses.",
    "Indigenous business and federal procurement",
    "https://www.sac-isc.gc.ca/eng/1100100032802/1610723869356"
   ],
   [
    "Talk to BDC’s Indigenous team",
    "Loans and advice for Indigenous entrepreneurs, plus the $150M Indigenous Growth Fund through IFIs.",
    "BDC for Indigenous entrepreneurs",
    "https://bdc.ca/en/indigenous-entrepreneur"
   ],
   [
    "Join Indigenous owners on SME Hub",
    "Meet other owners, buyers and partners across the country.",
    "Groups on SME Hub",
    "#groups"
   ]
  ],
  "w": [
   "In March 2026 the Procurement Ombud released a critical review of contracts awarded to Indigenous businesses. Indigenous Services Canada agreed to transform its procurement policy, so the rules for the Directory and the 5% target may change.",
   "NACCA and the Government of Canada expanded support for Indigenous tourism in March 2026."
  ],
  "g": [
   [
    "Capital and programs",
    [
     [
      "NACCA",
      "The national network of 50+ Indigenous Financial Institutions",
      "https://www.nacca.ca"
     ],
     [
      "Aboriginal Entrepreneurship Program",
      "Access to capital through IFIs",
      "https://isc.gc.ca/eng/1375201178602/1610797286236"
     ],
     [
      "BDC Indigenous entrepreneurs",
      "Loans, advice and the Indigenous Growth Fund",
      "https://bdc.ca/en/indigenous-entrepreneur"
     ]
    ]
   ],
   [
    "Contracts and procurement",
    [
     [
      "Indigenous Business Directory",
      "How to register",
      "https://www.sac-isc.gc.ca/eng/1100100032802/1610723869356"
     ],
     [
      "Mandatory 5% procurement target",
      "What counts and who qualifies",
      "https://www.sac-isc.gc.ca/eng/1691786841904/1691786863431"
     ]
    ]
   ]
  ],
  "src": [
   "ISED, SME Profile: Indigenous-owned businesses in Canada (April 2026)",
   "NACCA, Annual Report 2024–25",
   "Indigenous Services Canada"
  ],
  "slug": "indigenous-entrepreneurs"
 },
 {
  "k": "immigrant",
  "n": "Immigrant entrepreneurs",
  "short": "Newcomers",
  "img": "immigrant",
  "icon": "send",
  "mag": "",
  "sub": "New to Canada? How to start, finance and grow a business, even with little Canadian credit history.",
  "f": [
   [
    "Immigrant-owned businesses",
    "33%",
    "of businesses in Canada"
   ],
   [
    "Self-employed immigrants",
    "600,000+",
    "across Canada"
   ],
   [
    "Newcomer startup loans",
    "Up to $25,000",
    "Futurpreneur with BDC (check current terms)"
   ],
   [
    "Start-up Visa",
    "Paused",
    "no new applications since June 30, 2026"
   ]
  ],
  "h": "Starting a business as a newcomer to Canada",
  "a": [
   [
    "",
    "About one in three businesses in Canada is immigrant-owned, and more than 600,000 immigrants are self-employed. The hardest parts are usually a thin Canadian credit history and not knowing the local rules and networks."
   ],
   [
    "Check your status first",
    "Most dedicated business loans require Canadian citizenship or permanent residence. If you are on a work or study permit, check what your permit allows before you start."
   ],
   [
    "Immigration programs for entrepreneurs",
    "The federal Start-up Visa Program is paused: it stopped taking new applications on June 30, 2026, while applications already accepted are still being processed. The Self-Employed Persons Program is also paused, and the government says a new, targeted pilot for immigrant entrepreneurs is coming. Some provinces run their own entrepreneur streams."
   ]
  ],
  "s": [
   [
    "Confirm what your status allows",
    "Citizens and permanent residents can start any business. Temporary residents should check their permit conditions first.",
    "IRCC: Start-up Visa status",
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/start-visa.htm"
   ],
   [
    "Register and build Canadian credit",
    "Register your business, get a CRA business number, and open a business account and credit card early to build history.",
    "Province guides",
    "#guides"
   ],
   [
    "Get a newcomer startup loan with a mentor",
    "Futurpreneur’s newcomer program pairs a loan (with BDC) with a mentor, for founders aged 18 to 39 who arrived recently.",
    "Futurpreneur for newcomers",
    "https://futurpreneur.ca/offering/newcomer/"
   ],
   [
    "Use a bank loan backed by the government",
    "Banks and credit unions lend for equipment and premises under the Canada Small Business Financing Program.",
    "Canada Small Business Financing Program",
    "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en"
   ],
   [
    "Pay for licences and credentials",
    "Windmill Microlending offers loans of up to $15,000 to skilled immigrants for training, licensing and exams.",
    "Windmill Microlending",
    "https://www.windmillmicrolending.org"
   ],
   [
    "Meet owners who have done it",
    "Ask the SME Hub community about banks, landlords, suppliers and permits in your city.",
    "Network on SME Hub",
    "#people"
   ]
  ],
  "w": [
   "A new federal pilot for immigrant entrepreneurs is expected. Do not pay anyone who promises a guaranteed business visa.",
   "Some provincial entrepreneur streams treat borrowed money differently from your own funds, so check before you borrow."
  ],
  "g": [
   [
    "Funding and programs",
    [
     [
      "Futurpreneur newcomer program",
      "Startup loan and mentor for newcomers",
      "https://futurpreneur.ca/offering/newcomer/"
     ],
     [
      "BDC for newcomer entrepreneurs",
      "Financing and advice",
      "https://www.bdc.ca/en/i-am/newcomer-entrepreneur"
     ],
     [
      "Windmill Microlending",
      "Career loans up to $15,000",
      "https://www.windmillmicrolending.org"
     ]
    ]
   ],
   [
    "Immigration rules",
    [
     [
      "Start-up Visa Program",
      "Current status from IRCC",
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/start-visa.htm"
     ],
     [
      "Update on measures for entrepreneurs",
      "IRCC notice, December 2025",
      "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/immigration-measures-entrepreneurs.html"
     ]
    ]
   ]
  ],
  "src": [
   "Futurpreneur, My Canadian Startup (2024)",
   "IRCC, Start-up Visa Program",
   "Windmill Microlending"
  ],
  "slug": "immigrant-entrepreneurs"
 },
 {
  "k": "lgbtq",
  "n": "2SLGBTQI+ entrepreneurs",
  "short": "2SLGBTQI+",
  "img": "lgbtq",
  "icon": "spark",
  "mag": "",
  "sub": "Support, certification and community for 2SLGBTQI+ business owners and their allies.",
  "f": [
   [
    "2SLGBTQ+-owned SMEs",
    "2%",
    "of SMEs were majority-owned by 2SLGBTQ+ people (2023)"
   ],
   [
    "Federal program",
    "$25M",
    "2SLGBTQI+ Entrepreneurship Program"
   ],
   [
    "Ecosystem Fund",
    "$8.5M",
    "for non-profits that support 2SLGBTQI+ owners"
   ],
   [
    "Run by",
    "CQCC",
    "Canadian Queer Chamber of Commerce"
   ]
  ],
  "h": "Starting and growing a 2SLGBTQI+-owned business in Canada",
  "a": [
   [
    "",
    "About 2% of Canadian SMEs are majority-owned by 2SLGBTQ+ people. Federal data shows these businesses had stronger growth and higher innovation rates than average in 2023."
   ],
   [
    "The 2SLGBTQI+ Entrepreneurship Program",
    "Canada’s first program of its kind is a $25 million investment, run by the Canadian Queer Chamber of Commerce (CQCC, formerly the CGLCC). It has three parts: a Business Scale-Up program inside the CQCC, an Ecosystem Fund for non-profits across Canada, and a Knowledge Hub for research."
   ],
   [
    "Good to know",
    "The program does not lend or give money directly to entrepreneurs. You get help through the CQCC and the organizations it funds. For financing, use mainstream programs such as BDC, Futurpreneur and bank loans backed by the government."
   ]
  ],
  "s": [
   [
    "Register your business",
    "Register with your province and get a CRA business number.",
    "Province guides",
    "#guides"
   ],
   [
    "Join the Canadian Queer Chamber of Commerce",
    "Programs, mentorship and a national network of 2SLGBTQI+ owners and allies.",
    "Canadian Queer Chamber of Commerce",
    "https://queerchamber.ca"
   ],
   [
    "Get certified as a 2SLGBTQI+-owned supplier",
    "Certification helps you win contracts with companies and governments that buy from diverse suppliers.",
    "Supplier diversity",
    "https://queerchamber.ca"
   ],
   [
    "Find a funded organization near you",
    "Ecosystem Fund recipients across the country offer advice, training and networking.",
    "2SLGBTQI+ Entrepreneurship Program",
    "https://queerchamber.ca/2slgbtqi-entrepreneurship-program/"
   ],
   [
    "Line up financing",
    "Use BDC, Futurpreneur or a bank loan under the Canada Small Business Financing Program. Women owners can also use the Women Entrepreneurship Loan Fund.",
    "Canada Small Business Financing Program",
    "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en"
   ],
   [
    "Join the community on SME Hub",
    "Meet owners and allies, and find inclusive suppliers and customers.",
    "Groups on SME Hub",
    "#groups"
   ]
  ],
  "w": [
   "The Knowledge Hub is building the first national research on 2SLGBTQI+ entrepreneurs. Expect new data on financing gaps.",
   "Non-binary owners reported the lowest loan approval rates of any group in 2023 (68.2%). If you are turned down, ask the lender for the reasons in writing."
  ],
  "g": [
   [
    "Programs",
    [
     [
      "2SLGBTQI+ Entrepreneurship Program",
      "Federal program overview",
      "https://ised-isde.canada.ca/site/ised/en/node/170"
     ],
     [
      "CQCC program page",
      "Scale-Up, Ecosystem Fund and Knowledge Hub",
      "https://queerchamber.ca/2slgbtqi-entrepreneurship-program/"
     ]
    ]
   ],
   [
    "Financing for every owner",
    [
     [
      "Canada Small Business Financing Program",
      "Government-backed bank loans",
      "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en"
     ],
     [
      "BDC",
      "Loans and advice for Canadian entrepreneurs",
      "https://www.bdc.ca"
     ]
    ]
   ]
  ],
  "src": [
   "ISED, SME ownership demographics (2023 data)",
   "ISED, 2SLGBTQI+ Entrepreneurship Program",
   "CQCC"
  ],
  "slug": "lgbtq"
 }
];
export const cmBySlug = (slug: string) => CMD.find((c) => c.slug === slug) ?? null;
/** The zip's in-page links (#guides, #groups ...) as site addresses. */
export const cmHref = (u: string) => (u.startsWith("#") ? ({ "#guides": "/guides", "#groups": "/groups", "#people": "/members", "#advisors": "/smb-advisor", "#grants": "/grants", "#deadlines": "/deadlines", "#tools": "/tools", "#events": "/events", "#courses": "/courses" } as Record<string, string>)[u] ?? "/" + u.slice(1) : u);
