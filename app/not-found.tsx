"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, LayoutDashboard } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function NotFound() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsLoggedIn(false);
      return;
    }
    supabase.auth
      .getUser()
      .then(({ data }) => setIsLoggedIn(!!data.user))
      .catch(() => setIsLoggedIn(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="max-w-md w-full text-center"
      >
        {/* Large 404 numerals */}
        <p className="font-display text-[8rem] font-bold leading-none tracking-tight text-foreground select-none">
          404
        </p>

        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {isLoggedIn === true ? (
            <Link
              href="/app"
              className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
          ) : isLoggedIn === false ? (
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          ) : (
            /* Loading state — render a neutral placeholder button */
            <span className="inline-flex items-center gap-2 bg-muted text-muted-foreground px-5 py-2.5 text-sm font-medium cursor-wait">
              <span className="h-4 w-4" />
              Loading…
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
