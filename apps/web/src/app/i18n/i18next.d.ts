import 'i18next';

import type en from './locales/en.json';

// Types t() keys from the English catalog: an unknown key fails `tsc`.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
