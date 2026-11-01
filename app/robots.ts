const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://asnor-studio-mvp-asnor-ali.vercel.app"
).replace(/\/+$/, "");

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/login", "/signup", "/auth/", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
