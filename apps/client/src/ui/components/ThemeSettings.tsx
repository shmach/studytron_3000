import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@app/context/ThemeContext';
import { Button } from '@ui/components/ui/Button';

type ThemeOpts = ReturnType<typeof useTheme>['theme'];

const OPTIONS = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const satisfies readonly { value: ThemeOpts; icon: unknown }[];

/** The three themes side by side; the chosen one is filled in. */
export function ThemeSettings() {
  const { theme, changeTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('theme.label')}
      className="flex flex-wrap gap-2"
    >
      {OPTIONS.map(({ value, icon: Icon }) => {
        const selected = theme === value;
        return (
          <Button
            key={value}
            role="radio"
            aria-checked={selected}
            variant={selected ? 'default' : 'outline'}
            onClick={() => changeTheme(value)}
          >
            <Icon />
            {t(`theme.${value}`)}
          </Button>
        );
      })}
    </div>
  );
}
