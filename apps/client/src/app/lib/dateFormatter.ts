export function dateFormatter(date: string, locale: string | undefined) {
  const parsed = new Date(`${date}T00:00:00`);
  // Vault front matter is hand-editable, so fall back to the raw value instead
  // of letting Intl throw a RangeError on an invalid date.
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    parsed,
  );
}
