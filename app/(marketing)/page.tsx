import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { CtaSection } from "@/components/site/cta-section";
import { FaqSection } from "@/components/site/faq-section";
import { HeroSection } from "@/components/site/hero-section";
// Below-the-fold sections: code-split so they don't block initial bundle parse
const FeaturesSection = dynamic(() =>
  import("@/components/site/features-section").then((m) => ({
    default: m.FeaturesSection,
  })),
);
const HowItWorksSection = dynamic(() =>
  import("@/components/site/how-it-works-section").then((m) => ({
    default: m.HowItWorksSection,
  })),
);
const RoleGuidesSection = dynamic(() =>
  import("@/components/site/role-guides-section").then((m) => ({
    default: m.RoleGuidesSection,
  })),
);
const PricingSection = dynamic(() =>
  import("@/components/site/pricing-section").then((m) => ({
    default: m.PricingSection,
  })),
);
const TestimonialsSection = dynamic(() =>
  import("@/components/site/testimonials-section").then((m) => ({
    default: m.TestimonialsSection,
  })),
);
import { absoluteUrl, createMetadata, siteConfig } from "@/lib/seo";
import { faqs } from "@/lib/faq-data";

export const metadata: Metadata = createMetadata({
  title: "AI ATS Resume Checker, Resume Scanner and Resume Optimization Tool",
  description:
    "Use atsprecise to check ATS resume compatibility, find missing keywords, improve resume structure, and tailor your resume to real job descriptions.",
  path: "/",
  keywords: [
    "ATS resume checker online",
    "resume scanner",
    "resume checker for job description",
    "AI resume optimization tool",
    "resume keyword match",
  ],
});

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: absoluteUrl("/"),
  description: siteConfig.description,
  potentialAction: {
    "@type": "SearchAction",
    target: `${absoluteUrl("/")}?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: absoluteUrl("/"),
  description: siteConfig.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function HomePage() {
  return (
    <main className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <RoleGuidesSection
        title="Find an ATS resume checker guide for your target role"
        description="Use role-specific landing pages to understand the exact signals hiring teams expect in software engineering, product, analytics, and customer success resumes."
      />
      <PricingSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}
