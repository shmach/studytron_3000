// Fails when the translation catalogs do not have exactly the same keys.
// English is the reference catalog; every key must exist in each other locale.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const localesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/app/i18n/locales',
);
const reference = 'en';
const locales = ['en', 'pt-BR'];

function flattenKeys(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null
      ? flattenKeys(value, path)
      : [path];
  });
}

const catalogs = Object.fromEntries(
  locales.map((locale) => [
    locale,
    new Set(
      flattenKeys(
        JSON.parse(readFileSync(join(localesDir, `${locale}.json`), 'utf8')),
      ),
    ),
  ]),
);

let failed = false;
for (const locale of locales) {
  if (locale === reference) continue;
  const missing = [...catalogs[reference]].filter(
    (key) => !catalogs[locale].has(key),
  );
  const extra = [...catalogs[locale]].filter(
    (key) => !catalogs[reference].has(key),
  );
  for (const key of missing) console.error(`[${locale}] missing key: ${key}`);
  for (const key of extra)
    console.error(`[${locale}] key not in ${reference}: ${key}`);
  failed ||= missing.length > 0 || extra.length > 0;
}

if (failed) {
  process.exit(1);
}
console.log(
  `i18n keys in sync (${catalogs[reference].size} keys, ${locales.join(', ')})`,
);
