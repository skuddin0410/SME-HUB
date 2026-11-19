// Resource and business-guide pages, with the wording published on smehub.ca.
export type HubPage = {
  /** address on the old site, kept so old links can be matched */
  slug: string;
  heads: string[];
  intro: string;
  img: string;
  left: [string, string][];
  right: [string, string][];
  orgs: number[];
};

export const PAGES_1: HubPage[] = [
  {
    slug: "indigenous-entrepreneurs",
    heads: ["Indigenous Entrepreneurs Resource Centre"],
    intro: "The Indigenous Entrepreneurs Resource Centre, powered by the CanadianSME Small Business Magazine, is your one-stop hub for building and growing Indigenous businesses in Canada. We provide comprehensive resources, expert startup guides, valuable partnerships, and upcoming event information tailored to support Indigenous entrepreneurs. Connect with experienced small business advisors to navigate your unique entrepreneurial journey with confidence.",
    img: "2025/02/Indigenous-Entrepreneurs.jpg",
    left: [
      ["Holistic Support", "This point emphasizes the comprehensive nature of your services. You’re not just providing resources for starting a business but also for maintaining and growing it successfully. This could be visualized with diagrams or an infographic that maps out the entrepreneurial journey, highlighting where your resources fit into each stage."],
      ["Expert Guides", "Highlight the quality and experience behind your startup guides. A section of the webpage might be dedicated to featuring these guides, with images of the experts who created them and short, engaging summaries of what each guide contains."],
      ["Events Calendar", "A calendar or list of upcoming events for Indigenous businesses in Canada is an excellent way to keep your community engaged and connected. This could be made interactive, allowing users to click on each event for more details and the option to add it to their personal calendars."],
      ["Business Advisors", "This section could introduce each advisor with a photo and short bio, as well as testimonials from businesses they’ve helped. You might include an easy way to contact or schedule a consultation with each advisor."],
    ],
    right: [
      ["Partnerships", "Showcase your partners and the special offers they provide. This could include logos, brief descriptions of each partner’s services, and specifics of the offers they’re providing for Indigenous businesses."],
      ["Indigenous Business Spotlight", "Consider featuring profiles or case studies of successful Indigenous businesses. This can serve as inspiration for budding entrepreneurs. Each feature could include photos, a brief history of the business, and tips or advice from the business owners."],
      ["Easy Navigation", "This should be a foundational element of your webpage design. Ensure that your website’s navigation is simple and intuitive, with clearly labelled sections, a logical structure, and a search function for easy access to specific resources. This can involve using headers, dropdown menus, and a site map if necessary."],
    ],
    orgs: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    slug: "resources-for-lgbtq",
    heads: ["LGBTQ+ Entrepreneurs Resource Centre"],
    intro: "The LGBTQ+ Resource Centre, powered by CanadianSME Small Business Magazine, is a dedicated platform created to support and amplify the growth of LGBTQ+-owned businesses across Canada. This initiative seeks to dismantle the barriers faced by LGBTQ+ entrepreneurs by providing tailored resources and fostering an inclusive business environment.",
    img: "2025/02/LGBTQ-Entrepreneurs-791x1024.jpg",
    left: [
      ["Inclusive Education", "The Centre provides a wide range of educational resources and training programs that are specially tailored to the needs and experiences of LGBTQ+ entrepreneurs. This includes workshops, webinars, and courses covering various aspects of business management and growth."],
      ["Networking and Collaboration", "By organizing networking events and fostering a community of LGBTQ+ entrepreneurs, the Centre provides opportunities for collaboration, idea-sharing, and mutual support."],
      ["Funding Guidance", "The Resource Centre provides information and guidance on funding opportunities that are specifically aimed at or available to LGBTQ+ entrepreneurs. This includes grants, loans, and other forms of financial assistance."],
    ],
    right: [
      ["Mentorship Programs", "The Centre facilitates mentorship programs, pairing less experienced entrepreneurs with more experienced business owners or industry professionals from the LGBTQ+ community. This can provide invaluable advice and support to those just starting out."],
      ["Visibility and Promotion", "Through its partnership with the CanadianSME Small Business Magazine, the Centre provides a platform for LGBTQ+ entrepreneurs to gain visibility and recognition. This can lead to increased business opportunities and growth."],
      ["Advocacy", "The Centre acts as an advocate for the LGBTQ+ business community, representing their interests, pushing for inclusive business practices, and working towards equality in the entrepreneurial landscape."],
    ],
    orgs: [7, 8, 9, 10, 11, 12],
  },
  {
    slug: "women-entrepreneurs",
    heads: ["Women Entrepreneurs Resource Centre"],
    intro: "The Women Entrepreneur Resource Centre, supported by the CanadianSME Small Business Magazine, is a vibrant platform committed to uplifting and expanding the presence of women-owned businesses across Canada. This pivotal initiative aims to counter the unique challenges encountered by women entrepreneurs by offering a broad array of supportive resources and nurturing an ecosystem conducive to their success.",
    img: "2025/02/Women-Entrepreneurs-791x1024.jpg",
    left: [
      ["Education and Skill Development", "The Centre provides an extensive suite of educational materials, training programs, and development workshops tailored to the needs of women entrepreneurs. These resources cover a wide range of business-related topics to help women enhance their entrepreneurial skills and business acumen."],
      ["Networking Opportunities", "The Centre organizes numerous networking events to help women entrepreneurs connect, exchange ideas, and foster professional relationships. These events often serve as a springboard for collaborations and partnerships."],
      ["Funding Assistance", "Recognizing the common challenges women face in securing business funding, the Resource Centre provides guidance on available grants, loans, and other funding opportunities specifically designed for women entrepreneurs."],
    ],
    right: [
      ["Mentorship Programs", "The Centre pairs budding entrepreneurs with seasoned business professionals, fostering mentorship relationships that can provide invaluable advice, inspiration, and guidance."],
      ["Visibility and Advocacy", "Leveraging its partnership with the CanadianSME Small Business Magazine, the Centre offers a platform for women entrepreneurs to gain visibility, recognition, and share their success stories. It also advocates for equality and inclusion in the business world."],
      ["Resource Library", "The Centre maintains a comprehensive library of resources, such as research reports, market studies, and case studies that women entrepreneurs can utilize to gain insights and make informed business decisions."],
    ],
    orgs: [0, 13, 14, 15, 16, 17, 18, 19, 20],
  },
  {
    slug: "black-entrepreneurs",
    heads: ["Black Entrepreneurs Resource Centre"],
    intro: "The Black Entrepreneurs Resource Centre, powered by the CanadianSME Small Business Magazine, is a pivotal platform dedicated to empowering and fostering the growth of Black-owned businesses across Canada. They provide a host of resources and tools designed to address the unique challenges that Black entrepreneurs face, with the goal of promoting economic empowerment within the Black community.",
    img: "2025/02/Black-Entrepreneurs-791x1024.jpg",
    left: [
      ["Comprehensive Education", "The centre offers a plethora of educational materials, training resources, and developmental programs that equip entrepreneurs with the vital skills to effectively manage and grow their enterprises."],
      ["Networking and Collaboration", "By hosting various networking events, the centre enables Black entrepreneurs to form strong connections, share innovative ideas, draw lessons from shared experiences, and uncover potential collaborations."],
      ["Guidance in Securing Funds", "The Resource Centre curates information on various funding opportunities tailored for Black entrepreneurs and offers expert guidance in navigating and applying for these financial resources."],
    ],
    right: [
      ["Mentorship Programs", "The centre connects emerging entrepreneurs with experienced business professionals, fostering mentorship relationships that offer personalised advice, strategic guidance, and moral support."],
      ["Platform for Visibility", "Leveraging its partnership with the CanadianSME Small Business Magazine, the Centre offers Black entrepreneurs the opportunity to gain recognition and visibility, leading to expanded business opportunities."],
      ["Advocacy and Representation", "This should be a foundational element of your webpage design. Ensure that your website’s navigation is simple and intuitive, with clearly labelled sections, a logical structure, and a search function for easy access to specific resources. This can involve using headers, dropdown menus, and a site map if necessary."],
    ],
    orgs: [21, 22, 23, 24, 25, 26, 27],
  },
  {
    slug: "immigrant-entrepreneurs",
    heads: ["Immigrant Entrepreneurs Resource Centre"],
    intro: "The Immigrant Entrepreneur Resource Centre, supported by the CanadianSME Small Business Magazine, is a dedicated platform committed to aiding and enhancing the growth of businesses owned by immigrants in Canada. The Centre recognizes the unique challenges that immigrant entrepreneurs face and offers resources and services to support their entrepreneurial journey, fostering a diverse and vibrant business ecosystem.",
    img: "2025/02/Immigrant-Entrepreneurs-768x994-1.jpg",
    left: [
      ["Tailored Education", "The Centre provides a range of educational materials and training programs specifically designed for immigrant entrepreneurs. These resources encompass various aspects of business, such as entrepreneurship principles, financial management, and marketing strategies, tailored to the context of operating a business in Canada."],
      ["Networking Opportunities:", "The Centre hosts networking events, giving immigrant entrepreneurs opportunities to connect with other business owners, exchange ideas, and form beneficial relationships. These events can be instrumental in navigating the Canadian business environment."],
      ["Funding Guidance", "The Resource Centre offers information on funding opportunities, such as grants and loans, that are available for immigrant entrepreneurs. They provide guidance on the application process, helping entrepreneurs secure necessary capital."],
    ],
    right: [
      ["Mentorship Programs", "The Centre facilitates mentorship programs, connecting less experienced entrepreneurs with established business professionals. This provides an opportunity for individualized advice and guidance."],
      ["Visibility and Promotion", "Leveraging its partnership with the CanadianSME Small Business Magazine, the Centre offers a platform for immigrant entrepreneurs to gain visibility and recognition, leading to expanded business opportunities."],
      ["Language and Cultural Support", "Understanding that language and cultural differences can present challenges, the Centre provides resources and support to help immigrant entrepreneurs navigate these barriers, fostering a smoother integration into the Canadian business landscape."],
    ],
    orgs: [28, 29, 30, 31],
  },
  {
    slug: "business-guide-alberta",
    heads: ["The Alberta Small Business Guide:", "Your Complete Resource for Launching and Growing a Business in Alberta"],
    intro: "Congratulations on taking the first baby step toward building a successful business in Alberta. Welcome to your indispensable guide for founding, managing, and expanding a business in Alberta. The CanadianSME Small Business Hub’s mission is to bring you crucial tools and resources with valuable insights to support each stage of your business’s lifecycle. The Alberta Small Business Guide has been meticulously curated to be adept at offering efficient solutions to all the entrepreneurial challenges your business might face in Alberta.",
    img: "2025/02/Alberta-2-768x994-1.jpg",
    left: [
      ["Alberta: A Prosperous and Encouraging Environment for Entrepreneurs", "Renowned for its prosperous entrepreneurial ecosystem and friendly business environment, Alberta is one of Canada’s most commercially dynamic provinces. The energy-rich province abounds a distinct blend of resources, market penetration & access and government support, making it an ideal locale for setting up startups and small businesses."],
      ["Lucrative Economic Landscape", "Driven by strategic sectors like energy, agriculture, technology, and manufacturing, Alberta’s economy is also a hub of meat & primary goods processing, chemicals and wood items. Hence, the province is capable of providing a wealth of business and employment opportunities. These factors render Alberta one of the primary energy sources for the whole of North America."],
      ["Favourable Market Accessibility", "Alberta enjoys strategic proximity to markets across the continent due to its geographical location in Western Canada and its robust transport infrastructure. This includes major highways, railways, and airports, along with a sophisticated digital network that provides ease of business connectivity."],
    ],
    right: [
      ["Variegated Skilled Workforce", "With its immigration-friendly policies and strong educational underpinning, Alberta is home to some of the most skilled and educated workforce. With a significant percentage of the working population at their prime age and a master’s degree. Alberta also boasts a significant chunk of highly qualified immigrants who are eager to make a living once their education is completed."],
      ["Effective Government Support", "With Alberta leading the economic front of the Canadian economy, its provincial government is committed to abetting an exclusively supportive environment for entrepreneurial activities. The government extends various tax incentives, grants, and funding opportunities to stimulate business growth and innovation that is consistent. Alberta is also a center for tech innovation, offering a dynamic startup ecosystem along with numerous accelerators and incubators."],
      ["Agreeable Quality of Life", "Aside from its business-friendly aspects, Alberta offers a high quality of life, which is also quite affordable. Despite being one of Canada’s strongest economies, Alberta enjoys a fairly affordable lifestyle which is also safe and secure. This translates to lower business running costs and saving thousands of dollars, which may not be plausible in other provinces."],
    ],
    orgs: [0, 1, 32, 33, 34, 35, 36, 37],
  },
  {
    slug: "business-guide-british-columbia",
    heads: ["The British Columbia Small Business Guide:", "A Complete Solution for All Business Challenges in British Columbia"],
    intro: "Welcome to the all-inclusive and detailed reference for starting and managing a startup or thriving business in the region of British Columbia. The CanadianSME Small Business Hub is dedicated to supporting your entrepreneurial venture with the critical tools, resources, and insights for each step of your business journey. From early infancy stages to growth and expansion, our British Columbia Small Business Guide entails all the necessary tool kit and support to help your business thrive in the province.",
    img: "2025/02/British-Columbia-791x1024.jpg",
    left: [
      ["British Columbia: An Ideal and Supportive Environment for Entrepreneurs", "British Columbia is one of Canada’s most vibrant provinces and is well-known for its fostering entrepreneurial ecosystem and an environment that’s conducive to business ventures. This west coast province furnishes a unique mix of resources, access to both local and international markets, and government support, making it an ideal location for startups and small businesses."],
      ["Dynamic Economic Landscape", "British Columbia’s diverse and dynamic economy is driven by sectors like technology, film & TV, manufacturing, tourism, and sustainable energy, providing numerous business opportunities. As Canada’s gateway to the Pacific, it’s an economic hub connecting North American businesses with Asian markets."],
      ["Better Market Accessibility", "As a western coastal province, British Columbia’s location is very strategic in terms of extending access to the markets in the Asia-Pacific region and across North America. Its well-developed infrastructure, which includes ports, railways, and airports, coupled with a sophisticated digital network, provides businesses with the connectivity needed to succeed."],
    ],
    right: [
      ["Highly Skilled Workforce", "And that’s not all; British Columbia also boasts of a highly skilled and well-educated workforce, with over 37% of the working-age population having a bachelor’s degree or higher. This efficient talent pool is a testimony to the province’s high-quality education system and welcoming immigration policies."],
      ["Proactive Government Support", "The government of British Columbia is highly proactive in fostering an environment that not only encourages but also nurtures startups and small business ventures. And they are able to achieve this by extending countless tax incentives, grants, and funding programs to fuel the growth and innovation of businesses. In fact, this is one of the major factors why British Columbia is a thriving tech hub today. With a dynamic startup ecosystem and numerous accelerators, incubators, and coworking spaces, this beautiful coastal province has everything an entrepreneur could ask for."],
      ["Unparalleled Quality of Life", "Besides its business-friendly attributes, British Columbia offers an unparalleled quality of life. With its breathtaking natural beauty, diverse cultural affiliations, and health-conscious living, the province is not only a great place to do business but also a wonderful place to settle down."],
    ],
    orgs: [38, 0, 1, 39],
  },
];
