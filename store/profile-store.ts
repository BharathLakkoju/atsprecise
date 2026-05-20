"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const PROFILE_DRAFT_STORAGE_KEY = "ats-precision-profile-draft";

/**
 * Mirrors the profile form's internal state shape (strings, not arrays).
 * IDs are stripped — restored entries get fresh UIDs on hydration.
 */
export interface ProfileFormDraft {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  experiences: Array<{
    company: string;
    title: string;
    dates: string;
    location: string;
    bullets: string; // newline-joined
  }>;
  skills: Array<{
    category: string;
    items: string; // comma-joined
  }>;
  projects: Array<{
    name: string;
    tech: string;
    link: string;
    website: string;
    bullets: string; // newline-joined
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
    gpa: string;
  }>;
  certifications: string; // newline-joined
  awards: string; // newline-joined
}

interface ProfileStore {
  draft: ProfileFormDraft | null;
  setDraft: (draft: ProfileFormDraft) => void;
  clearDraft: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),
    }),
    {
      name: PROFILE_DRAFT_STORAGE_KEY,
      // sessionStorage so the draft lives for the current browser session
      // (cleared automatically when the tab/window is closed or the user logs out).
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

export function clearProfileSessionData() {
  useProfileStore.getState().clearDraft();

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(PROFILE_DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage failures in restricted browser environments.
  }
}
