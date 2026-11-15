import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES } from '@app/i18n';
import { Button } from '@ui/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ui/components/ui/DropdownMenu';

/** Same choice as the header menu, but showing which language is in use. */
export function LanguageSettings() {
  const { t, i18n } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find(
    (language) => language.code === i18n.resolvedLanguage,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={t('language.label')}>
          {current?.nativeName}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={i18n.resolvedLanguage}
          onValueChange={(code) => void i18n.changeLanguage(code)}
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <DropdownMenuRadioItem key={language.code} value={language.code}>
              {language.nativeName}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
