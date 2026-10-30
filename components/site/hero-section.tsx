"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function HeroSection() {
  const { scrollY } = useScroll();

  const blob1Y = useTransform(scrollY, [0, 800], [0, 220]);
  const blob2Y = useTransform(scrollY, [0, 800], [0, -140]);
  const blob3Y = useTransform(scrollY, [0, 800], [0, 110]);

  const cardY = useTransform(scrollY, [0, 600], [0, -50]);
  const cardScale = useTransform(scrollY, [0, 600], [1.08, 1]);

  return (
    <section
      id="top"
      className="relative overflow-hidden pb-24 pt-20 sm:pb-32 sm:pt-28"
    >
      {/* Parallax background blobs */}
      <motion.div
        style={{ y: blob1Y }}
        className="absolute -left-32 -top-20 -z-10 h-136 w-136 rounded-full bg-[radial-gradient(circle,rgba(21,19,17,0.05),transparent_65%)] blur-3xl"
      />
      <motion.div
        style={{ y: blob2Y }}
        className="absolute -right-24 top-24 -z-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(21,19,17,0.03),transparent_60%)] blur-3xl"
      />
      <motion.div
        style={{ y: blob3Y }}
        className="absolute left-1/2 top-2/3 -z-10 h-80 w-[70%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(21,19,17,0.03),transparent_70%)] blur-3xl"
      />

      <div className="container text-center">
        <span className="label-sm inline-flex items-center gap-2 bg-surface-low px-4 py-2 text-muted-foreground">
          <span className="h-1.5 w-1.5 bg-foreground" />
          NEXT-GEN RESUME ANALYSIS
        </span>

        <h1 className="mx-auto mt-8 max-w-4xl text-balance font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-display-lg">
          Engineered for
          <br />
          <em className="italic text-muted-foreground">Absolute Clarity.</em>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Stop guessing. Our high-precision AI evaluates your resume through
          the lens of modern ATS algorithms with mathematical rigor.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="xl" asChild>
            <Link href="/auth">Check ATS Score</Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/blog/sample-report">View Sample Report</Link>
          </Button>
        </div>

        <motion.div
          style={{ y: cardY, scale: cardScale }}
          className="mx-auto mt-28 max-w-4xl will-change-transform"
        >
          <div className="bg-surface-lowest p-1 shadow-panel">
            <Image
              src="/home_page.png"
              alt="ATS Precise app preview"
              width={1200}
              height={800}
              className="w-full object-cover"
              priority
            />
          </div>
        </motion.div>

        <div className="mt-12 flex flex-col items-center gap-2">
          <motion.div
            className="h-7 w-px bg-muted-foreground/40"
            animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <span className="label-sm text-muted-foreground/60">SCROLL</span>
        </div>
      </div>
    </section>
  );
}
