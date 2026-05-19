"use client";

import { useRef } from "react";
import { Brain, FileSearch, Target, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

import { FadeIn } from "@/components/site/fade-in";
import { cardVariants, iconVariants } from "@/lib/animation-variants";

const pillars = [
  {
    title: "Semantic Relevance",
    description:
      "We don't just count keywords. Our LLM-powered engine understands context, mapping your achievements to industry-specific impact.",
    icon: Brain,
  },
  {
    title: "Keyword Match",
    description:
      "Granular analysis of hard and soft skills. We identify the exact gaps between your profile and the high-intent JD requirements.",
    icon: FileSearch,
  },
  {
    title: "Role Alignment",
    description:
      "A structural audit of your career trajectory. We ensure your narrative aligns perfectly with the seniority of the target position.",
    icon: Target,
  },
  {
    title: "Role-Targeted Creation",
    description:
      'Enter a role like "Frontend Developer" and get a fully rewritten resume optimized for that category \u2014 stronger bullets, better framing, zero invented skills.',
    icon: Sparkles,
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Background blob parallax
  const bgY = useTransform(scrollYProgress, [0, 1], [70, -70]);

  // Staggered card parallax \u2014 each card moves at a different speed
  // creating a waterfall / depth illusion as the section scrolls
  const card0Y = useTransform(scrollYProgress, [0, 1], [60, -40]);
  const card1Y = useTransform(scrollYProgress, [0, 1], [30, -20]);
  const card2Y = useTransform(scrollYProgress, [0, 1], [90, -30]);
  const card3Y = useTransform(scrollYProgress, [0, 1], [50, -25]);
  const cardYValues = [card0Y, card1Y, card2Y, card3Y];

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative py-24 lg:py-32"
      style={{ scrollMarginTop: "80px" }}
    >
      {/* Parallax background glow */}
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-x-0 top-20 -z-10 mx-auto h-72 max-w-5xl rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.04),transparent_65%)] blur-3xl"
      />

      <div className="container">
        <FadeIn className="text-center">
          <p className="label-sm text-muted-foreground">PRECISION PILLARS</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-balance font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            The Intelligence Behind The Score
          </h2>
        </FadeIn>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <FadeIn key={pillar.title} delay={index * 0.1}>
                {/* Parallax layer \u2014 moves at different speeds per card */}
                <motion.div
                  style={{ y: cardYValues[index] }}
                  className="will-change-transform h-full"
                >
                  {/* Hover interaction layer \u2014 propagates state to icon child */}
                  <motion.div
                    initial="rest"
                    whileHover="hover"
                    animate="rest"
                    variants={cardVariants}
                    className="group h-full"
                  >
                    <div className="h-full bg-surface-lowest p-8 shadow-ambient transition-shadow duration-500 group-hover:shadow-panel">
                      <motion.div
                        variants={iconVariants}
                        className="flex h-12 w-12 items-center justify-center bg-foreground text-primary-foreground"
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
                      <h3 className="mt-6 font-display text-xl font-semibold text-foreground">
                        {pillar.title}
                      </h3>
                      <p className="mt-3 leading-7 text-muted-foreground">
                        {pillar.description}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
