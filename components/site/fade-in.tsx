"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FadeInProps {
  children?: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
  id?: string;
  direction?: "up" | "down" | "left" | "right";
}

export function FadeIn({
  className,
  delay = 0,
  children,
  id,
  direction = "up",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.visible = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const directionVars: Record<string, string> = {
    up: "0px, 24px",
    down: "0px, -24px",
    left: "24px, 0px",
    right: "-24px, 0px",
  };

  return (
    <div
      ref={ref}
      id={id}
      data-visible="false"
      className={cn("fade-in-item", className)}
      style={
        {
          "--fade-offset": directionVars[direction],
          transitionDelay: delay > 0 ? `${delay * 1000}ms` : undefined,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
