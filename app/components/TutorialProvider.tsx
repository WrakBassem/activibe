"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ─── Tour Step Definitions ────────────────────────────────────────────────────
// Each step targets a DOM element via data-tutorial-id="..." attribute.
// placement: where the tooltip bubble appears relative to the target element.
export type TutorialStep = {
  id: string;            // matches data-tutorial-id on the target element
  title: string;
  description: string;
  icon: string;
  placement: "top" | "bottom" | "left" | "right";
};

// Dashboard tour — 8 steps covering every major section
export const DASHBOARD_STEPS: TutorialStep[] = [
  {
    id: "xp-bar",
    title: "Your Level & XP",
    description:
      "Every habit you log earns XP! Fill this bar to level up, unlock new titles, and grow your character. The 💀 skull means Hardcore Mode is active — double XP, double penalties.",
    icon: "⚡",
    placement: "bottom",
  },
  {
    id: "quest-board",
    title: "Active Quests",
    description:
      "AI-generated short-term challenges targeting your weak habits. You can hold up to 3 at once. Complete them before the timer runs out for bonus XP rewards!",
    icon: "📜",
    placement: "bottom",
  },
  {
    id: "coach-insight",
    title: "AI Coach Insight",
    description:
      "Your personal AI coach watches your patterns daily and sends nudges. Green = you're on track. Orange = warning. Red = take action today.",
    icon: "🧠",
    placement: "bottom",
  },
  {
    id: "action-bar",
    title: "Your Daily Mission",
    description:
      "Log Today is your most important daily action. After logging, visit Reports for analytics or the AI Coach for deeper insights and goal management.",
    icon: "📝",
    placement: "top",
  },
  {
    id: "kpi-grid",
    title: "Your Key Stats",
    description:
      "Global Streak tracks consecutive active days — don't break the chain! Today's Score is your performance today, colour-coded from red (poor) to green (excellent).",
    icon: "📊",
    placement: "top",
  },
  {
    id: "heatmap",
    title: "Activity Heatmap",
    description:
      "Your year-at-a-glance contribution graph. Darker squares = higher scores. Use this to spot patterns: weekly rhythms, slumps, and personal records.",
    icon: "🗓️",
    placement: "top",
  },
  {
    id: "charts-grid",
    title: "Progress Charts",
    description:
      "Weekly Progress shows your 7-day score trend. The Axis Radar reveals balance across your life dimensions (Health, Mind, Work, etc.). Aim for a round shape!",
    icon: "📈",
    placement: "top",
  },
  {
    id: "header-icons",
    title: "Quick Navigation",
    description:
      "From here: 💰 Black Market shop, 🎒 Inventory & buffs, ⏳ Deep Focus Forge (Pomodoro), 🏆 Achievements Hall, 📜 Weekly Oracle Magazine, ⚔️ Mastery Trees. Explore them all!",
    icon: "🗺️",
    placement: "bottom",
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

type TutorialContextType = {
  /** Is the spotlight step-by-step tour currently active? */
  isTourActive: boolean;
  /** Has the user already seen the welcome dialog? */
  hasSeenWelcome: boolean;
  /** Current step index within DASHBOARD_STEPS */
  currentStep: number;
  /** All tour steps for the active tour */
  steps: TutorialStep[];
  /** Launch the dashboard tour from step 0 */
  startTour: () => void;
  /** Advance to next step (or end tour if last step) */
  nextStep: () => void;
  /** Jump to a specific step index */
  goToStep: (index: number) => void;
  /** End the tour immediately */
  endTour: () => void;
  /** Mark the welcome dialog as seen and optionally start tour */
  markWelcomeSeen: (startTourAfter?: boolean) => void;
};

const TutorialContext = createContext<TutorialContextType | null>(null);

// ─── LocalStorage key ─────────────────────────────────────────────────────────
const STORAGE_KEY = "activibe_tour_seen";

// ─── Provider Component ───────────────────────────────────────────────────────

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true); // default true to avoid flash
  const [currentStep, setCurrentStep] = useState(0);
  const steps = DASHBOARD_STEPS;

  // On mount, read localStorage to decide if we need to show welcome dialog
  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setHasSeenWelcome(false);
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsTourActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= steps.length - 1) {
        // Last step — end tour
        setIsTourActive(false);
        return 0;
      }
      return prev + 1;
    });
  }, [steps.length]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStep(index);
    }
  }, [steps.length]);

  const endTour = useCallback(() => {
    setIsTourActive(false);
    setCurrentStep(0);
  }, []);

  const markWelcomeSeen = useCallback((startTourAfter = false) => {
    localStorage.setItem(STORAGE_KEY, "true");
    setHasSeenWelcome(true);
    if (startTourAfter) {
      // Small delay so dialog exit animation plays first
      setTimeout(() => {
        setCurrentStep(0);
        setIsTourActive(true);
      }, 300);
    }
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        isTourActive,
        hasSeenWelcome,
        currentStep,
        steps,
        startTour,
        nextStep,
        goToStep,
        endTour,
        markWelcomeSeen,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside <TutorialProvider>");
  return ctx;
}
