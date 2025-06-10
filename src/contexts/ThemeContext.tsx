
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void; // Changed to accept Theme directly
  effectiveTheme: "light" | "dark"; // The actual theme being applied (light or dark)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem("socialCompassTheme") as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    }
    // No else needed, default is "system"
  }, []);

  useEffect(() => {
    let systemTheme: "light" | "dark" = "light";
    if (typeof window !== "undefined") {
        systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      setEffectiveTheme("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
      setEffectiveTheme("light");
    } else { // system
      if (systemTheme === "dark") {
        document.documentElement.classList.add("dark");
        setEffectiveTheme("dark");
      } else {
        document.documentElement.classList.remove("dark");
        setEffectiveTheme("light");
      }
    }
    localStorage.setItem("socialCompassTheme", theme);
  }, [theme]);

  // Listener for system theme changes if "system" is selected
  useEffect(() => {
    if (typeof window === "undefined" || theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      if (theme === "system") { // re-check to ensure "system" is still active
        const newSystemTheme = mediaQuery.matches ? "dark" : "light";
        setEffectiveTheme(newSystemTheme);
        if (newSystemTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);


  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
