import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

import { useTheme } from '@app/context/ThemeContext';

/**
 * The shadcn toaster, tied to the project's theme (light, dark or system) instead of
 * `next-themes`, which the project does not use.
 */
function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
