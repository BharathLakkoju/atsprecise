"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAppSession } from "@/components/app/app-session-provider";

function isAnonymousTrialPath(pathname: string) {
  return (
    pathname === "/app/upload" ||
    pathname.startsWith("/app/upload/") ||
    pathname === "/app/analyze" ||
    pathname.startsWith("/app/analyze/") ||
    pathname === "/app/tailor" ||
    pathname.startsWith("/app/tailor/")
  );
}

export function AppAuthGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useAppSession();

  useEffect(() => {
    if (!ready || !pathname.startsWith("/app") || isAnonymousTrialPath(pathname)) {
      return;
    }

    if (!user) {
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !user) {
        router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [pathname, ready, router, user]);

  return null;
}
