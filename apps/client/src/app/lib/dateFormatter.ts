import i18n from '@app/i18n';

export function dateFormatter(date: string) {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'medium',
  }).format(new Date(`${date}T00:00:00`));
}
