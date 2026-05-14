"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/* ─── Context ────────────────────────────────────────────────────────────── */

interface LoadingContextType {
  startLoading: (message?: string) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  startLoading: () => {},
  stopLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

/* ─── Loader Overlay ─────────────────────────────────────────────────────── */

function LoaderOverlay({ message }: { message: string }) {
  return (
    <motion.div
      key="page-loader"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-[#f9f9f9]"
      role="status"
      aria-label="Loading"
      aria-live="polite"
    >
      {/* Subtle grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Centered content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Brand */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="font-display text-xl font-bold tracking-tight text-[#1a1c1c]"
        >
          atsprecise
        </motion.p>

        {/* Scanning progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative h-0.5 w-52 overflow-hidden bg-[#e2e2e2]"
        >
          <motion.span
            className="absolute left-0 top-0 h-full w-14 bg-[#1a1c1c]"
            animate={{ x: ["-56px", "208px"] }}
            transition={{
              duration: 0.95,
              repeat: Infinity,
              ease: [0.4, 0, 0.6, 1],
              repeatType: "loop",
            }}
          />
        </motion.div>

        {/* Status label */}
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] font-medium uppercase tracking-widest text-[#474747]/60"
          >
            {message}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Provider ───────────────────────────────────────────────────────────── */

const DEFAULT_MESSAGE = "INITIALIZING SYSTEM...";
const AUTH_DURATION_MS = 600;

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  // Do NOT start as loading — show content immediately on page load
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startLoading = useCallback(
    (msg?: string) => {
      clearTimer();
      setMessage(msg ?? DEFAULT_MESSAGE);
      setIsLoading(true);
    },
    [clearTimer],
  );

  const stopLoading = useCallback(() => {
    clearTimer();
    setIsLoading(false);
    setMessage(DEFAULT_MESSAGE);
  }, [clearTimer]);

  /* Supabase auth events (login) ───────────────────────────────────────── */
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_IN") {
        clearTimer();
        setMessage("AUTHENTICATING SESSION...");
        setIsLoading(true);
        timerRef.current = setTimeout(() => {
          setIsLoading(false);
          setMessage(DEFAULT_MESSAGE);
        }, AUTH_DURATION_MS);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearTimer]);

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading }}>
      <AnimatePresence>
        {isLoading && <LoaderOverlay message={message} />}
      </AnimatePresence>
      {children}
    </LoadingContext.Provider>
  );
}
