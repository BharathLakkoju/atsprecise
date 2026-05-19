"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ScanSearch,
  Wand2,
  PenLine,
  Sparkles,
  Settings,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import type { Route } from "next";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { clearEvaluationSessionData } from "@/store/evaluation-store";
import { clearProfileSessionData } from "@/store/profile-store";

const navItems: Array<{
  label: string;
  href: Route;
  icon: typeof Home;
}> = [
  { label: "HOME", href: "/app" as Route, icon: Home },
  { label: "ANALYZE", href: "/app/analyze" as Route, icon: ScanSearch },
  { label: "TAILOR", href: "/app/tailor" as Route, icon: Wand2 },
  { label: "BUILD", href: "/app/build" as Route, icon: PenLine },
  { label: "CREATOR", href: "/app/creator" as Route, icon: Sparkles },
  { label: "PROFILE", href: "/app/profile" as Route, icon: UserIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const clearLocalUserData = () => {
    clearEvaluationSessionData();
    clearProfileSessionData();

    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem("ats-precision-settings");
    } catch {
      // Ignore localStorage failures in restricted browser modes.
    }
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: User | null } }) => setUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    clearLocalUserData();

    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push("/");
  };

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "\u2014";

  const isActive = (href: Route) =>
    pathname === href || (href !== "/app" && pathname.startsWith(href));

  return (
    <>
      {/* \u2500\u2500 Desktop sidebar (lg+) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[hsl(var(--border)/0.08)] bg-surface-base lg:flex lg:h-full lg:overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-[hsl(var(--border)/0.08)]">
          <Image
            src="/logo.ico"
            alt="atsprecise"
            width={28}
            height={28}
            className="rounded-sm"
          />
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            atsprecise
          </span>
        </div>

        {/* User Section */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-surface-highest">
              <span className="text-sm font-semibold text-muted-foreground">
                {initials}
              </span>
            </div>
            <div className="min-w-0">
              <p className="label-sm font-semibold text-foreground truncate">
                {user
                  ? user.email?.split("@")[0].toUpperCase()
                  : "PRECISION PORTAL"}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {user ? "SIGNED IN" : "FREE TIER"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 ease-out",
                  active
                    ? "bg-foreground text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-surface-low hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="label-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Items */}
        <div className="space-y-1 border-t border-[hsl(var(--border)/0.08)] p-3">
          <Link
            href={"/app/settings" as Route}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 ease-out",
              isActive("/app/settings" as Route)
                ? "bg-foreground text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-surface-low hover:text-foreground",
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>

          {user && (
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground transition-all duration-200 ease-out hover:bg-surface-low hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* \u2500\u2500 Mobile top bar (< lg) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between px-4 border-b border-[hsl(var(--border)/0.08)] bg-surface-base lg:hidden">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.ico"
            alt="atsprecise"
            width={26}
            height={26}
            className="rounded-sm"
          />
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            atsprecise
          </span>
        </div>
        {user ? (
          <MobileUserMenu initials={initials} onSignOut={handleSignOut} />
        ) : (
          <Button size="sm" asChild>
            <Link href="/auth">Get Started</Link>
          </Button>
        )}
      </div>

      {/* \u2500\u2500 Mobile bottom tab bar (< lg) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-[hsl(var(--border)/0.08)] bg-surface-base px-1 lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors"
            >
              <span
                className={cn(
                  "flex items-center justify-center px-3 py-1.5 transition-all duration-200 ease-out",
                  active ? "bg-foreground" : "",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-widest",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function MobileUserMenu({
  initials,
  onSignOut,
}: {
  initials: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center bg-surface-highest text-sm font-semibold text-muted-foreground transition-all duration-200 ease-out hover:bg-surface-low"
      >
        {initials}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-44 border border-[hsl(var(--border)/0.15)] bg-surface-lowest p-1.5 shadow-ambient">
            <button
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground transition-all duration-200 ease-out hover:bg-surface-low hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
