export interface MongoDocument {
  _id: string;
  name?: string;
  permalink?: string;
  crunchbase_url?: string;
  homepage_url?: string;
  blog_url?: string;
  blog_feed_url?: string;
  twitter_username?: string;
  category_code?: string;
  number_of_employees?: number;
  founded_year?: number;
  founded_month?: number;
  founded_day?: number;
  deadpooled_year?: number | null;
  tag_list?: string;
  email_address?: string;
  phone_number?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  overview?: string;
  image?: {
    available_sizes?: number[][];
    attribution?: string | null;
  } | null;
  relationships?: Array<{
    is_past: boolean;
    title: string;
    person: {
      first_name: string;
      last_name: string;
      permalink: string;
    };
  }>;
  total_money_raised?: string;
  funding_rounds?: Array<{
    id: number;
    round_code: string;
    raised_amount: number;
    raised_currency_code: string;
    funded_year: number;
  }>;
  offices?: Array<{
    description?: string;
    address1?: string;
    city?: string;
    state_code?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
  }>;
  acquisition?: {
    price_amount?: number;
    price_currency_code?: string;
    acquired_year?: number;
    acquiring_company?: {
      name: string;
      permalink: string;
    };
  } | null;
  [key: string]: any;
}

export const INITIAL_COMPANIES: MongoDocument[] = [
  // 1. Wetpaint (exact match to image 1 & 2)
  {
    _id: "52cdef7c4bab8bd675297d8a",
    name: "Wetpaint",
    permalink: "abc2",
    crunchbase_url: "http://www.crunchbase.com/company/wetpaint",
    homepage_url: "http://wetpaint-inc.com",
    blog_url: "http://digitalquarters.net/",
    blog_feed_url: "http://digitalquarters.net/feed/",
    twitter_username: "BachelrWetpaint",
    category_code: "web",
    number_of_employees: 47,
    founded_year: 2005,
    founded_month: 10,
    founded_day: 17,
    deadpooled_year: 1,
    tag_list: "wiki, seattle, elowitz, media-industry, media-platform, social-distrib",
    email_address: "info@wetpaint.com",
    phone_number: "206.859.6300",
    description: "Technology Platform Company",
    created_at: "2007-05-25T06:51:27.000+00:00",
    updated_at: "Sun Dec 08 07:15:44 UTC 2013",
    overview: "<p>Wetpaint is a technology platform company that uses its proprietary Demand Generation Engine to power consumer media websites.</p>",
    image: {
      available_sizes: [[150, 43], [250, 72]],
      attribution: null
    },
    relationships: [
      { is_past: false, title: "CEO", person: { first_name: "Ben", last_name: "Elowitz", permalink: "ben-elowitz" } },
      { is_past: false, title: "VP Product", person: { first_name: "Rob", last_name: "Fraser", permalink: "rob-fraser" } }
    ],
    total_money_raised: "$39.8M",
    offices: [
      { description: "Seattle HQ", address1: "710 - 2nd Avenue", city: "Seattle", state_code: "WA", country_code: "USA" }
    ],
    funding_rounds: [
      { id: 1, round_code: "a", raised_amount: 5250000, raised_currency_code: "USD", funded_year: 2005 },
      { id: 2, round_code: "b", raised_amount: 9500000, raised_currency_code: "USD", funded_year: 2006 }
    ],
    acquisition: {
      price_amount: 30000000,
      price_currency_code: "USD",
      acquired_year: 2013,
      acquiring_company: { name: "Viggle", permalink: "viggle" }
    }
  },

  // 2. AdventNet
  {
    _id: "52cdef7c4bab8bd675297d8b",
    name: "AdventNet",
    permalink: "adventnet",
    crunchbase_url: "http://www.crunchbase.com/company/adventnet",
    homepage_url: "http://adventnet.com",
    blog_url: "http://blogs.zoho.com/",
    blog_feed_url: "http://blogs.zoho.com/feed",
    twitter_username: "adventnet",
    category_code: "enterprise",
    number_of_employees: 600,
    founded_year: 1996,
    founded_month: 2,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "software, network-management, saas, it-management, cloud",
    email_address: "sales@adventnet.com",
    phone_number: "925-924-9500",
    description: "Server management software provider",
    created_at: "2007-05-25T19:24:22.000+00:00",
    updated_at: "Wed Dec 11 05:48:45 UTC 2013",
    overview: "<p>AdventNet delivers enterprise IT management software and applications for businesses worldwide.</p>",
    total_money_raised: "$0"
  },

  // 3. Digg
  {
    _id: "52cdef7c4bab8bd675297d8c",
    name: "Digg",
    permalink: "digg",
    crunchbase_url: "http://www.crunchbase.com/company/digg",
    homepage_url: "http://digg.com",
    blog_url: "http://blog.digg.com/",
    blog_feed_url: "http://blog.digg.com/?feed=rss2",
    twitter_username: "digg",
    category_code: "news",
    number_of_employees: 60,
    founded_year: 2004,
    founded_month: 11,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "community, social-news, curation, voting, bookmarking",
    email_address: "press@digg.com",
    phone_number: "415-437-3444",
    description: "Social news bookmarking website",
    created_at: "2007-05-26T03:00:36.000+00:00",
    updated_at: "Tue Nov 05 02:00:14 UTC 2013",
    overview: "<p>Digg is a content curation community that votes on social news and internet stories.</p>",
    total_money_raised: "$45M"
  },

  // 4. Facebook
  {
    _id: "52cdef7c4bab8bd675297d8d",
    name: "Facebook",
    permalink: "facebook",
    crunchbase_url: "http://www.crunchbase.com/company/facebook",
    homepage_url: "http://facebook.com",
    blog_url: "http://blog.facebook.com",
    blog_feed_url: "http://blog.facebook.com/atom.php",
    twitter_username: "facebook",
    category_code: "social",
    number_of_employees: 5299,
    founded_year: 2004,
    founded_month: 2,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "social-network, networking, photos, identity, messaging",
    email_address: "press@facebook.com",
    phone_number: "650-543-4800",
    description: "Global social utility network",
    created_at: "2007-05-26T04:22:15.000+00:00",
    updated_at: "Mon Dec 16 17:15:33 UTC 2013",
    overview: "<p>Facebook gives people the power to share and make the world more open and connected.</p>",
    total_money_raised: "$2.43B"
  },

  // 5. Omnidrive
  {
    _id: "52cdef7c4bab8bd675297d8e",
    name: "Omnidrive",
    permalink: "omnidrive",
    crunchbase_url: "http://www.crunchbase.com/company/omnidrive",
    homepage_url: "http://www.omnidrive.com",
    blog_url: "http://blog.omnidrive.com",
    blog_feed_url: "",
    twitter_username: "omnidrive",
    category_code: "network_hosting",
    number_of_employees: 12,
    founded_year: 2005,
    founded_month: 11,
    founded_day: 1,
    deadpooled_year: 2008,
    tag_list: "cloud-storage, synchronization, backup, file-sharing",
    email_address: "support@omnidrive.com",
    phone_number: "",
    description: "Online storage aggregator and file system",
    created_at: "2007-05-27T03:25:32.000+00:00",
    updated_at: "Wed Sep 17 20:45:22 UTC 2008",
    overview: "<p>Omnidrive provided unified internet storage access through mapped file systems.</p>",
    total_money_raised: "$800k"
  },

  // 6. Twitter
  {
    _id: "52cdef7c4bab8bd675297d8f",
    name: "Twitter",
    permalink: "twitter",
    crunchbase_url: "http://www.crunchbase.com/company/twitter",
    homepage_url: "http://twitter.com",
    blog_url: "http://blog.twitter.com",
    blog_feed_url: "http://blog.twitter.com/rss",
    twitter_username: "twitter",
    category_code: "social",
    number_of_employees: 2000,
    founded_year: 2006,
    founded_month: 3,
    founded_day: 21,
    deadpooled_year: null,
    tag_list: "microblogging, real-time, messaging, social-media, sms",
    email_address: "press@twitter.com",
    phone_number: "415-222-9670",
    description: "Real-time information network",
    created_at: "2007-06-01T08:42:10.000+00:00",
    updated_at: "Thu Nov 07 21:40:02 UTC 2013",
    overview: "<p>Twitter is an online social networking service that enables users to send short text updates.</p>",
    total_money_raised: "$1.16B"
  },

  // 7. Stripe
  {
    _id: "52cdef7c4bab8bd675297d90",
    name: "Stripe",
    permalink: "stripe",
    crunchbase_url: "http://www.crunchbase.com/company/stripe",
    homepage_url: "https://stripe.com",
    blog_url: "https://stripe.com/blog",
    blog_feed_url: "https://stripe.com/blog/feed.rss",
    twitter_username: "stripe",
    category_code: "fintech",
    number_of_employees: 7000,
    founded_year: 2010,
    founded_month: 9,
    founded_day: 29,
    deadpooled_year: null,
    tag_list: "payments, billing, banking-as-a-service, developer-tools, api",
    email_address: "info@stripe.com",
    phone_number: "+1 888-926-2289",
    description: "Financial infrastructure platform for the internet",
    created_at: "2011-02-15T12:00:00.000+00:00",
    updated_at: "Fri Mar 01 09:12:00 UTC 2024",
    overview: "<p>Stripe powers online commerce with payment processing APIs and banking infrastructure.</p>",
    total_money_raised: "$8.7B"
  },

  // 8. MongoDB
  {
    _id: "52cdef7c4bab8bd675297d91",
    name: "MongoDB",
    permalink: "mongodb",
    crunchbase_url: "http://www.crunchbase.com/company/mongodb",
    homepage_url: "https://www.mongodb.com",
    blog_url: "https://www.mongodb.com/blog",
    blog_feed_url: "https://www.mongodb.com/blog/rss",
    twitter_username: "MongoDB",
    category_code: "enterprise",
    number_of_employees: 4800,
    founded_year: 2007,
    founded_month: 11,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "nosql, document-database, cloud-database, atlas, developer-data-platform",
    email_address: "info@mongodb.com",
    phone_number: "+1 866-237-8815",
    description: "Developer data platform with document model database",
    created_at: "2007-11-20T10:00:00.000+00:00",
    updated_at: "Wed Jan 10 14:30:00 UTC 2024",
    overview: "<p>MongoDB offers a general purpose document database platform engineered for modern web scale.</p>",
    total_money_raised: "$311M"
  },

  // 9. Scribd (exact match to image 2!)
  {
    _id: "52cdef7c4bab8bd675297d97",
    name: "Scribd",
    permalink: "scribd",
    crunchbase_url: "http://www.crunchbase.com/company/scribd",
    homepage_url: "http://scribd.com",
    blog_url: "http://blog.scribd.com/",
    blog_feed_url: "http://blog.scribd.com/feed/",
    twitter_username: "scribd",
    category_code: "news",
    number_of_employees: 50,
    founded_year: 2007,
    founded_month: 2,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "digital-library, e-books, audiobooks, subscription, reading, documents",
    email_address: "press@scribd.com",
    phone_number: "415-896-5996",
    description: "Subscription reading service and digital library",
    created_at: "2007-06-02T07:38:13.000+00:00",
    updated_at: "Wed Nov 20 18:04:19 UTC 2013",
    overview: "<p>Scribd is a digital reading subscription service offering access to e-books and research documents.</p>",
    total_money_raised: "$48M"
  },

  // 10. Slack
  {
    _id: "52cdef7c4bab8bd675297d98",
    name: "Slack",
    permalink: "slack",
    crunchbase_url: "http://www.crunchbase.com/company/slack",
    homepage_url: "https://slack.com",
    blog_url: "https://slack.com/blog",
    blog_feed_url: "https://slack.com/blog/feed",
    twitter_username: "SlackHQ",
    category_code: "enterprise",
    number_of_employees: 2500,
    founded_year: 2009,
    founded_month: 1,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "messaging, collaboration, team-chat, productivity, channels",
    email_address: "feedback@slack.com",
    phone_number: "415-630-7943",
    description: "Team collaboration and messaging hub",
    created_at: "2013-08-14T15:20:00.000+00:00",
    updated_at: "Thu Feb 02 12:45:00 UTC 2023",
    overview: "<p>Slack is a channel-based messaging platform that connects people to the information they need.</p>",
    total_money_raised: "$1.4B"
  },

  // 11. Airbnb
  {
    _id: "52cdef7c4bab8bd675297d99",
    name: "Airbnb",
    permalink: "airbnb",
    crunchbase_url: "http://www.crunchbase.com/company/airbnb",
    homepage_url: "https://airbnb.com",
    blog_url: "https://news.airbnb.com",
    blog_feed_url: "https://news.airbnb.com/feed",
    twitter_username: "Airbnb",
    category_code: "hospitality",
    number_of_employees: 6800,
    founded_year: 2008,
    founded_month: 8,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "travel, lodging, vacation-rentals, marketplace, hospitality",
    email_address: "press@airbnb.com",
    phone_number: "415-800-5959",
    description: "Global online marketplace for vacation stays and lodging",
    created_at: "2008-08-11T12:00:00.000+00:00",
    updated_at: "Mon Jan 15 11:20:00 UTC 2024",
    overview: "<p>Airbnb operates an online marketplace connecting hosts with guests seeking vacation rentals.</p>",
    total_money_raised: "$6.4B"
  },

  // 12. Dropbox
  {
    _id: "52cdef7c4bab8bd675297d9a",
    name: "Dropbox",
    permalink: "dropbox",
    crunchbase_url: "http://www.crunchbase.com/company/dropbox",
    homepage_url: "https://dropbox.com",
    blog_url: "https://blog.dropbox.com",
    blog_feed_url: "https://blog.dropbox.com/feed",
    twitter_username: "Dropbox",
    category_code: "cloud",
    number_of_employees: 3100,
    founded_year: 2007,
    founded_month: 6,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "cloud-storage, file-sharing, sync, backup, collaboration",
    email_address: "press@dropbox.com",
    phone_number: "415-857-6800",
    description: "Cloud file hosting and workspace collaboration platform",
    created_at: "2007-06-01T09:00:00.000+00:00",
    updated_at: "Thu Feb 15 14:00:00 UTC 2024",
    overview: "<p>Dropbox provides cloud storage, file synchronization, personal cloud, and client software.</p>",
    total_money_raised: "$1.7B"
  },

  // 13. Uber
  {
    _id: "52cdef7c4bab8bd675297d9b",
    name: "Uber",
    permalink: "uber",
    crunchbase_url: "http://www.crunchbase.com/company/uber",
    homepage_url: "https://uber.com",
    blog_url: "https://uber.com/newsroom",
    blog_feed_url: "https://uber.com/newsroom/feed",
    twitter_username: "Uber",
    category_code: "transportation",
    number_of_employees: 32800,
    founded_year: 2009,
    founded_month: 3,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "ridesharing, mobility, food-delivery, logistics, transportation",
    email_address: "press@uber.com",
    phone_number: "415-612-8582",
    description: "Mobility service provider and rideshare platform",
    created_at: "2010-06-01T10:00:00.000+00:00",
    updated_at: "Fri Mar 08 16:30:00 UTC 2024",
    overview: "<p>Uber develops mobility technologies and operates peer-to-peer ridesharing services.</p>",
    total_money_raised: "$25.2B"
  },

  // 14. Pinterest
  {
    _id: "52cdef7c4bab8bd675297d9c",
    name: "Pinterest",
    permalink: "pinterest",
    crunchbase_url: "http://www.crunchbase.com/company/pinterest",
    homepage_url: "https://pinterest.com",
    blog_url: "https://newsroom.pinterest.com",
    blog_feed_url: "https://newsroom.pinterest.com/feed",
    twitter_username: "Pinterest",
    category_code: "social",
    number_of_employees: 4000,
    founded_year: 2009,
    founded_month: 12,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "visual-discovery, bookmarking, curation, inspiration, shopping",
    email_address: "press@pinterest.com",
    phone_number: "415-762-7100",
    description: "Visual discovery engine for finding ideas and inspiration",
    created_at: "2010-03-01T11:00:00.000+00:00",
    updated_at: "Wed Jan 24 10:15:00 UTC 2024",
    overview: "<p>Pinterest is an image sharing and visual social media platform designed to inspire creativity.</p>",
    total_money_raised: "$1.5B"
  },

  // 15. GitHub
  {
    _id: "52cdef7c4bab8bd675297d9d",
    name: "GitHub",
    permalink: "github",
    crunchbase_url: "http://www.crunchbase.com/company/github",
    homepage_url: "https://github.com",
    blog_url: "https://github.blog",
    blog_feed_url: "https://github.blog/feed",
    twitter_username: "github",
    category_code: "developer_tools",
    number_of_employees: 3000,
    founded_year: 2008,
    founded_month: 2,
    founded_day: 8,
    deadpooled_year: null,
    tag_list: "git, code-hosting, open-source, devops, version-control, ci-cd",
    email_address: "support@github.com",
    phone_number: "877-448-4820",
    description: "Global cloud platform for software development and version control",
    created_at: "2008-04-10T12:00:00.000+00:00",
    updated_at: "Tue Dec 05 15:40:00 UTC 2023",
    overview: "<p>GitHub provides hosting for software development and version control using Git.</p>",
    total_money_raised: "$350M"
  },

  // 16. Shopify
  {
    _id: "52cdef7c4bab8bd675297d9e",
    name: "Shopify",
    permalink: "shopify",
    crunchbase_url: "http://www.crunchbase.com/company/shopify",
    homepage_url: "https://shopify.com",
    blog_url: "https://shopify.com/blog",
    blog_feed_url: "https://shopify.com/blog/feed",
    twitter_username: "Shopify",
    category_code: "ecommerce",
    number_of_employees: 11600,
    founded_year: 2006,
    founded_month: 9,
    founded_day: 28,
    deadpooled_year: null,
    tag_list: "e-commerce, retail, storefront, payments, merchant-solutions",
    email_address: "press@shopify.com",
    phone_number: "888-746-7439",
    description: "Global commerce platform providing retail infrastructure",
    created_at: "2006-10-01T08:00:00.000+00:00",
    updated_at: "Mon Feb 12 18:22:00 UTC 2024",
    overview: "<p>Shopify provides an all-in-one commerce platform powering millions of businesses worldwide.</p>",
    total_money_raised: "$122M"
  },

  // 17. Spotify
  {
    _id: "52cdef7c4bab8bd675297d9f",
    name: "Spotify",
    permalink: "spotify",
    crunchbase_url: "http://www.crunchbase.com/company/spotify",
    homepage_url: "https://spotify.com",
    blog_url: "https://newsroom.spotify.com",
    blog_feed_url: "https://newsroom.spotify.com/feed",
    twitter_username: "Spotify",
    category_code: "media",
    number_of_employees: 9200,
    founded_year: 2006,
    founded_month: 4,
    founded_day: 23,
    deadpooled_year: null,
    tag_list: "streaming, audio, music, podcasts, digital-media",
    email_address: "press@spotify.com",
    phone_number: "",
    description: "Audio streaming and media service provider",
    created_at: "2006-05-15T09:30:00.000+00:00",
    updated_at: "Thu Feb 29 11:15:00 UTC 2024",
    overview: "<p>Spotify is a digital music and podcast streaming service giving users access to millions of songs.</p>",
    total_money_raised: "$2.6B"
  },

  // 18. Canva
  {
    _id: "52cdef7c4bab8bd675297da0",
    name: "Canva",
    permalink: "canva",
    crunchbase_url: "http://www.crunchbase.com/company/canva",
    homepage_url: "https://canva.com",
    blog_url: "https://canva.com/blog",
    blog_feed_url: "https://canva.com/blog/feed",
    twitter_username: "canva",
    category_code: "design",
    number_of_employees: 4000,
    founded_year: 2012,
    founded_month: 1,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "graphic-design, visual-content, templates, presentations, publishing",
    email_address: "press@canva.com",
    phone_number: "",
    description: "Online visual communication and graphic design platform",
    created_at: "2012-08-01T14:00:00.000+00:00",
    updated_at: "Wed Mar 06 17:05:00 UTC 2024",
    overview: "<p>Canva empowers everyone to design presentations, social media graphics, and printed products.</p>",
    total_money_raised: "$572M"
  },

  // 19. Figma
  {
    _id: "52cdef7c4bab8bd675297da1",
    name: "Figma",
    permalink: "figma",
    crunchbase_url: "http://www.crunchbase.com/company/figma",
    homepage_url: "https://figma.com",
    blog_url: "https://figma.com/blog",
    blog_feed_url: "https://figma.com/blog/feed",
    twitter_username: "figma",
    category_code: "design",
    number_of_employees: 1300,
    founded_year: 2012,
    founded_month: 8,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "collaborative-design, ui-ux, prototyping, design-systems, vector",
    email_address: "press@figma.com",
    phone_number: "415-890-3446",
    description: "Collaborative browser-based design and prototyping tool",
    created_at: "2013-02-12T10:00:00.000+00:00",
    updated_at: "Fri Dec 22 13:40:00 UTC 2023",
    overview: "<p>Figma connects designers and developers in a unified collaborative design canvas in the browser.</p>",
    total_money_raised: "$333M"
  },

  // 20. Notion
  {
    _id: "52cdef7c4bab8bd675297da2",
    name: "Notion",
    permalink: "notion",
    crunchbase_url: "http://www.crunchbase.com/company/notion",
    homepage_url: "https://notion.so",
    blog_url: "https://notion.so/blog",
    blog_feed_url: "https://notion.so/blog/feed",
    twitter_username: "NotionHQ",
    category_code: "productivity",
    number_of_employees: 600,
    founded_year: 2013,
    founded_month: 3,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "workspace, notes, docs, project-management, wikis, databases",
    email_address: "press@makenotion.com",
    phone_number: "",
    description: "All-in-one connected workspace for notes, docs, and wikis",
    created_at: "2015-05-10T12:00:00.000+00:00",
    updated_at: "Tue Jan 30 19:10:00 UTC 2024",
    overview: "<p>Notion blends everyday work apps into one unified, highly customizable workspace.</p>",
    total_money_raised: "$343M"
  },

  // 21. Zoom
  {
    _id: "52cdef7c4bab8bd675297da3",
    name: "Zoom",
    permalink: "zoom",
    crunchbase_url: "http://www.crunchbase.com/company/zoom",
    homepage_url: "https://zoom.us",
    blog_url: "https://blog.zoom.us",
    blog_feed_url: "https://blog.zoom.us/feed",
    twitter_username: "Zoom",
    category_code: "enterprise",
    number_of_employees: 7400,
    founded_year: 2011,
    founded_month: 4,
    founded_day: 21,
    deadpooled_year: null,
    tag_list: "video-conferencing, web-meetings, webinars, collaboration, voip",
    email_address: "press@zoom.us",
    phone_number: "888-799-9666",
    description: "Cloud video communications and meeting platform",
    created_at: "2011-06-01T11:00:00.000+00:00",
    updated_at: "Thu Feb 29 15:45:00 UTC 2024",
    overview: "<p>Zoom Video Communications provides videotelephony and online chat services through a cloud platform.</p>",
    total_money_raised: "$146M"
  },

  // 22. Twilio
  {
    _id: "52cdef7c4bab8bd675297da4",
    name: "Twilio",
    permalink: "twilio",
    crunchbase_url: "http://www.crunchbase.com/company/twilio",
    homepage_url: "https://twilio.com",
    blog_url: "https://twilio.com/blog",
    blog_feed_url: "https://twilio.com/blog/feed",
    twitter_username: "twilio",
    category_code: "communications",
    number_of_employees: 6000,
    founded_year: 2008,
    founded_month: 3,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "sms, voice, cpaas, communications-api, messaging, authentication",
    email_address: "press@twilio.com",
    phone_number: "844-814-4627",
    description: "Customer engagement platform and programmable communications APIs",
    created_at: "2008-08-01T10:00:00.000+00:00",
    updated_at: "Mon Feb 19 14:10:00 UTC 2024",
    overview: "<p>Twilio provides programmable communication tools for making phone calls, sending text messages, and web chat.</p>",
    total_money_raised: "$261M"
  },

  // 23. Datadog
  {
    _id: "52cdef7c4bab8bd675297da5",
    name: "Datadog",
    permalink: "datadog",
    crunchbase_url: "http://www.crunchbase.com/company/datadog",
    homepage_url: "https://datadoghq.com",
    blog_url: "https://datadoghq.com/blog",
    blog_feed_url: "https://datadoghq.com/blog/feed",
    twitter_username: "datadoghq",
    category_code: "enterprise",
    number_of_employees: 5200,
    founded_year: 2010,
    founded_month: 1,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "monitoring, observability, devops, cloud-metrics, apm, log-management",
    email_address: "press@datadoghq.com",
    phone_number: "866-328-2364",
    description: "Cloud observability and security monitoring platform",
    created_at: "2010-09-01T12:00:00.000+00:00",
    updated_at: "Wed Feb 14 11:20:00 UTC 2024",
    overview: "<p>Datadog provides full-stack monitoring for cloud-scale applications, servers, databases, and logs.</p>",
    total_money_raised: "$147M"
  },

  // 24. GitLab
  {
    _id: "52cdef7c4bab8bd675297da6",
    name: "GitLab",
    permalink: "gitlab",
    crunchbase_url: "http://www.crunchbase.com/company/gitlab",
    homepage_url: "https://gitlab.com",
    blog_url: "https://about.gitlab.com/blog",
    blog_feed_url: "https://about.gitlab.com/atom.xml",
    twitter_username: "gitlab",
    category_code: "developer_tools",
    number_of_employees: 2100,
    founded_year: 2011,
    founded_month: 9,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "devsecops, git, ci-cd, code-review, issue-tracking, all-remote",
    email_address: "press@gitlab.com",
    phone_number: "415-761-4432",
    description: "The complete DevSecOps platform delivered as a single application",
    created_at: "2011-10-01T15:00:00.000+00:00",
    updated_at: "Tue Mar 05 16:00:00 UTC 2024",
    overview: "<p>GitLab delivers an open source DevSecOps platform covering every stage of the software lifecycle.</p>",
    total_money_raised: "$413M"
  },

  // 25. Asana
  {
    _id: "52cdef7c4bab8bd675297da7",
    name: "Asana",
    permalink: "asana",
    crunchbase_url: "http://www.crunchbase.com/company/asana",
    homepage_url: "https://asana.com",
    blog_url: "https://asana.com/resources/blog",
    blog_feed_url: "https://asana.com/resources/blog/feed",
    twitter_username: "asana",
    category_code: "productivity",
    number_of_employees: 1800,
    founded_year: 2008,
    founded_month: 12,
    founded_day: 1,
    deadpooled_year: null,
    tag_list: "work-management, project-tracking, task-management, enterprise, collaboration",
    email_address: "press@asana.com",
    phone_number: "415-525-3000",
    description: "Work management platform that helps teams orchestrate their work",
    created_at: "2009-02-01T10:00:00.000+00:00",
    updated_at: "Thu Mar 07 13:10:00 UTC 2024",
    overview: "<p>Asana is a software-as-a-service platform designed to improve team collaboration and work management.</p>",
    total_money_raised: "$453M"
  }
];

export interface CollectionMeta {
  name: string;
  count: number;
  sizeBytes: number;
  avgObjSize: number;
  indexes: number;
}

export interface DatabaseMeta {
  name: string;
  collections: CollectionMeta[];
}

export const DATABASES: DatabaseMeta[] = [
  {
    name: "sample_training",
    collections: [
      { name: "companies", count: 9500, sizeBytes: 15482000, avgObjSize: 1629, indexes: 1 },
      { name: "grades", count: 100000, sizeBytes: 8430000, avgObjSize: 84, indexes: 2 },
      { name: "inspections", count: 80047, sizeBytes: 12400000, avgObjSize: 154, indexes: 1 },
      { name: "trips", count: 27212, sizeBytes: 5890000, avgObjSize: 216, indexes: 3 }
    ]
  },
  {
    name: "sample_mflix",
    collections: [
      { name: "movies", count: 23530, sizeBytes: 18200000, avgObjSize: 773, indexes: 2 },
      { name: "comments", count: 41079, sizeBytes: 4200000, avgObjSize: 102, indexes: 1 },
      { name: "theaters", count: 1619, sizeBytes: 620000, avgObjSize: 382, indexes: 1 }
    ]
  },
  {
    name: "sample_analytics",
    collections: [
      { name: "customers", count: 1746, sizeBytes: 940000, avgObjSize: 538, indexes: 2 },
      { name: "accounts", count: 3200, sizeBytes: 1100000, avgObjSize: 343, indexes: 1 },
      { name: "transactions", count: 42000, sizeBytes: 8900000, avgObjSize: 211, indexes: 2 }
    ]
  }
];

export function getFieldType(val: any): string {
  if (val === null || val === undefined) return "Null";
  if (typeof val === "boolean") return "Boolean";
  if (typeof val === "number") {
    return Number.isInteger(val) ? "Int32" : "Double";
  }
  if (typeof val === "string") {
    if (val.length === 24 && /^[0-9a-fA-F]{24}$/.test(val)) return "ObjectId";
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return "Date";
    return "String";
  }
  if (Array.isArray(val)) return "Array";
  if (typeof val === "object") return "Object";
  return "Unknown";
}
