"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearEvaluationSessionData } from "@/store/evaluation-store";
import { clearProfileSessionData } from "@/store/profile-store";

type AppSession = {
  user: User | null;
  ready: boolean;
};

const AppSessionContext = createContext<AppSession>({
  user: null,
  ready: false,
});

export function useAppSession() {
  return useContext(AppSessionContext);
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setReady(true);
      return;
    }

    let lastUserId: string | null | undefined;

    const applyUser = (next: User | null) => {
      const nextId = next?.id ?? null;
      if (lastUserId === undefined) {
        lastUserId = nextId;
      } else if (lastUserId !== nextId) {
        clearEvaluationSessionData();
        clearProfileSessionData();
        lastUserId = nextId;
      }
      setUser(next);
    };

    void supabase.auth.getSession().then(
      ({ data }: { data: { session: Session | null } }) => {
        applyUser(data.session?.user ?? null);
        setReady(true);
      },
    );

    void supabase.auth.getUser().then(
      ({ data }: { data: { user: User | null } }) => {
        applyUser(data.user ?? null);
      },
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        applyUser(session?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ user, ready }), [user, ready]);

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}
