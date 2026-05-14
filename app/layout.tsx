import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";

import "./globals.css";
import { LoadingProvider } from "@/components/providers/loading-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { getSiteUrl, siteConfig } from "@/lib/seo";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: siteConfig.name,
  title: {
    default:
      "atsprecise | AI ATS Resume Checker and Resume Optimization Platform",
    template: "%s | atsprecise",
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  alternates: {
    canonical: "/",
  },
  category: "career",
  classification: "Resume optimization and ATS analysis software",
  referrer: "origin-when-cross-origin",
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title:
      "atsprecise | AI ATS Resume Checker and Resume Optimization Platform",
    description: siteConfig.description,
    url: "/",
    siteName: siteConfig.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "atsprecise | AI ATS Resume Checker and Resume Optimization Platform",
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} relative`}
      data-scroll-behavior="smooth"
    >
      <body>
        <MotionProvider>
          <LoadingProvider>{children}</LoadingProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
