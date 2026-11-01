import type { Metadata } from "next";
import "./globals.css";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://asnor-studio-mvp-asnor-ali.vercel.app"
).replace(/\/+$/, "");

const description =
  "Create and customize professional websites visually with drag-and-drop tools. No coding experience or AI-generated websites required.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Asnor Studio — Build websites visually",
    template: "%s | Asnor Studio",
  },
  description,
  applicationName: "Asnor Studio",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Asnor Studio",
    title: "Asnor Studio — Build websites visually",
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Asnor Studio — Build websites visually",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
