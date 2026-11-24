import type { NextConfig } from "next";

// Sent with every page. They stop the hub being framed by other sites, stop browsers guessing
// file types, keep full addresses out of outbound referrers, and switch off device features the hub never uses.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
];

// Addresses these pages had on the old smehub.ca site, so existing links and search results keep working.
const OLD_GUIDES = ["alberta", "british-columbia", "manitoba", "new-brunswick", "newfoundland-and-labrador", "northwest-territories", "nova-scotia", "nunavut", "ontario", "prince-edward-island", "quebec", "saskatchewan", "yukon"];
const OLD_RESOURCES: [string, string][] = [
  ["indigenous-entrepreneurs", "indigenous-entrepreneurs"],
  ["resources-for-lgbtq", "lgbtq"],
  ["women-entrepreneurs", "women-entrepreneurs"],
  ["black-entrepreneurs", "black-entrepreneurs"],
  ["immigrant-entrepreneurs", "immigrant-entrepreneurs"],
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Update 4: the sample course videos, captions and worksheet are served by /api/course-media after an access check
  outputFileTracingIncludes: { "/api/course-media": ["./content/course-media/**"] },
  async redirects() {
    return [
      ...OLD_GUIDES.map((g) => ({ source: `/business-guide-${g}`, destination: `/guides/${g}`, permanent: true })),
      ...OLD_RESOURCES.map(([from, to]) => ({ source: `/${from}`, destination: `/resources/${to}`, permanent: true })),
      // the rest of smehub.ca's menu, so old links and bookmarks keep working
      ...[
        ["/frequently-asked-questions", "/help"],
        ["/general-terms-conditions", "/policies/terms"],
        ["/small-business-hub-community-guidelines", "/policies/community-guidelines"],
        ["/smb-hub-discrimination-policy", "/policies/discrimination-policy"],
        ["/explore-businesses", "/businesses"],
        ["/small-business-podcast", "/podcast"],
        ["/login", "/auth/login"],
        ["/register", "/auth/sign-up"],
      ].map(([source, destination]) => ({ source, destination, permanent: true })),
    ];
  },
  async headers() {
    // The CMS shows each email in a frame on our own site, so the sample emails may be framed by us (and only us).
    const ownFrame = securityHeaders.map((h) =>
      h.key === "X-Frame-Options" ? { ...h, value: "SAMEORIGIN" } : h.key === "Content-Security-Policy" ? { ...h, value: h.value.replace("frame-ancestors 'none'", "frame-ancestors 'self'") } : h,
    );
    return [
      { source: "/email-preview/:path*", headers: ownFrame },
      { source: "/((?!email-preview/).*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
