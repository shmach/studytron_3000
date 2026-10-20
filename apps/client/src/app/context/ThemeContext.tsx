import { createContext, use, useEffect, useState } from 'react';

type ThemeOpts = 'light' | 'dark' | 'system';

interface ThemeProviderContext {
  theme: ThemeOpts;
  changeTheme: (theme: ThemeOpts) => void;
}

interface ThemeProviderContextProps {
  children: React.ReactNode;
  storageKey?: string;
}

export const ThemeProviderContext = createContext({
  theme: 'system',
} as ThemeProviderContext);

export const ThemeProvider = ({
  children,
  storageKey = 'studytron:theme',
}: ThemeProviderContextProps) => {
  const [theme, setTheme] = useState<ThemeOpts>(
    () => (localStorage.getItem(storageKey) as ThemeOpts) || 'system',
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  function changeTheme(theme: ThemeOpts) {
    localStorage.setItem(storageKey, theme);
    setTheme(theme);
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
};

export const useTheme = () => {
  const context = use(ThemeProviderContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
