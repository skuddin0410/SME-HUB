// Update 13: the province pages' content (the hand-off's PGD), from SK's pages at canadiansme.ca/provinces/<province>/ (reviewed October 2026).
// Facts: [label, value, note]. Stats: [value, label, note] from ISED Key Small Business Statistics 2025.
export type Prov = {
  c: string; n: string; sub: string; f: [string, string, string][]; cap: string; city: string; ind: string[]; net: string; who: string[];
  st: [string, string, string][]; h: string; a: string[][]; s: [string, string, string][]; w: string[]; g: [string, [string, string][]][];
};
export const PGREG: [string, string[]][] = [["West", ["BC"]], ["Prairies", ["AB", "SK", "MB"]], ["Central", ["ON", "QC"]], ["Atlantic", ["NB", "NS", "PE", "NL"]], ["North", ["YT", "NT", "NU"]]];
export const PGD: Prov[] = [
{
"c": "BC",
"n": "British Columbia",
"sub": "B.C. charges its own provincial sales tax and an employer health tax, with active pay-transparency and sick-leave rules.",
"f": [
[
"Sales tax",
"5% GST + 7% PST",
"PST registered and filed with the province"
],
[
"Workers’ comp",
"WorkSafeBC",
"Registration required for most employers"
],
[
"Payroll tax",
"Employer Health Tax",
"Exempt on the first $1M of B.C. payroll"
],
[
"Register",
"BC Registries",
"Name approval, incorporation and annual reports"
]
],
"cap": "Victoria",
"city": "Vancouver",
"ind": [
"Technology",
"Film and television",
"Forestry",
"Tourism",
"Pacific trade"
],
"net": "BC Chamber of Commerce",
"who": [
"David Eby|Premier of British Columbia|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"170,512",
"Small employer businesses",
"1–99 employees, December 2024"
],
[
"15.8%",
"Share of Canada’s small businesses",
"Of 1,079,188 nationally"
],
[
"36.3",
"Businesses per 1,000 adults",
"National average 32.7"
],
[
"1,769,500",
"Private-sector jobs",
"2024"
],
[
"7,649",
"Goods exporters",
"Establishments, 2024"
]
],
"h": "British Columbia: Canada’s Pacific Gateway for Growing Businesses",
"a": [
[
"",
"British Columbia links Canadian businesses to Asia-Pacific markets through its ports and airports, and has one of the highest concentrations of small businesses per adult in the country. Many firms are very small: owner-operated, with fewer than five employees.",
"Entrepreneurs across the province run technology studios, construction and trades firms, tourism operators, food producers and professional services that sustain local economies."
],
[
"Industries and Regional Strengths",
"Metro Vancouver concentrates technology, film and television, digital media, international trade and professional services. Vancouver Island and the Gulf Islands combine public-sector services, tourism and marine industries. The Okanagan has grown as a centre for wine, agriculture, tourism and tech, while the North and the Interior rely on forestry, mining, energy and transportation.",
"Indigenous-owned businesses and economic development corporations are increasingly important partners in resource projects and regional growth."
],
[
"Opportunities for Small Businesses",
"Opportunities include clean technology, life sciences, export-oriented food and consumer goods, and services for an ageing population. Trade diversification toward Asia is an active provincial priority.",
"High commercial rents and housing costs affect both operating budgets and hiring. Careful pricing, productivity investments and flexible work arrangements help small firms stay competitive."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Approve a name and register or incorporate through BC Registries. Proprietorships and partnerships register through the same online service.",
"BC Registries"
],
[
"Set up your tax accounts",
"Get a CRA business number and GST account, then register separately with the province to collect 7% PST if you sell taxable goods or services.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WorkSafeBC for workplace insurance, and review the province’s employment standards for pay, hours and leave.",
"WorkSafeBC"
],
[
"Find advice and funding",
"Talk to a local small business centre, check the funding finder for programmes that fit, and build a relationship with a bank or credit union early.",
"Small Business BC"
]
],
"w": [
"Job postings must include the expected pay or pay range under the Pay Transparency Act.",
"Employees are entitled to five paid sick days a year after 90 days of employment.",
"Some out-of-province online sellers must register to collect PST."
],
"g": [
[
"Register and stay compliant",
[
[
"Provincial Sales Tax",
"Register, collect and file PST"
],
[
"BC Registries",
"Register or incorporate a business"
],
[
"WorkSafeBC",
"Coverage, premiums and safety"
],
[
"Employer Health Tax",
"Rates, exemption and filing"
]
]
],
[
"Provincial funding and support",
[
[
"Small Business BC",
"Advisory sessions, guides and name searches"
],
[
"Innovate BC",
"Programmes for tech and innovation firms"
]
]
],
[
"Federal support in ",
[
[
"PacifiCan",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"BC Chamber of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Canadian Federation of Independent Business: research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data, source for the figures above"
]
]
]
]
},
{
"c": "AB",
"n": "Alberta",
"sub": "Alberta has no provincial sales tax and no provincial payroll tax, which keeps compliance simpler for small employers.",
"f": [
[
"Sales tax",
"5% GST only",
"No provincial sales tax"
],
[
"Workers’ comp",
"WCB-Alberta",
"Mandatory for most industries"
],
[
"Payroll tax",
"None",
"No provincial payroll or health tax"
],
[
"Register",
"Registry agents",
"Names and corporations through an agent"
]
],
"cap": "Edmonton",
"city": "Calgary",
"ind": [
"Energy",
"Agriculture",
"Technology",
"Construction",
"Logistics"
],
"net": "Alberta Chambers of Commerce",
"who": [
"Danielle Smith|Premier of Alberta|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"137,182",
"Small employer businesses",
"1–99 employees, December 2024"
],
[
"12.7%",
"Share of Canada’s small businesses",
"Of 1,079,188 nationally"
],
[
"36.3",
"Businesses per 1,000 adults",
"National average 32.7"
],
[
"1,550,800",
"Private-sector jobs",
"2024"
],
[
"6,184",
"Goods exporters",
"Establishments, 2024"
]
],
"h": "Alberta: An Enterprising Economy Beyond Energy",
"a": [
[
"",
"Although best known for energy, Alberta has a broad small-business base and one of Canada’s highest rates of businesses per adult. Its low-tax setting attracts entrepreneurs and relocating firms, and owner-operated companies make up most employers."
],
[
"Industries and Regional Strengths",
"Calgary hosts energy head offices, finance and tech. Edmonton focuses on government, health, research and petrochemicals. Regional cities serve agriculture and resources, the Rockies drive tourism, and rural areas rely on agriculture and oilfield services."
],
[
"Opportunities for Small Businesses",
"Growth areas include agri-tech, hydrogen, carbon capture, AI, logistics and film, and people moving to the province bring new customers and workers. Commodity price swings can shift demand quickly, so diversifying customers, managing cash flow and planning capital needs help firms weather downturns."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a trade name or incorporate through a registry agent or online.",
"Corporate Registry"
],
[
"Set up your tax accounts",
"Get a CRA business number and register for GST once taxable sales pass $30,000. No provincial sales tax registration is needed.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WCB-Alberta and review employment standards.",
"WCB-Alberta"
],
[
"Find advice and funding",
"Talk to a small business centre, check the funding finder and build a bank or credit union relationship early.",
"Business Link"
]
],
"w": [
"A tourism levy applies to short-term accommodation, so register if you rent rooms or units.",
"Employment standards govern overtime averaging and youth employment.",
"GST registration applies once taxable sales pass $30,000, even without PST."
],
"g": [
[
"Register and stay compliant",
[
[
"Corporate Registry",
"Register a name or incorporate"
],
[
"WCB-Alberta",
"Account set-up and premiums"
],
[
"Employment Standards",
"Pay, hours and leave rules"
]
]
],
[
"Provincial funding and support",
[
[
"Business Link",
"Free advice for Alberta small businesses"
],
[
"Alberta Innovates",
"Research and technology funding"
]
]
],
[
"Federal support in ",
[
[
"PrairiesCan",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"Alberta Chambers of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "SK",
"n": "Saskatchewan",
"sub": "Saskatchewan charges PST on goods and many services, with no provincial payroll tax and a low small-business tax rate.",
"f": [
[
"Sales tax",
"5% GST + 6% PST",
"PST filed with the province"
],
[
"Workers’ comp",
"WCB Saskatchewan",
"Mandatory for most employers"
],
[
"Payroll tax",
"None",
"No provincial payroll tax"
],
[
"Register",
"ISC Corporate Registry",
"Names and incorporation"
]
],
"cap": "Regina",
"city": "Saskatoon",
"ind": [
"Agriculture",
"Potash and uranium mining",
"Energy"
],
"net": "Saskatchewan Chamber of Commerce",
"who": [
"Scott Moe|Premier of Saskatchewan|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"33,383",
"Small employer businesses",
"1–99 employees, December 2024"
],
[
"3.1%",
"Share of Canada’s small businesses",
"Of 1,079,188 nationally"
],
[
"35.4",
"Businesses per 1,000 adults",
"National average 32.7"
],
[
"324,800",
"Private-sector jobs",
"2024"
],
[
"1,395",
"Goods exporters",
"Establishments, 2024"
]
],
"h": "Saskatchewan: Resource Strength and a Rising Small Business Base",
"a": [
[
"",
"The province supplies food, fertilizer and energy to the world, and its small businesses anchor communities. It has one of the highest business counts per adult in Canada."
],
[
"Industries and Regional Strengths",
"Saskatoon leads in mining services, agricultural biotech and university research, while Regina combines government, insurance, energy and manufacturing. Rural areas rely on grain and livestock, the north on uranium and Indigenous enterprises, and potash supports engineering, maintenance and logistics firms."
],
[
"Opportunities for Small Businesses",
"Growth areas include agri-food processing, critical minerals, precision agriculture and export services, plus demand for skilled trades. Commodity prices, weather and trade disputes can shift demand quickly, so exporters do well to spread risk across markets."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a business name or incorporate through the ISC Corporate Registry.",
"ISC Corporate Registry"
],
[
"Set up your tax accounts",
"Get a CRA business number and GST account, then register with the province for 6% PST.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WCB Saskatchewan and review employment standards.",
"WCB Saskatchewan"
],
[
"Find advice and funding",
"Talk to a local small business centre, check the funding finder and build a bank or credit union relationship.",
"Innovation Saskatchewan"
]
],
"w": [
"PST applies to many services, including some contractor and repair work.",
"Export and trade support is available through STEP.",
"Tech firms can access Innovation Saskatchewan programmes and tax credits."
],
"g": [
[
"Register and stay compliant",
[
[
"Saskatchewan PST",
"Register, collect and file"
],
[
"ISC Corporate Registry",
"Register a business"
],
[
"WCB Saskatchewan",
"Coverage and premiums"
]
]
],
[
"Provincial funding and support",
[
[
"Innovation Saskatchewan",
"Programmes for innovative companies"
],
[
"STEP",
"Saskatchewan Trade and Export Partnership"
]
]
],
[
"Federal support in ",
[
[
"PrairiesCan",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"Saskatchewan Chamber of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "MB",
"n": "Manitoba",
"sub": "Manitoba charges a retail sales tax on goods and some services, plus a health and education levy on larger payrolls.",
"f": [
[
"Sales tax",
"5% GST + 7% RST",
"RST filed with Manitoba Finance"
],
[
"Workers’ comp",
"WCB Manitoba",
"Coverage and SAFE Work prevention"
],
[
"Payroll tax",
"Health & Education Levy",
"Applies above an exemption threshold"
],
[
"Register",
"Companies Office",
"Names and corporations"
]
],
"cap": "Winnipeg",
"city": "Winnipeg",
"ind": [
"Agri-food",
"Manufacturing",
"Transportation and logistics"
],
"net": "Manitoba Chambers of Commerce",
"who": [
"Wab Kinew|Premier of Manitoba|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"33,513",
"Small employer businesses",
"1–99 employees, December 2024"
],
[
"3.1%",
"Share of Canada’s small businesses",
"Of 1,079,188 nationally"
],
[
"29.2",
"Businesses per 1,000 adults",
"National average 32.7"
],
[
"413,200",
"Private-sector jobs",
"2024"
],
[
"1,815",
"Goods exporters",
"Establishments, 2024"
]
],
"h": "Manitoba: A Central Hub for Agri-Food, Manufacturing and Logistics",
"a": [
[
"",
"The province’s central location and rail, road and air links make it a natural distribution hub. Its diversified economy and many family-owned firms give small businesses a broad base of customers."
],
[
"Industries and Regional Strengths",
"Winnipeg leads in aerospace, transportation manufacturing, finance and creative industries. Brandon and western Manitoba focus on agriculture, northern areas on mining, hydro and the Port of Churchill, and Indigenous communities are central to future growth. St. Boniface offers bilingual business services."
],
[
"Opportunities for Small Businesses",
"Growth areas include protein processing, value-added agriculture, logistics, clean energy and services for newcomers. Lower costs outside large cities help start-ups, but small local markets push firms to grow through exports and online sales."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a business name or incorporate through the Manitoba Companies Office.",
"Companies Office"
],
[
"Set up your tax accounts",
"Get a CRA business number and GST account, then register with Manitoba Finance for 7% RST.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WCB Manitoba and review employment standards.",
"WCB Manitoba"
],
[
"Find advice and funding",
"Talk to a local small business centre, use the funding finder and build a banking relationship early.",
"Community Futures Manitoba"
]
],
"w": [
"RST applies to some services as well as goods, so check before invoicing.",
"Smaller payrolls are exempt from the levy; confirm the threshold each year.",
"Export support is available through the World Trade Centre Winnipeg."
],
"g": [
[
"Register and stay compliant",
[
[
"Manitoba Taxation",
"RST and the payroll levy"
],
[
"Companies Office",
"Register a business or corporation"
],
[
"WCB Manitoba",
"Registration and premiums"
]
]
],
[
"Provincial funding and support",
[
[
"Community Futures Manitoba",
"Small business loans and advice outside Winnipeg"
],
[
"World Trade Centre Winnipeg",
"Export training and market access"
]
]
],
[
"Federal support in ",
[
[
"PrairiesCan",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"Manitoba Chambers of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "ON",
"n": "Ontario",
"sub": "Ontario is Canada’s largest provincial economy, with HST, a payroll-based health tax and strong employment-standards rules.",
"f": [
[
"Sales tax",
"13% HST",
"5% federal plus 8% provincial, filed with CRA"
],
[
"Workers’ comp",
"WSIB",
"Most employers register within 10 days of hiring"
],
[
"Payroll tax",
"Employer Health Tax",
"Eligible employers exempt on the first $1M of payroll"
],
[
"Register",
"Ontario Business Registry",
"Names, incorporation and annual returns online"
]
],
"cap": "Toronto",
"city": "Toronto",
"ind": [
"Financial services",
"Advanced and automotive manufacturing",
"Technology",
"Agri-food"
],
"net": "Ontario Chamber of Commerce",
"who": [
"Doug Ford|Premier of Ontario|Premier",
"Nina Tangri|Associate Minister of Small Business|Province",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"410,154",
"Small employer businesses",
"1–99 employees, December 2024"
],
[
"38.0%",
"Share of Canada’s small businesses",
"Of 1,079,188 nationally"
],
[
"31.6",
"Businesses per 1,000 adults",
"National average 32.7"
],
[
"4,973,700",
"Private-sector jobs",
"2024"
],
[
"22,828",
"Goods exporters",
"Establishments, 2024"
]
],
"h": "Ontario: A Diverse Economy Powered by Entrepreneurship",
"a": [
[
"",
"Ontario combines established industries, growing tech communities and small businesses that serve local and international customers."
],
[
"Industries and Regional Strengths",
"Each region has its own strengths. Toronto leads in finance, tech and media; Ottawa in tech and government-facing services; Waterloo in start-ups; southwestern Ontario in manufacturing and agriculture; and the North in mining, forestry and tourism."
],
[
"Opportunities for Small Businesses",
"Large cities, a diverse population, universities and links to Canadian and U.S. markets support growth in digital services, clean tech and healthcare. Costs, financing, hiring and competition remain the main challenges."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a name or incorporate through the Ontario Business Registry. Sole proprietors using a name other than their own must register it and renew every five years.",
"Ontario Business Registry"
],
[
"Set up your tax accounts",
"Get a CRA business number and GST/HST account. HST applies once taxable sales pass $30,000 over four quarters.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WSIB and review employment standards.",
"WSIB"
],
[
"Find advice and funding",
"Talk to a local small business centre, check the funding finder and build a bank or credit union relationship early.",
"Ontario Small Business Advisory Centres"
]
],
"w": [
"The 2026 Ontario Budget cut the small business corporate income tax rate from 3.2% to 2.2%.",
"Minimum wage is indexed and changes every October 1.",
"From January 1, 2026, employers with 25 or more staff must include pay ranges in public job postings.",
"AODA accessibility compliance reports are due on a set cycle for organizations with 20 or more employees."
],
"g": [
[
"Register and stay compliant",
[
[
"Ontario Business Registry",
"Register names, incorporate, file annual returns"
],
[
"WSIB",
"Workplace insurance registration and premiums"
],
[
"Employer Health Tax",
"Rates, exemption and instalments"
],
[
"Employment Standards",
"Hours, overtime, vacation and termination"
]
]
],
[
"Provincial funding and support",
[
[
"Ontario Small Business Advisory Centres",
"Free local advice and starter grants"
],
[
"Invest Ontario",
"Support for larger expansion projects"
],
[
"Ontario Made",
"Promotes Ontario-made products"
]
]
],
[
"Federal support in ",
[
[
"FedDev Ontario / FedNor",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"Ontario Chamber of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "QC",
"n": "Quebec",
"sub": "Quebec runs its own sales tax, pension plan and parental insurance, and most filings go to Revenu Québec rather than CRA.",
"f": [
[
"Sales tax",
"5% GST + 9.975% QST",
"Both usually administered by Revenu Québec"
],
[
"Workers’ comp",
"CNESST",
"Also covers labour standards and pay equity"
],
[
"Payroll",
"QPP, QPIP, HSF",
"Replace CPP and part of EI; Health Services Fund"
],
[
"Register",
"Registraire des entreprises",
"Registration and annual updating declaration"
]
],
"cap": "Quebec City",
"city": "Montréal",
"ind": [
"Aerospace",
"AI and technology",
"Hydroelectricity",
"Forestry",
"Life sciences"
],
"net": "Fédération des chambres de commerce du Québec",
"who": [
"Paul St-Pierre Plamondon|Premier of Quebec|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"228,622",
"Small employer businesses",
"1–99 employees, December 2024"
],
[
"21.2%",
"Share of Canada’s small businesses",
"Of 1,079,188 nationally"
],
[
"31.6",
"Businesses per 1,000 adults",
"National average 32.7"
],
[
"2,765,000",
"Private-sector jobs",
"2024"
],
[
"11,008",
"Goods exporters",
"Establishments, 2024"
]
],
"h": "Quebec: A Distinct Market with a Strong Entrepreneurial Culture",
"a": [
[
"",
"Quebec pairs a French-speaking consumer base with strong research institutions and many family businesses and co-operatives, all under its own legal and tax framework."
],
[
"Industries and Regional Strengths",
"Montréal leads in aerospace, AI, games, life sciences and finance; Quebec City in insurance, optics and digital; other regions in manufacturing, agri-food, aluminum, forestry and mining. Low-cost hydroelectricity and co-op networks support regional firms."
],
[
"Opportunities for Small Businesses",
"Clean energy, transport electrification, digital services, food processing and tourism offer room to grow, and serving customers in French opens loyal domestic and francophone export markets. Plan for labour shortages, French-language and privacy compliance, and the extra work of a separate provincial tax system."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register with the Registraire des entreprises and file the annual updating declaration.",
"Registraire des entreprises"
],
[
"Set up your tax accounts",
"Revenu Québec handles GST and QST for most businesses and issues the Quebec enterprise number used for payroll.",
"Revenu Québec"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with CNESST and review employment standards.",
"CNESST"
],
[
"Find advice and funding",
"Use a small business centre, check the funding finder and build a banking relationship early.",
"Investissement Québec"
]
],
"w": [
"Charter of the French Language rules cover signage, packaging, contracts and websites.",
"Businesses with 25 or more employees must register with the OQLF for francization.",
"Law 25 privacy rules require a privacy officer and documented data practices."
],
"g": [
[
"Register and stay compliant",
[
[
"Revenu Québec",
"GST/QST, source deductions and employer contributions"
],
[
"Registraire des entreprises",
"Register and update your business"
],
[
"CNESST",
"Workplace health, safety and labour standards"
],
[
"OQLF",
"French-language obligations for businesses"
]
]
],
[
"Provincial funding and support",
[
[
"Investissement Québec",
"Financing and investment for Quebec companies"
],
[
"Entreprises Québec",
"Government services portal for entrepreneurs"
]
]
],
[
"Federal support in ",
[
[
"CED Quebec Regions",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"Fédération des chambres de commerce du Québec",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "NB",
"n": "New Brunswick",
"sub": "Canada’s only officially bilingual province, with a 15% HST and strong ACOA and Opportunities NB support.",
"f": [
[
"Sales tax",
"15% HST",
"Filed with CRA"
],
[
"Workers’ comp",
"WorkSafeNB",
"Required once a business has three or more workers"
],
[
"Payroll tax",
"None",
"No provincial payroll tax"
],
[
"Register",
"Service New Brunswick",
"Corporate registry"
]
],
"cap": "Fredericton",
"city": "Moncton",
"ind": [
"Forestry",
"Seafood",
"Energy",
"IT",
"Bilingual customer services"
],
"net": "Atlantic Chamber of Commerce",
"who": [
"Susan Holt|Premier of New Brunswick|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"20,256",
"Small employer businesses",
"1–99 employees, December 2024"
],
[
"1.9%",
"Share of Canada’s small businesses",
"Of 1,079,188 nationally"
],
[
"29.2",
"Businesses per 1,000 adults",
"National average 32.7"
],
[
"224,900",
"Private-sector jobs",
"2024"
],
[
"842",
"Goods exporters",
"Establishments, 2024"
]
],
"h": "New Brunswick: A Bilingual Business Base Bridging Markets",
"a": [
[
"",
"As the only officially bilingual province, New Brunswick lets local firms serve both English- and French-speaking customers. Its position between central Canada, the Atlantic provinces and New England makes it a trade crossroads."
],
[
"Industries and Regional Strengths",
"Moncton leads in transportation, logistics and bilingual service. Saint John is strong in energy, ports and manufacturing. Fredericton combines government, cybersecurity, education and technology. The Acadian Peninsula and the north depend on fisheries and forestry, and Maine is next door for U.S. customers."
],
[
"Opportunities for Small Businesses",
"Growth areas include cybersecurity, energy innovation, value-added wood and seafood products, and remote service delivery. Newcomers are reshaping local markets and the labour pool, while small local markets make exports and online sales important."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a business name or incorporate through the provincial corporate registry.",
"Service New Brunswick"
],
[
"Set up your tax accounts",
"Get a CRA business number and HST account, since 15% HST applies.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WorkSafeNB and review employment standards.",
"WorkSafeNB"
],
[
"Find advice and funding",
"Talk to a local small business centre, search the funding finder and build a bank or credit union relationship early.",
"Opportunities New Brunswick"
]
],
"w": [
"Serving customers in both French and English widens your market across the province.",
"Government contracts may require bilingual service.",
"Opportunities NB supports expansion and export projects."
],
"g": [
[
"Register and stay compliant",
[
[
"Service New Brunswick",
"Corporate registry and business names"
],
[
"WorkSafeNB",
"Coverage and premiums"
]
]
],
[
"Provincial funding and support",
[
[
"Opportunities New Brunswick",
"Funding and expansion support"
]
]
],
[
"Federal support in ",
[
[
"ACOA",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"Atlantic Chamber of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "NS",
"n": "Nova Scotia",
"sub": "Nova Scotia uses a harmonized sales tax collected by CRA. The provincial portion was cut by one point in 2025.",
"f": [
[
"Sales tax",
"14% HST",
"Reduced from 15% on April 1, 2025"
],
[
"Workers’ comp",
"WCB Nova Scotia",
"Required in most industries"
],
[
"Payroll tax",
"None",
"No provincial payroll tax"
],
[
"Register",
"Joint Stock Companies",
"Registration and annual renewal"
]
],
"cap": "Halifax",
"city": "Halifax",
"ind": [
"Ocean industries and seafood",
"Shipbuilding",
"Tourism",
"Education"
],
"net": "Halifax Chamber of Commerce",
"who": [
"Tim Houston|Premier of Nova Scotia|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"24,903",
"Small employer businesses",
"1–99 employees, December 2024"
],
[
"2.3%",
"Share of Canada’s small businesses",
"Of 1,079,188 nationally"
],
[
"28.3",
"Businesses per 1,000 adults",
"National average 32.7"
],
[
"283,500",
"Private-sector jobs",
"2024"
],
[
"1,037",
"Goods exporters",
"Establishments, 2024"
]
],
"h": "Nova Scotia: Ocean Industries and a Growing Entrepreneurial Scene",
"a": [
[
"",
"The economy is shaped by the sea, universities and population growth. Halifax is one of Atlantic Canada’s faster-growing cities, bringing customers and talent."
],
[
"Industries and Regional Strengths",
"Halifax leads in defence, shipbuilding, ocean technology, finance, health and higher education. The South Shore and Annapolis Valley focus on seafood, wine, agriculture and tourism. Cape Breton emphasizes tourism, culture and energy, and the Port of Halifax links exporters to Europe and the U.S. East Coast."
],
[
"Opportunities for Small Businesses",
"Growth areas include ocean technology, offshore wind, clean energy, seafood exports, and health and education services. The lower HST helps consumer-facing firms, while workforce availability and housing remain hurdles."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a business name or incorporate, and renew every year.",
"Registry of Joint Stock Companies"
],
[
"Set up your tax accounts",
"Get a CRA business number and HST account, since 14% HST applies.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WCB Nova Scotia and review employment standards.",
"WCB Nova Scotia"
],
[
"Find advice and funding",
"Talk to a local small business centre, search the funding finder and build a bank or credit union relationship early.",
"Invest Nova Scotia"
]
],
"w": [
"Confirm invoices, point-of-sale systems and price lists use the 14% HST rate.",
"Renew Registry of Joint Stock Companies registrations every year.",
"ACOA is the main federal funding partner for Atlantic businesses."
],
"g": [
[
"Register and stay compliant",
[
[
"Registry of Joint Stock Companies",
"Register and renew a business"
],
[
"WCB Nova Scotia",
"Coverage and premiums"
],
[
"Labour Standards",
"Pay, hours and leave"
]
]
],
[
"Provincial funding and support",
[
[
"Invest Nova Scotia",
"Funding and support for growth"
]
]
],
[
"Federal support in ",
[
[
"ACOA",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"Halifax Chamber of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "PE",
"n": "Prince Edward Island",
"sub": "A compact market with a 15% HST, hands-on provincial support and close ties to the Atlantic supply chain.",
"f": [
[
"Sales tax",
"15% HST",
"Filed with CRA"
],
[
"Workers’ comp",
"WCB PEI",
"Mandatory for most employers"
],
[
"Payroll tax",
"None",
"No provincial payroll tax"
],
[
"Register",
"Corporate Registry",
"Business names and corporations"
]
],
"cap": "Charlottetown",
"city": "Charlottetown",
"ind": [
"Agriculture",
"Fisheries",
"Tourism",
"Bioscience"
],
"net": "Greater Charlottetown Area Chamber of Commerce",
"who": [
"Rob Lantz|Premier of Prince Edward Island|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"5,246",
"Small employer businesses",
"1–99 employees, December 2024"
],
[
"0.5%",
"Share of Canada’s small businesses",
"Of 1,079,188 nationally"
],
[
"36.2",
"Businesses per 1,000 adults",
"National average 32.7"
],
[
"48,900",
"Private-sector jobs",
"2024"
],
[
"278",
"Goods exporters",
"Establishments, 2024"
]
],
"h": "Prince Edward Island: A Compact Market with Strong Community Ties",
"a": [
[
"",
"Despite being the smallest province, PEI has a high rate of businesses per adult, and close-knit communities and accessible government help entrepreneurs build networks quickly."
],
[
"Industries and Regional Strengths",
"Charlottetown leads in government, health care, bioscience and professional services. Summerside is strong in aerospace and manufacturing, rural areas are known for agri-food and seafood, tourism is island-wide, and the Confederation Bridge links to mainland markets."
],
[
"Opportunities for Small Businesses",
"Growth areas include bioscience, animal health, food innovation, culinary and seasonal tourism, and services for a growing population. Because of seasonality and a small local market, many firms add exports or year-round services."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a business name or incorporate through the PEI registry.",
"Corporate and Business Registry"
],
[
"Set up your tax accounts",
"Get a CRA business number and HST account.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WCB PEI and review employment standards.",
"WCB PEI"
],
[
"Find advice and funding",
"Talk to a local small business centre, check the funding finder and build a bank or credit union relationship.",
"Innovation PEI"
]
],
"w": [
"Innovation PEI offers financing, export and productivity programmes.",
"Seasonal businesses should plan cash flow around tourism months.",
"ACOA is the main federal funding partner."
],
"g": [
[
"Register and stay compliant",
[
[
"Corporate and Business Registry",
"Register a business"
],
[
"WCB PEI",
"Coverage and premiums"
]
]
],
[
"Provincial funding and support",
[
[
"Innovation PEI",
"Provincial business development"
]
]
],
[
"Federal support in ",
[
[
"ACOA",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"Greater Charlottetown Area Chamber of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "NL",
"n": "Newfoundland and Labrador",
"sub": "A 15% HST province with a payroll-based health and post-secondary education tax on larger employers.",
"f": [
[
"Sales tax",
"15% HST",
"Filed with CRA"
],
[
"Workers’ comp",
"WorkplaceNL",
"Registration and assessments"
],
[
"Payroll tax",
"Health & Post-Secondary Education Tax",
"Applies above an exemption threshold"
],
[
"Register",
"Registry of Companies",
"Incorporation and names"
]
],
"cap": "St. John’s",
"city": "St. John’s",
"ind": [
"Offshore energy",
"Fisheries",
"Ocean technology",
"Mining"
],
"net": "The Board of Trade (St. John’s)",
"who": [
"Tony Wakeham|Premier of Newfoundland and Labrador|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"12,626",
"Small employer businesses",
"1–99 employees, December 2024"
],
[
"1.2%",
"Share of Canada’s small businesses",
"Of 1,079,188 nationally"
],
[
"27.9",
"Businesses per 1,000 adults",
"National average 32.7"
],
[
"134,100",
"Private-sector jobs",
"2024"
],
[
"313",
"Goods exporters",
"Establishments, 2024"
]
],
"h": "Newfoundland and Labrador: Ocean Economy and Resource Opportunity",
"a": [
[
"",
"The province’s economy rests on the ocean, mining and energy, with strong, self-reliant entrepreneurship. Small firms serve communities spread across a large area."
],
[
"Industries and Regional Strengths",
"St. John’s leads in offshore energy, ocean tech, government, health care and Memorial University. Western Newfoundland focuses on tourism, forestry and fisheries. Labrador has iron ore, nickel and hydro projects with Indigenous partners, and many coastal areas rely on seasonal fishing and tourism."
],
[
"Opportunities for Small Businesses",
"Growth areas include ocean tech, aquaculture, tourism, mining supply and clean energy. Distance, transport costs and rural population decline call for careful planning, while online sales and regional partnerships widen reach."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a business name or incorporate with the Registry of Companies.",
"Registry of Companies"
],
[
"Set up your tax accounts",
"Get a CRA business number and HST account.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WorkplaceNL and review employment standards.",
"WorkplaceNL"
],
[
"Find advice and funding",
"Talk to a small business centre, check the funding finder and build a bank or credit union relationship.",
"Industry, Energy and Technology"
]
],
"w": [
"Payroll tax applies only above the exemption; confirm the threshold each year.",
"Ocean, energy and tech sectors have dedicated provincial programmes.",
"ACOA is the main federal funding partner."
],
"g": [
[
"Register and stay compliant",
[
[
"Registry of Companies",
"Register or incorporate"
],
[
"WorkplaceNL",
"Coverage and assessments"
],
[
"Payroll tax",
"Health and Post-Secondary Education Tax"
]
]
],
[
"Provincial funding and support",
[
[
"Industry, Energy and Technology",
"Provincial business programmes"
]
]
],
[
"Federal support in ",
[
[
"ACOA",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"The Board of Trade (St. John’s)",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "YT",
"n": "Yukon",
"sub": "No territorial sales tax, with northern incentives that help attract and keep staff.",
"f": [
[
"Sales tax",
"5% GST only",
"No territorial sales tax"
],
[
"Workers’ comp",
"YWCHSB",
"Workers’ Safety and Compensation Board"
],
[
"Payroll tax",
"None",
"No territorial payroll tax"
],
[
"Register",
"Corporate Affairs",
"Registration and annual returns"
]
],
"cap": "Whitehorse",
"city": "Whitehorse",
"ind": [
"Mining",
"Tourism",
"Public services"
],
"net": "Whitehorse Chamber of Commerce",
"who": [
"Currie Dixon|Premier of Yukon|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"2,791",
"Small employer businesses",
"Yukon, NWT and Nunavut combined, Dec. 2024"
],
[
"29.1",
"Businesses per 1,000 adults",
"Territories combined; national 32.7"
],
[
"13,000",
"Private-sector jobs",
"2024"
],
[
"99",
"Goods exporters",
"Territories combined, 2024"
]
],
"h": "Yukon: Northern Business with Room to Grow",
"a": [
[
"",
"Yukon’s small economy centres on Whitehorse, where most residents live. Contractors, tourism operators, retailers, restaurants and professional services make up most businesses."
],
[
"Industries and Regional Strengths",
"Whitehorse leads in government, retail, health care and services. Dawson City and the Klondike draw visitors, mining supports transport and equipment suppliers, and First Nations are major economic partners. The Alaska Highway connects Yukon to B.C. and Alaska."
],
[
"Opportunities for Small Businesses",
"Growth areas include adventure and cultural tourism, mining services, construction and local food. High costs, long shipping distances and a small labour pool call for careful planning."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a name or incorporate with Yukon Corporate Affairs, and check for a municipal business licence.",
"Doing business in Yukon"
],
[
"Set up your tax accounts",
"Get a CRA business number and register for GST once taxable sales pass $30,000.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with YWCHSB and review employment standards.",
"YWCHSB"
],
[
"Find advice and funding",
"Contact a local small business centre, check the funding finder and build a relationship with a bank or credit union.",
"Yukon business funding"
]
],
"w": [
"Staff may qualify for the northern residents deduction on personal taxes.",
"Remote shipping adds cost and time, so include it in your prices.",
"CanNor is the federal regional development agency."
],
"g": [
[
"Register and stay compliant",
[
[
"Doing business in Yukon",
"Registration, licences and permits"
],
[
"YWCHSB",
"Coverage and safety"
]
]
],
[
"Territorial funding and support",
[
[
"Yukon business funding",
"Territorial programmes for businesses"
]
]
],
[
"Federal support in ",
[
[
"CanNor",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"Whitehorse Chamber of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "NT",
"n": "Northwest Territories",
"sub": "No territorial sales tax, a payroll tax deducted from employee pay and SEED funding for entrepreneurs.",
"f": [
[
"Sales tax",
"5% GST only",
"No territorial sales tax"
],
[
"Workers’ comp",
"WSCC",
"Shared with Nunavut"
],
[
"Payroll tax",
"Territorial payroll tax",
"Deducted from employee pay"
],
[
"Register",
"Corporate Registries",
"Run by the Department of Justice"
]
],
"cap": "Yellowknife",
"city": "Yellowknife",
"ind": [
"Diamond mining",
"Public services",
"Tourism"
],
"net": "NWT Chamber of Commerce",
"who": [
"R.J. Simpson|Premier of the Northwest Territories|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"2,791",
"Small employer businesses",
"Yukon, NWT and Nunavut combined, Dec. 2024"
],
[
"29.1",
"Businesses per 1,000 adults",
"Territories combined; national 32.7"
],
[
"14,900",
"Private-sector jobs",
"2024"
],
[
"99",
"Goods exporters",
"Territories combined, 2024"
]
],
"h": "Northwest Territories: Resource Economy, Northern Entrepreneurs",
"a": [
[
"",
"The territory’s economy rests on diamond mining, government services and growing tourism. Small businesses serve communities, mines and visitors, and Indigenous development corporations are central to the business community."
],
[
"Industries and Regional Strengths",
"Yellowknife is the hub for government, mining services, aviation and retail. The Beaufort Delta, Sahtu and South Slave depend on transportation, energy and public services, aurora tourism draws visitors, and winter roads link many communities and mine sites."
],
[
"Opportunities for Small Businesses",
"Growth areas include aurora and cultural tourism, mine remediation, construction and renewable energy. High costs, remote logistics and workforce shortages are the main challenges, which SEED and federal northern programmes can help with."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a business name or incorporate through NWT Corporate Registries.",
"Corporate Registries"
],
[
"Set up your tax accounts",
"Get a CRA business number and GST account, and set up payroll withholding for the territorial payroll tax.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WSCC and review employment standards.",
"WSCC"
],
[
"Find advice and funding",
"Talk to a local small business centre, check the funding finder and build a banking relationship early.",
"SEED programme"
]
],
"w": [
"Employers must withhold and remit the territorial payroll tax.",
"SEED funding supports start-ups and expansion.",
"Staff may qualify for the northern residents deduction."
],
"g": [
[
"Register and stay compliant",
[
[
"Corporate Registries",
"Register a business"
],
[
"WSCC",
"Coverage and safety"
]
]
],
[
"Territorial funding and support",
[
[
"SEED programme",
"Support for entrepreneurs and economic development"
]
]
],
[
"Federal support in ",
[
[
"CanNor",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"NWT Chamber of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
},
{
"c": "NU",
"n": "Nunavut",
"sub": "No territorial sales tax, a payroll tax on employee pay and dedicated Nunavut business financing.",
"f": [
[
"Sales tax",
"5% GST only",
"No territorial sales tax"
],
[
"Workers’ comp",
"WSCC",
"Shared with the Northwest Territories"
],
[
"Payroll tax",
"Territorial payroll tax",
"Deducted from employee pay"
],
[
"Register",
"Legal Registries",
"Business names and corporations"
]
],
"cap": "Iqaluit",
"city": "Iqaluit",
"ind": [
"Mining",
"Fisheries",
"Public services",
"Inuit arts"
],
"net": "Baffin Regional Chamber of Commerce",
"who": [
"John Main|Premier of Nunavut|Premier",
"Rechie Valdez|Secretary of State (Small Business and Tourism)|Federal"
],
"st": [
[
"2,791",
"Small employer businesses",
"Yukon, NWT and Nunavut combined, Dec. 2024"
],
[
"29.1",
"Businesses per 1,000 adults",
"Territories combined; national 32.7"
],
[
"12,400",
"Private-sector jobs",
"2024"
],
[
"99",
"Goods exporters",
"Territories combined, 2024"
]
],
"h": "Nunavut: Inuit-Led Growth Across the Arctic",
"a": [
[
"",
"Canada’s largest and youngest territory has a mostly Inuit population. Small businesses serve 25 fly-in communities."
],
[
"Industries and Regional Strengths",
"Iqaluit is the hub for government, construction, aviation and retail. Mines in Kivalliq and Qikiqtaaluk drive supplier demand, offshore fisheries operate, and Inuit art sells worldwide. The summer sealift shapes inventory and construction timing."
],
[
"Opportunities for Small Businesses",
"Construction, mining services, tourism, fisheries and the arts all offer room to grow, and government procurement favours Inuit-owned and Nunavut firms. High costs and small markets call for long planning and strong community partnerships."
]
],
"s": [
[
"Choose your business structure",
"Pick a sole proprietorship, partnership or corporation. Incorporating limits personal liability and can lower tax on retained profits, but adds filing work.",
"Corporations Canada"
],
[
"Register your business",
"Register a business name or incorporate.",
"Nunavut Legal Registries"
],
[
"Set up your tax accounts",
"Get a CRA business number and GST account, and set up payroll withholding.",
"Register for a business number"
],
[
"Get licences and permits",
"Use BizPaL to find federal, provincial and municipal permits, then confirm zoning and any local licence with your city or town.",
"BizPaL permit finder"
],
[
"Prepare to hire",
"Open a CRA payroll account, register with WSCC and review employment standards.",
"WSCC"
],
[
"Find advice and funding",
"Talk to a small business centre, check the funding finder and build a bank or credit union relationship.",
"Nunavut Business Credit Corporation"
]
],
"w": [
"Government procurement favours Inuit-owned and Nunavut-based firms under the NNI policy.",
"Sealift schedules drive inventory timing, so order early.",
"Staff may qualify for the northern residents deduction."
],
"g": [
[
"Register and stay compliant",
[
[
"Nunavut Legal Registries",
"Register a business"
],
[
"WSCC",
"Coverage and safety"
]
]
],
[
"Territorial funding and support",
[
[
"Nunavut Business Credit Corporation",
"Loans for Nunavut businesses"
],
[
"Nunavut Development Corporation",
"Investment in local enterprises"
]
]
],
[
"Federal support in ",
[
[
"CanNor",
"Your federal regional development agency"
],
[
"CRA My Business Account",
"GST/HST, payroll and corporate tax online"
],
[
"BDC",
"Loans and advisory for Canadian entrepreneurs"
]
]
],
[
"Business networks and data",
[
[
"Baffin Regional Chamber of Commerce",
"Advocacy, events and member benefits"
],
[
"CFIB",
"Research and advisers"
],
[
"Key Small Business Statistics",
"ISED’s official SME data"
]
]
]
]
}
];
export const pgSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const pgByC = (c: string) => PGD.find((p) => p.c === c) ?? null;
export const pgBySlug = (k: string) => PGD.find((p) => pgSlug(p.n) === k) ?? null;
