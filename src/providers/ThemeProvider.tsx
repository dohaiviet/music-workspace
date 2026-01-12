'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'normal' | 'tet' | 'valentine' | 'children';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('normal');

  const refreshTheme = async () => {
    try {
      const res = await fetch('/api/settings/theme');
      if (res.ok) {
        const data = await res.json();
        setTheme(data.theme);
      }
    } catch (error) {
      console.error('Failed to fetch theme', error);
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    refreshTheme();
    
    // Optional: Poll for theme changes (so all users see it update live-ish)
    const interval = setInterval(refreshTheme, 10000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
