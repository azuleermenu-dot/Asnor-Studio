import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Asnor Studio — Build websites visually", description: "A friendly visual website builder for everyone. Design, customize, and publish without coding or AI-generated websites." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
